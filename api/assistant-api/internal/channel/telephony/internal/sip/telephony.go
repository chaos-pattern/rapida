// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package internal_sip_telephony

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rapidaai/api/assistant-api/config"
	internal_telephony_base "github.com/rapidaai/api/assistant-api/internal/channel/telephony/internal/base"
	internal_sip "github.com/rapidaai/api/assistant-api/internal/channel/telephony/internal/sip/internal"
	internal_assistant_entity "github.com/rapidaai/api/assistant-api/internal/entity/assistants"
	"github.com/rapidaai/api/assistant-api/internal/observability"
	internal_type "github.com/rapidaai/api/assistant-api/internal/type"
	sip_infra "github.com/rapidaai/api/assistant-api/sip/infra"
	"github.com/rapidaai/pkg/commons"
	"github.com/rapidaai/pkg/types"
	"github.com/rapidaai/pkg/utils"
	"github.com/rapidaai/protos"
)

type sipTelephony struct {
	appCfg       *config.AssistantConfig
	logger       commons.Logger
	sharedServer *sip_infra.Server
}

func NewSIPTelephony(cfg *config.AssistantConfig, logger commons.Logger, sipServer *sip_infra.Server) (internal_type.Telephony, error) {
	return &sipTelephony{
		appCfg:       cfg,
		logger:       logger,
		sharedServer: sipServer,
	}, nil
}

func (t *sipTelephony) parseConfig(vaultCredential *protos.VaultCredential) (*sip_infra.Config, error) {
	cfg, err := sip_infra.ParseConfigFromVault(vaultCredential)
	if err != nil {
		return nil, err
	}
	if cfg.Port <= 0 {
		cfg.Port = internal_sip.DefaultOutboundSIPPort
	}
	if t.appCfg.SIPConfig != nil {
		cfg.ApplyOperationalDefaults(
			t.appCfg.SIPConfig.Port,
			sip_infra.Transport(t.appCfg.SIPConfig.Transport),
			t.appCfg.SIPConfig.RTPPortRangeStart,
			t.appCfg.SIPConfig.RTPPortRangeEnd,
		)
		cfg.ApplyTimeoutDefaults(
			t.appCfg.SIPConfig.RegisterTimeout,
			t.appCfg.SIPConfig.InviteTimeout,
			t.appCfg.SIPConfig.SessionTimeout,
		)
		cfg.ApplyMediaTimeoutDefaults(
			t.appCfg.SIPConfig.MediaTimeoutInitial,
			t.appCfg.SIPConfig.MediaTimeout,
		)
		cfg.ApplyInboundAnswerDefaults(
			sip_infra.InboundAnswerMode(t.appCfg.SIPConfig.Inbound.AnswerMode),
			t.appCfg.SIPConfig.Inbound.MinRingDuration,
			t.appCfg.SIPConfig.Inbound.MaxRingDuration,
			t.appCfg.SIPConfig.Inbound.ACKTimeout,
		)
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (t *sipTelephony) StatusCallback(
	c *gin.Context,
	auth types.SimplePrinciple,
	assistantId uint64,
	assistantConversationId uint64,
) (*internal_type.StatusInfo, error) {
	payload := make(map[string]interface{})
	rawPayload := ""
	if body, err := c.GetRawData(); err == nil && len(body) > 0 {
		rawPayload = string(body)
		if json.Unmarshal(body, &payload) != nil {
			if formValues, formErr := url.ParseQuery(rawPayload); formErr == nil {
				for k, v := range formValues {
					if len(v) == 0 {
						continue
					}
					payload[k] = v[0]
				}
			}
		}
	}
	if len(payload) == 0 {
		rawPayload = c.Request.URL.RawQuery
		for k, v := range c.Request.URL.Query() {
			if len(v) == 0 {
				continue
			}
			payload[k] = v[0]
		}
	}

	eventType, _ := payload["event"].(string)
	if eventType == "" {
		eventType, _ = payload["status"].(string)
	}
	if eventType == "" {
		eventType, _ = payload["state"].(string)
	}
	callID, _ := payload["call_id"].(string)
	if callID == "" {
		callID, _ = payload["callId"].(string)
	}
	if callID == "" {
		callID, _ = payload["call-id"].(string)
	}
	if callID == "" {
		callID, _ = payload["Call-ID"].(string)
	}
	if callID == "" {
		callID, _ = payload["channel_uuid"].(string)
	}

	var durationPtr *time.Duration
	duration, err := utils.Option(payload).GetDuration("duration")
	if err != nil {
		duration, err = utils.Option(payload).GetDuration("call_duration")
	}
	if err != nil {
		duration, err = utils.Option(payload).GetDuration("CallDuration")
	}
	if err == nil {
		durationPtr = utils.Ptr(duration)
	}
	if durationPtr == nil {
		switch v := payload["duration_ms"].(type) {
		case string:
			if ms, parseErr := strconv.ParseFloat(strings.TrimSpace(v), 64); parseErr == nil {
				duration := time.Duration(ms * float64(time.Millisecond))
				durationPtr = utils.Ptr(duration)
			}
		case float64:
			duration := time.Duration(v * float64(time.Millisecond))
			durationPtr = utils.Ptr(duration)
		case int:
			duration := time.Duration(v) * time.Millisecond
			durationPtr = utils.Ptr(duration)
		case int64:
			duration := time.Duration(v) * time.Millisecond
			durationPtr = utils.Ptr(duration)
		}
	}

	price, _ := payload["price"].(string)
	if price == "" {
		price, _ = payload["cost"].(string)
	}
	reason, _ := payload["reason"].(string)
	if reason == "" {
		reason, _ = payload["disconnect_reason"].(string)
	}
	if reason == "" {
		reason, _ = payload["failure_reason"].(string)
	}
	if reason == "" {
		reason, _ = payload["error_message"].(string)
	}
	if reason == "" {
		reason, _ = payload["error"].(string)
	}
	if reason == "" {
		reason, _ = payload["sip_code"].(string)
	}

	t.logger.Debug("SIP status callback received",
		"event", eventType,
		"call_id", callID,
		"assistant_id", assistantId,
		"conversation_id", assistantConversationId)

	statusInfo := &internal_type.StatusInfo{
		Event:       eventType,
		ChannelUUID: callID,
		Duration:    durationPtr,
		Price:       price,
		RawPayload:  rawPayload,
		Payload:     payload,
	}
	switch strings.ToLower(eventType) {
	case "completed", "complete", "ended", "end", "hangup", "bye", "terminated":
		statusInfo.Completed = true
	case "failed", "failure", "busy", "no-answer", "no_answer", "unanswered", "rejected", "timeout", "error":
		if reason == "" {
			reason = eventType
		}
		statusInfo.Error = &internal_type.StatusError{Error: "failed", Reason: reason}
	}
	if statusInfo.Error == nil && reason != "" {
		errorCode, _ := payload["error_code"].(string)
		if errorCode != "" {
			statusInfo.Error = &internal_type.StatusError{Error: "failed", Reason: reason}
		}
	}
	return statusInfo, nil
}

func (t *sipTelephony) CatchAllStatusCallback(ctx *gin.Context) (*internal_type.StatusInfo, error) {
	return nil, nil
}

func (t *sipTelephony) OutboundCall(
	ctx context.Context,
	auth types.SimplePrinciple,
	toPhone string,
	fromPhone string,
	assistant *internal_assistant_entity.Assistant,
	assistantConversationId uint64,
	vaultCredential *protos.VaultCredential,
	statusReporter internal_type.ProviderCallStatusReporter,
	opts utils.Option,
) (*internal_type.CallInfo, error) {
	info := &internal_type.CallInfo{Provider: internal_sip.Provider}
	cfg, err := t.parseConfig(vaultCredential)
	if err != nil {
		info.Status = "FAILED"
		info.ErrorMessage = fmt.Sprintf("config error: %s", err.Error())
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassConfiguration,
			"invalid SIP outbound configuration",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}

	contextID, _ := opts.GetString("rapida.context_id")
	fromUser := strings.TrimSpace(fromPhone)
	if t.sharedServer == nil {
		err := fmt.Errorf("shared SIP server not available")
		info.Status = "FAILED"
		info.ErrorMessage = "SIP server not initialized"
		t.logger.Warnw("SIP outbound call blocked before setup",
			"context_id", contextID,
			"assistant_id", assistant.Id,
			"conversation_id", assistantConversationId,
			"to_user", strings.TrimSpace(toPhone),
			"from_user", fromUser,
			"trunk_address", cfg.Server,
			"reason", "server_not_initialized")
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassHealthGate,
			"sip server not initialized",
			internal_telephony_base.OutboundDisconnectReasonHealthGate,
			err,
			0,
		)
		return info, err
	}
	if !t.sharedServer.IsRunning() {
		err := fmt.Errorf("shared SIP server is not running")
		info.Status = "FAILED"
		info.ErrorMessage = "SIP server not running"
		t.logger.Warnw("SIP outbound call blocked before setup",
			"context_id", contextID,
			"assistant_id", assistant.Id,
			"conversation_id", assistantConversationId,
			"to_user", strings.TrimSpace(toPhone),
			"from_user", fromUser,
			"trunk_address", cfg.Server,
			"reason", "server_not_running")
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassHealthGate,
			"sip server not running",
			internal_telephony_base.OutboundDisconnectReasonHealthGate,
			err,
			0,
		)
		return info, err
	}

	t.logger.Infow("SIP outbound call setup requested",
		"context_id", contextID,
		"assistant_id", assistant.Id,
		"conversation_id", assistantConversationId,
		"to_user", strings.TrimSpace(toPhone),
		"from_user", fromUser,
		"trunk_address", cfg.Server,
		"trunk_port", cfg.Port,
		"transport", cfg.GetTransport(),
		"ringing_timeout_ms", cfg.InviteTimeout.Milliseconds(),
		"max_call_duration_ms", cfg.SessionTimeout.Milliseconds(),
		"outbound_health_gate", t.outboundHealthGateEnabled(t.appCfg))

	if t.outboundHealthGateEnabled(t.appCfg) {
		healthSnapshot := t.sharedServer.HealthSnapshot()
		if !healthSnapshot.Ready {
			err := fmt.Errorf("SIP outbound health gate failed: %s", healthSnapshot.Reason)
			info.Status = "FAILED"
			info.ErrorMessage = err.Error()
			t.logger.Warnw("SIP outbound call blocked by health gate",
				"context_id", contextID,
				"assistant_id", assistant.Id,
				"conversation_id", assistantConversationId,
				"to_user", strings.TrimSpace(toPhone),
				"from_user", fromUser,
				"trunk_address", cfg.Server,
				"health_reason", healthSnapshot.Reason,
				"active_calls", healthSnapshot.ActiveCalls,
				"rtp_ports_in_use", healthSnapshot.RTPPortsInUse)
			internal_telephony_base.ReportOutboundFailure(
				statusReporter,
				internal_telephony_base.OutboundFailureClassHealthGate,
				healthSnapshot.Reason,
				internal_telephony_base.OutboundDisconnectReasonHealthGate,
				err,
				0,
			)
			return info, err
		}
	}

	session, err := t.sharedServer.MakeCall(ctx, cfg, toPhone, fromUser, sip_infra.MakeCallOptions{
		Auth:               auth,
		Assistant:          assistant,
		ConversationID:     assistantConversationId,
		ContextID:          contextID,
		VaultCredential:    vaultCredential,
		CallStatusObserver: statusReporter,
	})
	if err != nil {
		info.Status = "FAILED"
		info.ErrorMessage = fmt.Sprintf("call error: %s", err.Error())
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassSetup,
			"sip outbound setup failed",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}
	t.logger.Infow("SIP outbound call initiated",
		"context_id", contextID,
		"to_user", strings.TrimSpace(toPhone),
		"from_user", fromUser,
		"trunk_address", cfg.Server,
		"trunk_port", cfg.Port,
		"transport", cfg.GetTransport(),
		"call_id", session.GetCallID(),
		"assistant_id", assistant.Id,
		"conversation_id", assistantConversationId)

	return &internal_type.CallInfo{
		Provider:    internal_sip.Provider,
		ChannelUUID: session.GetCallID(),
		Status:      string(sip_infra.OutboundCallStatusInitiated),
		StatusInfo: internal_type.StatusInfo{
			Event: string(sip_infra.OutboundCallStatusInitiated),
			Payload: map[string]interface{}{
				"to":              toPhone,
				"from":            fromUser,
				"call_id":         session.GetCallID(),
				"assistant_id":    assistant.Id,
				"conversation_id": assistantConversationId,
			},
		},
		Extra: map[string]string{
			observability.MetricCallStatus: string(sip_infra.OutboundCallStatusInitiated),
		},
	}, nil
}

func (t *sipTelephony) outboundHealthGateEnabled(appCfg *config.AssistantConfig) bool {
	if appCfg.SIPConfig.OutboundHealthGate == nil {
		return true
	}
	return *appCfg.SIPConfig.OutboundHealthGate
}

func (t *sipTelephony) InboundCall(
	c *gin.Context,
	auth types.SimplePrinciple,
	assistantId uint64,
	clientNumber string,
	assistantConversationId uint64,
) error {
	c.JSON(http.StatusOK, gin.H{
		"status":          "ready",
		"assistant_id":    assistantId,
		"conversation_id": assistantConversationId,
		"client_number":   clientNumber,
		"message":         "SIP inbound call ready - connect via SIP signaling",
	})
	return nil
}

func (t *sipTelephony) ReceiveCall(c *gin.Context) (*internal_type.CallInfo, error) {
	clientNumber := c.Query("from")
	if clientNumber == "" {
		clientNumber = c.Query("caller")
	}
	if clientNumber == "" {
		return nil, fmt.Errorf("missing caller information")
	}

	dialedNumber := c.Query("to")
	if dialedNumber == "" {
		dialedNumber = c.Query("called")
	}
	if dialedNumber == "" {
		dialedNumber = c.Query("destination")
	}

	queryParams := make(map[string]string, len(c.Request.URL.Query()))
	for key, values := range c.Request.URL.Query() {
		queryParams[key] = values[0]
	}

	info := &internal_type.CallInfo{
		CallerNumber: clientNumber,
		FromNumber:   dialedNumber,
		Provider:     internal_sip.Provider,
		Status:       "SUCCESS",
		StatusInfo:   internal_type.StatusInfo{Event: "webhook", Payload: queryParams},
	}
	if callID := c.Query("call_id"); callID != "" {
		info.ChannelUUID = callID
	}
	return info, nil
}
