// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package internal_transformer_smallest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rapidaai/api/assistant-api/internal/observability"
	smallest_internal "github.com/rapidaai/api/assistant-api/internal/transformer/smallest/internal"
	internal_type "github.com/rapidaai/api/assistant-api/internal/type"
	"github.com/rapidaai/pkg/commons"
	"github.com/rapidaai/pkg/utils"
	protos "github.com/rapidaai/protos"
)

type smallestSpeechToText struct {
	*smallestOption
	mu      sync.Mutex
	writeMu sync.Mutex
	logger  commons.Logger

	ctx       context.Context
	ctxCancel context.CancelFunc

	connection     *websocket.Conn
	contextId      string
	sttConnectedAt time.Time
	onPacket       func(pkt ...internal_type.Packet) error

	startedAt time.Time
}

func (*smallestSpeechToText) Name() string {
	return "smallest-stt"
}

func NewSmallestSpeechToText(ctx context.Context, logger commons.Logger, credential *protos.VaultCredential,
	onPacket func(pkt ...internal_type.Packet) error,
	opts utils.Option) (internal_type.SpeechToTextTransformer, error) {
	smallestOpts, err := NewSmallestOption(logger, credential, opts)
	if err != nil {
		logger.Errorf("smallest-stt: intializing smallest failed %+v", err)
		return nil, err
	}
	ct, ctxCancel := context.WithCancel(ctx)
	return &smallestSpeechToText{
		ctx:            ct,
		ctxCancel:      ctxCancel,
		logger:         logger,
		smallestOption: smallestOpts,
		onPacket:       onPacket,
	}, nil
}

func (cst *smallestSpeechToText) Initialize() error {
	start := time.Now()
	connectionString := cst.GetSpeechToTextConnectionString()
	header := http.Header{}
	header.Set("Authorization", "Bearer "+cst.GetKey())
	setSourceHeaders(header)

	conn, _, err := websocket.DefaultDialer.Dial(connectionString, header)
	if err != nil {
		cst.logger.Errorf("smallest-stt: failed to connect to Smallest WebSocket: %v", err)
		cst.onPacket(internal_type.ObservabilityLogRecordPacket{
			Scope: internal_type.ObservabilityRecordScopeConversation,
			Record: observability.RecordLog{
				Level:   observability.LevelError,
				Message: "smallest-stt: error while performing connect",
				Attributes: observability.Attributes{
					"component": observability.ComponentSTT.String(),
					"provider":  cst.Name(),
					"path":      observability.AttributeValue(connectionString),
					"error":     observability.AttributeValue(err.Error()),
				},
				OccurredAt: time.Now(),
			},
		})
		return err
	}

	cst.mu.Lock()
	cst.connection = conn
	cst.sttConnectedAt = time.Now()
	cst.mu.Unlock()

	go cst.readLoop(conn)
	cst.logger.Debugf("smallest-stt: connection established")

	cst.onPacket(
		internal_type.ObservabilityMetricRecordPacket{
			Scope:  internal_type.ObservabilityRecordScopeConversation,
			Record: observability.NewMetricSTTInitLatencyMs(time.Since(start), observability.Attributes{"provider": cst.Name()}),
		},
		internal_type.ObservabilityLogRecordPacket{
			Scope: internal_type.ObservabilityRecordScopeConversation,
			Record: observability.RecordLog{
				Level:   observability.LevelInfo,
				Message: "smallest-stt: initialization completed",
				Attributes: observability.Attributes{
					"component": observability.ComponentSTT.String(),
					"provider":  cst.Name(),
					"path":      observability.AttributeValue(connectionString),
				},
				OccurredAt: time.Now(),
			},
		},
	)
	return nil
}

// readLoop owns the WebSocket connection for the lifetime of the STT session.
// It exits when the connection closes — intentionally (Close) or unexpectedly (drop).
func (cst *smallestSpeechToText) readLoop(conn *websocket.Conn) {
	for {
		select {
		case <-cst.ctx.Done():
			return
		default:
		}

		_, msg, err := conn.ReadMessage()
		if err != nil {
			cst.mu.Lock()
			if cst.connection != conn {
				cst.mu.Unlock()
				return
			}
			cst.connection = nil
			contextID := cst.contextId
			cst.mu.Unlock()

			cst.logger.Errorf("smallest-stt: connection lost: %v", err)
			cst.onPacket(
				internal_type.SpeechToTextErrorPacket{
					ContextID: contextID,
					Error:     fmt.Errorf("smallest-stt: connection lost: %w", err),
					Type:      internal_type.STTNetworkTimeout,
				},
				internal_type.ObservabilityLogRecordPacket{
					ContextID: contextID,
					Scope:     internal_type.ObservabilityRecordScopeUserMessage,
					Record: observability.RecordLog{
						Level:   observability.LevelError,
						Message: "smallest-stt: connection lost",
						Attributes: observability.Attributes{
							"component": observability.ComponentSTT.String(),
							"provider":  cst.Name(),
							"error":     observability.AttributeValue(err.Error()),
						},
						OccurredAt: time.Now(),
					},
				},
			)
			return
		}

		var resp smallest_internal.SpeechToTextOutput
		if err := json.Unmarshal(msg, &resp); err != nil {
			continue
		}

		// speech_started / speech_ended are VAD-style onset/offset markers —
		// Rapida's own VAD/EOS stages own that responsibility, so we only log them.
		if resp.Type == "speech_started" || resp.Type == "speech_ended" {
			cst.logger.Debugf("smallest-stt: %s at %.3fs", resp.Type, resp.Timestamp)
			continue
		}

		if resp.Transcript == "" {
			continue
		}

		cst.mu.Lock()
		ctxID := cst.contextId
		cst.mu.Unlock()

		if !resp.IsFinal {
			cst.onPacket(
				internal_type.InterruptionDetectedPacket{ContextID: ctxID, Source: internal_type.InterruptionSourceWord},
				internal_type.SpeechToTextPacket{
					ContextID: ctxID,
					Script:    resp.Transcript,
					Language:  resp.Language,
					Interim:   true,
				},
				internal_type.ObservabilityEventRecordPacket{
					ContextID: ctxID,
					Scope:     internal_type.ObservabilityRecordScopeUserMessage,
					Record: observability.RecordEvent{
						Component: observability.ComponentSTT,
						Event:     observability.STTInterim,
						Attributes: observability.Attributes{
							"type":       "interim",
							"script":     resp.Transcript,
							"confidence": "0.9000",
						},
						OccurredAt: time.Now(),
					},
				},
			)
			continue
		}

		now := time.Now()
		cst.mu.Lock()
		startedAt := cst.startedAt
		if !cst.startedAt.IsZero() {
			cst.startedAt = time.Time{}
		}
		cst.mu.Unlock()

		packets := []internal_type.Packet{
			internal_type.InterruptionDetectedPacket{ContextID: ctxID, Source: internal_type.InterruptionSourceWord},
			internal_type.SpeechToTextPacket{
				ContextID: ctxID,
				Script:    resp.Transcript,
				Language:  resp.Language,
				Interim:   false,
			},
			internal_type.ObservabilityEventRecordPacket{
				ContextID: ctxID,
				Scope:     internal_type.ObservabilityRecordScopeUserMessage,
				Record: observability.RecordEvent{
					Component: observability.ComponentSTT,
					Event:     observability.STTCompleted,
					Attributes: observability.Attributes{
						"type":       "completed",
						"script":     resp.Transcript,
						"confidence": "0.9000",
						"language":   resp.Language,
						"word_count": fmt.Sprintf("%d", len(strings.Fields(resp.Transcript))),
						"char_count": fmt.Sprintf("%d", len(resp.Transcript)),
					},
					OccurredAt: now,
				},
			},
		}
		if !startedAt.IsZero() {
			packets = append(packets, internal_type.ObservabilityMetricRecordPacket{
				ContextID: ctxID,
				Scope:     internal_type.ObservabilityRecordScopeUserMessage,
				Record:    observability.NewMetricSTTLatencyMs(now.Sub(startedAt), observability.Attributes{"provider": cst.Name()}),
			})
		}
		cst.onPacket(packets...)
	}
}

func (cst *smallestSpeechToText) Transform(ctx context.Context, in internal_type.Packet) error {
	switch pkt := in.(type) {
	case internal_type.TurnChangePacket:
		cst.mu.Lock()
		cst.contextId = pkt.ContextID
		cst.mu.Unlock()
		return nil
	case internal_type.SpeechToTextStartPacket:
		cst.mu.Lock()
		if cst.startedAt.IsZero() {
			cst.startedAt = time.Now()
		}
		cst.mu.Unlock()
		return nil
	case internal_type.SpeechToTextAudioPacket:
		cst.mu.Lock()
		if cst.startedAt.IsZero() {
			cst.startedAt = time.Now()
		}
		conn := cst.connection
		contextID := cst.contextId
		cst.mu.Unlock()

		if conn == nil {
			return nil
		}

		cst.writeMu.Lock()
		err := conn.WriteMessage(websocket.BinaryMessage, pkt.Audio)
		cst.writeMu.Unlock()
		if err != nil {
			cst.logger.Errorf("smallest-stt: error sending audio: %v", err)
			cst.onPacket(
				internal_type.SpeechToTextErrorPacket{
					ContextID: contextID,
					Error:     fmt.Errorf("smallest-stt: send failed: %w", err),
					Type:      internal_type.STTNetworkTimeout,
				},
				internal_type.ObservabilityLogRecordPacket{
					ContextID: contextID,
					Scope:     internal_type.ObservabilityRecordScopeUserMessage,
					Record: observability.RecordLog{
						Level:   observability.LevelError,
						Message: "smallest-stt: send failed",
						Attributes: observability.Attributes{
							"component": observability.ComponentSTT.String(),
							"provider":  cst.Name(),
							"error":     observability.AttributeValue(err.Error()),
						},
						OccurredAt: time.Now(),
					},
				},
			)
			return nil
		}
		return nil
	default:
		return nil
	}
}

func (cst *smallestSpeechToText) Close(ctx context.Context) error {
	cst.ctxCancel()
	cst.mu.Lock()
	ctxID := cst.contextId
	connectedAt := cst.sttConnectedAt
	cst.sttConnectedAt = time.Time{}

	if cst.connection != nil {
		conn := cst.connection
		cst.connection = nil // mark before Close so readLoop sees intentional
		// Best-effort graceful session end; ignore errors — conn.Close() below
		// tears down the socket regardless.
		_ = conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"close_stream"}`))
		conn.Close()
	}
	cst.mu.Unlock()

	if !connectedAt.IsZero() {
		duration := time.Since(connectedAt)
		cst.onPacket(
			internal_type.ObservabilityMetricRecordPacket{
				ContextID: ctxID,
				Scope:     internal_type.ObservabilityRecordScopeConversation,
				Record:    observability.NewMetricSTTDuration(duration, observability.Attributes{"provider": cst.Name()}),
			},
			internal_type.ObservabilityUsageRecordPacket{
				ContextID: ctxID,
				Scope:     internal_type.ObservabilityRecordScopeConversation,
				Record:    observability.NewSTTDurationUsageRecord(cst.Name(), duration, observability.Attributes{}),
			},
		)
	}
	cst.onPacket(
		internal_type.ObservabilityEventRecordPacket{
			ContextID: ctxID,
			Scope:     internal_type.ObservabilityRecordScopeConversation,
			Record: observability.RecordEvent{
				Component: observability.ComponentSTT,
				Event:     observability.STTClosed,
				Attributes: observability.Attributes{
					"type":     "closed",
					"provider": cst.Name(),
				},
				OccurredAt: time.Now(),
			},
		})
	return nil
}
