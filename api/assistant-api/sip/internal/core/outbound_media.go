// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package core

import (
	"context"
	"errors"
	"fmt"
)

var (
	ErrOutboundMediaNotPrepared = errors.New("outbound media is not prepared")
	ErrOutboundMediaNoSession   = errors.New("outbound media requires a session")
)

// outboundMedia owns RTP allocation and handler lifecycle for an outbound call.
// The call sends its SDP offer from prepared media, then starts RTP only after the answer is accepted.
type outboundMedia struct {
	server  *Server
	session *Session
	request OutboundInviteRequest

	rtpHandler       *RTPHandler
	allocatedRTPPort int
	localRTPPort     int
	externalIP       string
	started          bool
}

// OutboundMediaAnswer is the validated remote SDP answer from outbound 200 OK.
// It is parsed before ACK so the call can fail cleanly if media is unusable.
type OutboundMediaAnswer struct {
	negotiatedCodec *Codec
	remoteIP        string
	remotePort      int
}

// NewOutboundMedia creates the RTP lifecycle owner for an outbound call.
func NewOutboundMedia(server *Server, session *Session, request OutboundInviteRequest) *outboundMedia {
	return &outboundMedia{
		server:  server,
		session: session,
		request: request,
	}
}

func (media *outboundMedia) Prepare() error {
	if media.session == nil {
		return ErrOutboundMediaNoSession
	}
	if err := media.request.Validate(); err != nil {
		return err
	}

	var err error
	media.allocatedRTPPort, err = media.server.rtpAllocator.Allocate()
	if err != nil {
		return fmt.Errorf("no RTP ports available: %w", err)
	}

	rtpHandler, err := NewRTPHandler(context.Background(), &RTPConfig{
		LocalIP:             media.server.listenConfig.GetBindAddress(),
		LocalPort:           media.allocatedRTPPort,
		PayloadType:         CodecPCMU.PayloadType,
		ClockRate:           CodecPCMU.ClockRate,
		Logger:              media.server.logger,
		MediaTimeoutInitial: media.request.Config.MediaTimeoutInitial,
		MediaTimeout:        media.request.Config.MediaTimeout,
	})
	if err != nil {
		media.server.rtpAllocator.Release(media.allocatedRTPPort)
		media.allocatedRTPPort = 0
		return fmt.Errorf("failed to create RTP handler: %w", err)
	}

	_, media.localRTPPort = rtpHandler.LocalAddr()
	if media.localRTPPort != media.allocatedRTPPort {
		_ = rtpHandler.Stop()
		media.server.rtpAllocator.Release(media.allocatedRTPPort)
		allocatedPort := media.allocatedRTPPort
		media.allocatedRTPPort = 0
		return fmt.Errorf("RTP handler bound unexpected port %d, allocated %d", media.localRTPPort, allocatedPort)
	}
	media.rtpHandler = rtpHandler
	media.externalIP = media.server.listenConfig.GetExternalIP()
	media.session.SetLocalRTP(media.externalIP, media.localRTPPort)
	media.session.SetRTPHandler(rtpHandler)
	return nil
}

func (media *outboundMedia) SDPOffer() (string, error) {
	if media.rtpHandler == nil {
		return "", ErrOutboundMediaNotPrepared
	}
	return media.server.GenerateSDP(DefaultSDPConfig(media.externalIP, media.localRTPPort)), nil
}

func NewOutboundMediaAnswer(server *Server, dialog *outboundDialog) (OutboundMediaAnswer, error) {
	if dialog == nil || dialog.InviteResponse() == nil {
		return OutboundMediaAnswer{}, fmt.Errorf("%w: outbound 200 OK response is missing", ErrSDPParseFailed)
	}

	body := dialog.InviteResponse().Body()
	if len(body) == 0 {
		return OutboundMediaAnswer{}, fmt.Errorf("%w: outbound 200 OK SDP body is missing", ErrSDPParseFailed)
	}

	if server.logger != nil {
		server.logger.Debugw("Outbound call 200 OK SDP answer",
			"call_id", dialog.session.GetCallID(),
			"sdp_body", string(body))
	}

	sdpInfo, err := server.ParseSDP(body)
	if err != nil {
		return OutboundMediaAnswer{}, fmt.Errorf("%w: %v", ErrSDPParseFailed, err)
	}
	if sdpInfo.ConnectionIP == "" || sdpInfo.AudioPort <= 0 {
		return OutboundMediaAnswer{}, fmt.Errorf("%w: outbound answer missing RTP address", ErrSDPParseFailed)
	}
	if sdpInfo.PreferredCodec == nil {
		return OutboundMediaAnswer{}, fmt.Errorf("%w: outbound answer payload types %v", ErrCodecNotSupported, sdpInfo.PayloadTypes)
	}

	return OutboundMediaAnswer{
		negotiatedCodec: sdpInfo.PreferredCodec,
		remoteIP:        sdpInfo.ConnectionIP,
		remotePort:      sdpInfo.AudioPort,
	}, nil
}

func (media *outboundMedia) ApplyAnswer(answer OutboundMediaAnswer) error {
	if media.rtpHandler == nil {
		return ErrOutboundMediaNotPrepared
	}
	media.rtpHandler.SetRemoteAddr(answer.remoteIP, answer.remotePort)
	media.rtpHandler.SetCodec(answer.negotiatedCodec)
	media.session.SetRemoteRTP(answer.remoteIP, answer.remotePort)
	if answer.negotiatedCodec != nil {
		media.session.SetNegotiatedCodec(answer.negotiatedCodec.Name, int(answer.negotiatedCodec.ClockRate))
	}
	return nil
}

func (media *outboundMedia) Start(onMediaTimeout func()) error {
	if media.rtpHandler == nil {
		return ErrOutboundMediaNotPrepared
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

func (media *outboundMedia) Stop() {
	if media == nil || media.rtpHandler == nil {
		return
	}
	rtpHandler := media.rtpHandler
	media.rtpHandler = nil
	media.started = false
	_ = rtpHandler.Stop()
}

func (media *outboundMedia) LocalAddr() (string, int) {
	if media == nil || media.rtpHandler == nil {
		return "", 0
	}
	return media.rtpHandler.LocalAddr()
}

func (media *outboundMedia) RemoteAddrConfigured() bool {
	if media == nil || media.rtpHandler == nil {
		return false
	}
	return media.rtpHandler.GetRemoteAddr() != nil
}
