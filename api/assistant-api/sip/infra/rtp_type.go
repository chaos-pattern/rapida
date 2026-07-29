// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package sip_infra

import (
	"context"
	"time"

	internal_core "github.com/rapidaai/api/assistant-api/sip/internal/core"
	"github.com/rapidaai/pkg/commons"
)

type RTPPacket struct {
	Version        uint8
	Padding        bool
	Extension      bool
	CC             uint8
	Marker         bool
	PayloadType    uint8
	SequenceNumber uint16
	Timestamp      uint32
	SSRC           uint32
	Payload        []byte
}

type RTPFallbackAudioSource func(frameSize int) []byte

type RTPHandler struct {
	inner *internal_core.RTPHandler

	codec          *Codec
	audioInChan    chan []byte
	audioOutChan   chan []byte
	flushAudioCh   chan struct{}
	fallbackSource RTPFallbackAudioSource
}

type RTPConfig struct {
	LocalIP     string
	LocalPort   int
	PayloadType uint8
	ClockRate   uint32
	Logger      commons.Logger

	MediaTimeoutInitial time.Duration
	MediaTimeout        time.Duration
}

func (c *RTPConfig) Validate() error {
	return c.toCore().Validate()
}

func (c *RTPConfig) toCore() *internal_core.RTPConfig {
	if c == nil {
		return nil
	}
	return &internal_core.RTPConfig{
		LocalIP:             c.LocalIP,
		LocalPort:           c.LocalPort,
		PayloadType:         c.PayloadType,
		ClockRate:           c.ClockRate,
		Logger:              c.Logger,
		MediaTimeoutInitial: c.MediaTimeoutInitial,
		MediaTimeout:        c.MediaTimeout,
	}
}

type RTPAllocator interface {
	Allocate() (int, error)
	Release(port int)
	InUse() (int, error)
	ReleaseAll(ctx context.Context)
}

type RTPPortAllocator struct {
	inner *internal_core.RTPPortAllocator
}
