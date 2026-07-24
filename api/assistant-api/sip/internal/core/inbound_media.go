// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package core

import (
	"errors"
	"fmt"
)

var (
	ErrInboundMediaNotPrepared = errors.New("inbound media is not prepared")
	ErrInboundMediaNoSession   = errors.New("inbound media requires a session")
)

// inboundMedia owns RTP allocation and handler lifecycle for an inbound call.
// The INVITE flow prepares media before 200 OK, then starts RTP only after ACK.
type inboundMedia struct {
	server     *Server
	session    *Session
	mediaOffer inboundMediaOffer

	rtpHandler       *RTPHandler
	allocatedRTPPort int
	localRTPPort     int
	externalIP       string
	started          bool
}

// NewInboundMedia creates the inbound media lifecycle owner for a SIP INVITE.
func NewInboundMedia(server *Server, session *Session, mediaOffer inboundMediaOffer) *inboundMedia {
	return &inboundMedia{
		server:     server,
		session:    session,
		mediaOffer: mediaOffer,
	}
}

func (media *inboundMedia) Prepare() error {
	if media.session == nil {
		return ErrInboundMediaNoSession
	}

	var err error
	media.allocatedRTPPort, err = media.server.rtpAllocator.Allocate()
	if err != nil {
		return fmt.Errorf("no RTP ports available: %w", err)
	}

	rtpHandlerFactory := media.server.newRTPHandler
	if rtpHandlerFactory == nil {
		rtpHandlerFactory = NewRTPHandler
	}

	// The port remains owned by inboundMedia until the session adopts it.
	// Session teardown releases the port after it is stored on the session.
	rtpHandler, err := rtpHandlerFactory(media.server.ctx, &RTPConfig{
		LocalIP:             media.server.listenConfig.GetBindAddress(),
		LocalPort:           media.allocatedRTPPort,
		PayloadType:         media.mediaOffer.negotiatedCodec.PayloadType,
		ClockRate:           media.mediaOffer.negotiatedCodec.ClockRate,
		MediaTimeoutInitial: media.session.config.MediaTimeoutInitial,
		MediaTimeout:        media.session.config.MediaTimeout,
	})
	if err != nil {
		media.server.rtpAllocator.Release(media.allocatedRTPPort)
		media.allocatedRTPPort = 0
		return fmt.Errorf("failed to create RTP handler: %w", err)
	}

	rtpHandler.SetRemoteAddr(media.mediaOffer.sdpInfo.ConnectionIP, media.mediaOffer.sdpInfo.AudioPort)
	rtpHandler.SetCodec(media.mediaOffer.negotiatedCodec)
	rtpHandler.SetOnFirstPacket(func() {
		if media.session != nil {
			media.session.MarkInboundFirstRTPReceived()
		}
	})

	_, media.localRTPPort = rtpHandler.LocalAddr()
	media.rtpHandler = rtpHandler
	media.externalIP = media.server.listenConfig.GetExternalIP()

	media.session.SetRemoteRTP(media.mediaOffer.sdpInfo.ConnectionIP, media.mediaOffer.sdpInfo.AudioPort)
	media.session.SetLocalRTP(media.externalIP, media.localRTPPort)
	media.session.SetNegotiatedCodec(media.mediaOffer.negotiatedCodec.Name, int(media.mediaOffer.negotiatedCodec.ClockRate))
	media.session.SetRTPHandler(rtpHandler)
	return nil
}

func (media *inboundMedia) Start(onMediaTimeout func()) error {
	if media.rtpHandler == nil {
		return ErrInboundMediaNotPrepared
	}
	if media.started {
		return nil
	}
	media.rtpHandler.Start()
	media.rtpHandler.EnableMediaTimeout(true)

	mediaTimeout := media.rtpHandler.MediaTimeout()
	if media.session != nil && mediaTimeout != nil && onMediaTimeout != nil {
		sessionContext := media.session.Context()
		go func() {
			select {
			case <-sessionContext.Done():
				return
			case <-mediaTimeout:
			}
			onMediaTimeout()
		}()
	}

	media.started = true
	return nil
}

func (media *inboundMedia) ReleasePortIfSessionDoesNotOwnIt() {
	if media == nil || media.allocatedRTPPort <= 0 {
		return
	}
	if media.session != nil {
		_, sessionLocalRTPPort := media.session.GetLocalRTP()
		if sessionLocalRTPPort == media.allocatedRTPPort {
			media.allocatedRTPPort = 0
			return
		}
	}
	media.server.rtpAllocator.Release(media.allocatedRTPPort)
	media.allocatedRTPPort = 0
}

func (media *inboundMedia) SDPConfig() *SDPConfig {
	return media.server.NegotiatedSDPConfig(
		media.externalIP,
		media.localRTPPort,
		media.mediaOffer.negotiatedCodec,
	)
}
