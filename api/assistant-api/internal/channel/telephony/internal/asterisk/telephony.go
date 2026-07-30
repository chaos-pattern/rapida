// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package internal_asterisk_telephony

import (
	"bytes"
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
	internal_assistant_entity "github.com/rapidaai/api/assistant-api/internal/entity/assistants"
	internal_type "github.com/rapidaai/api/assistant-api/internal/type"
	"github.com/rapidaai/pkg/commons"
	"github.com/rapidaai/pkg/types"
	"github.com/rapidaai/pkg/utils"
	"github.com/rapidaai/protos"
)

const asteriskProvider = "asterisk"

type asteriskTelephony struct {
	appCfg *config.AssistantConfig
	logger commons.Logger
}

func NewAsteriskTelephony(config *config.AssistantConfig, logger commons.Logger) (internal_type.Telephony, error) {
	return &asteriskTelephony{
		appCfg: config,
		logger: logger,
	}, nil
}

func (apt *asteriskTelephony) StatusCallback(
	c *gin.Context,
	auth types.SimplePrinciple,
	assistantId uint64,
	assistantConversationId uint64,
) (*internal_type.StatusInfo, error) {
	var eventDetails map[string]interface{}
	rawPayloadBytes, err := c.GetRawData()
	if err != nil {
		apt.logger.Errorf("failed to read ARI event body: %+v", err)
		return nil, fmt.Errorf("failed to read ARI event body: %w", err)
	}
	rawPayload := string(rawPayloadBytes)
	if err := json.Unmarshal(rawPayloadBytes, &eventDetails); err != nil {
		apt.logger.Errorf("failed to parse ARI event body: %+v", err)
		return nil, fmt.Errorf("failed to parse ARI event body: %w", err)
	}

	eventType := "unknown"
	if v, ok := eventDetails["type"]; ok {
		eventType = fmt.Sprintf("%v", v)
	}
	if eventType == "unknown" {
		if v, ok := eventDetails["event"]; ok {
			eventType = fmt.Sprintf("%v", v)
		}
	}

	channelUUID := ""
	if channel, ok := eventDetails["channel"].(map[string]interface{}); ok {
		if v, ok := channel["id"]; ok {
			channelUUID = fmt.Sprintf("%v", v)
		}
		if channelUUID == "" {
			if v, ok := channel["name"]; ok {
				channelUUID = fmt.Sprintf("%v", v)
			}
		}
	}
	if channelUUID == "" {
		if v, ok := eventDetails["channel_id"]; ok {
			channelUUID = fmt.Sprintf("%v", v)
		}
	}
	if channelUUID == "" {
		if v, ok := eventDetails["uniqueid"]; ok {
			channelUUID = fmt.Sprintf("%v", v)
		}
	}
	if channelUUID == "" {
		if v, ok := eventDetails["id"]; ok {
			channelUUID = fmt.Sprintf("%v", v)
		}
	}

	var durationPtr *time.Duration
	duration, durationErr := utils.Option(eventDetails).GetDuration("duration")
	if durationErr != nil {
		duration, durationErr = utils.Option(eventDetails).GetDuration("billsec")
	}
	if durationErr == nil {
		durationPtr = utils.Ptr(duration)
	}
	if durationPtr == nil {
		switch v := eventDetails["duration_ms"].(type) {
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

	price, _ := eventDetails["price"].(string)
	if price == "" {
		price, _ = eventDetails["cost"].(string)
	}
	reason := ""
	if v, ok := eventDetails["cause_txt"]; ok {
		reason = fmt.Sprintf("%v", v)
	}
	if reason == "" {
		if v, ok := eventDetails["cause"]; ok {
			reason = fmt.Sprintf("%v", v)
		}
	}
	if reason == "" {
		if v, ok := eventDetails["dialstatus"]; ok {
			reason = fmt.Sprintf("%v", v)
		}
	}
	if reason == "" {
		if v, ok := eventDetails["reason"]; ok {
			reason = fmt.Sprintf("%v", v)
		}
	}

	statusInfo := &internal_type.StatusInfo{
		Event:       eventType,
		ChannelUUID: channelUUID,
		Duration:    durationPtr,
		Price:       price,
		RawPayload:  rawPayload,
		Payload:     eventDetails,
	}

	if strings.EqualFold(eventType, "ChannelStateChange") {
		if channel, ok := eventDetails["channel"].(map[string]interface{}); ok {
			if state, ok := channel["state"]; ok {
				switch strings.ToUpper(fmt.Sprintf("%v", state)) {
				case "RING", "RINGING":
					statusInfo.Event = "ringing"
				case "UP":
					statusInfo.Event = "answered"
				}
			}
		}
	}

	if strings.EqualFold(eventType, "Dial") {
		if dialStatus, ok := eventDetails["dialstatus"]; ok {
			switch strings.ToUpper(fmt.Sprintf("%v", dialStatus)) {
			case "ANSWER", "ANSWERED":
				statusInfo.Event = "answered"
			case "RING", "RINGING", "PROGRESS":
				statusInfo.Event = "ringing"
			case "CANCEL", "CANCELED", "CANCELLED":
				statusInfo.Event = "cancelled"
			case "BUSY", "NOANSWER", "NO_ANSWER", "CHANUNAVAIL", "CONGESTION", "FAILED", "FAILURE", "REJECTED", "TIMEOUT":
				statusInfo.Error = &internal_type.StatusError{Error: "failed", Reason: fmt.Sprintf("%v", dialStatus)}
			}
		}
	}

	if strings.EqualFold(eventType, "ChannelDestroyed") || strings.EqualFold(eventType, "ChannelHangupRequest") {
		cause := ""
		if v, ok := eventDetails["cause"]; ok {
			cause = fmt.Sprintf("%v", v)
		}
		causeText := ""
		if v, ok := eventDetails["cause_txt"]; ok {
			causeText = fmt.Sprintf("%v", v)
		}
		switch strings.ToUpper(causeText) {
		case "NORMAL_CLEARING", "NORMAL CLEARING":
			statusInfo.Completed = true
		case "USER_BUSY", "BUSY", "NO_ANSWER", "NO ANSWER", "CALL_REJECTED", "REJECTED", "CONGESTION", "NETWORK_OUT_OF_ORDER", "NORMAL_TEMPORARY_FAILURE":
			if reason == "" {
				reason = causeText
			}
			statusInfo.Error = &internal_type.StatusError{Error: "failed", Reason: reason}
		}
		if statusInfo.Error == nil && !statusInfo.Completed {
			switch cause {
			case "", "16", "0":
				statusInfo.Completed = true
			default:
				if reason == "" {
					reason = cause
				}
				statusInfo.Error = &internal_type.StatusError{Error: "failed", Reason: reason}
			}
		}
	}
	if strings.EqualFold(eventType, "StasisEnd") && statusInfo.Error == nil {
		statusInfo.Completed = true
	}

	return statusInfo, nil
}

func (apt *asteriskTelephony) CatchAllStatusCallback(ctx *gin.Context) (*internal_type.StatusInfo, error) {
	return nil, nil
}

func (apt *asteriskTelephony) ReceiveCall(c *gin.Context) (*internal_type.CallInfo, error) {
	queryParams := make(map[string]string, len(c.Request.URL.Query()))
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			queryParams[key] = values[0]
		}
	}

	callerNumber := queryParams["from"]
	if callerNumber == "" {
		callerNumber = queryParams["caller"]
	}
	if callerNumber == "" {
		callerNumber = queryParams["callerid"]
	}
	if callerNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing caller information; provide 'from' or 'caller' query parameter"})
		return nil, fmt.Errorf("missing caller information in query params")
	}

	dialedNumber := queryParams["to"]
	if dialedNumber == "" {
		dialedNumber = queryParams["extension"]
	}
	if dialedNumber == "" {
		dialedNumber = queryParams["dnid"]
	}
	queryParams["from"] = callerNumber
	if dialedNumber != "" {
		queryParams["to"] = dialedNumber
	}

	info := &internal_type.CallInfo{
		CallerNumber: callerNumber,
		FromNumber:   dialedNumber,
		Provider:     asteriskProvider,
		Status:       "SUCCESS",
		StatusInfo:   internal_type.StatusInfo{Event: "webhook", Payload: queryParams},
	}
	if channelID := queryParams["channel_id"]; channelID != "" {
		info.ChannelUUID = channelID
	}
	return info, nil
}

func (apt *asteriskTelephony) OutboundCall(
	ctx context.Context,
	auth types.SimplePrinciple,
	toPhone string,
	fromPhone string,
	assistant *internal_assistant_entity.Assistant, assistantConversationId uint64,
	vaultCredential *protos.VaultCredential,
	statusReporter internal_type.ProviderCallStatusReporter,
	opts utils.Option,
) (*internal_type.CallInfo, error) {
	info := &internal_type.CallInfo{Provider: asteriskProvider}

	if err := ctx.Err(); err != nil {
		info.Status = "FAILED"
		info.ErrorMessage = fmt.Sprintf("request cancelled: %s", err.Error())
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassRequestCancelled,
			"request cancelled",
			internal_telephony_base.OutboundDisconnectReasonRequestCancelled,
			err,
			0,
		)
		return info, err
	}

	if vaultCredential == nil || vaultCredential.GetValue() == nil {
		err := fmt.Errorf("missing vault credential for Asterisk ARI")
		info.Status = "FAILED"
		info.ErrorMessage = "Missing vault credential for Asterisk ARI"
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassConfiguration,
			"missing vault credential",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}

	credMap := vaultCredential.GetValue().AsMap()
	ariBaseURL, _ := credMap["ari_url"].(string)
	if ariBaseURL == "" {
		err := fmt.Errorf("missing ari_url in vault credential")
		info.Status = "FAILED"
		info.ErrorMessage = "Missing ari_url in vault credential"
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassConfiguration,
			"missing ARI URL",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}

	endpointTech := "PJSIP"
	if tech, ok := credMap["endpoint_technology"].(string); ok && tech != "" {
		endpointTech = tech
	}
	if tech, err := opts.GetString("endpoint_technology"); err == nil && tech != "" {
		endpointTech = tech
	}

	endpoint := fmt.Sprintf("%s/%s", endpointTech, toPhone)
	if trunk, ok := credMap["trunk"].(string); ok && trunk != "" {
		endpoint = fmt.Sprintf("%s/%s/%s", endpointTech, trunk, toPhone)
	}
	if trunk, err := opts.GetString("trunk"); err == nil && trunk != "" {
		endpoint = fmt.Sprintf("%s/%s/%s", endpointTech, trunk, toPhone)
	}

	callerId := fromPhone
	if callerIdVal, err := opts.GetString("caller_id"); err == nil && callerIdVal != "" {
		callerId = callerIdVal
	}

	params := url.Values{}
	params.Set("endpoint", endpoint)
	params.Set("callerId", callerId)

	appName := "rapida"
	if appVal, err := opts.GetString("app"); err == nil && appVal != "" {
		appName = appVal
	}

	hasDialplan := false
	if ctxVal, err := opts.GetString("context"); err == nil && ctxVal != "" {
		params.Set("context", ctxVal)
		params.Set("priority", "1")
		hasDialplan = true
		if extVal, err := opts.GetString("extension"); err == nil && extVal != "" {
			params.Set("extension", extVal)
		} else {
			params.Set("extension", "s")
		}
	}

	if !hasDialplan {
		params.Set("app", appName)
		params.Set("appArgs", fmt.Sprintf("incoming,assistant_id=%d,conversation_id=%d", assistant.Id, assistantConversationId))
	}

	channelVars := map[string]string{}
	if contextID, err := opts.GetString("rapida.context_id"); err == nil && contextID != "" {
		channelVars["RAPIDA_CONTEXT_ID"] = contextID
	}

	var bodyBytes []byte
	if len(channelVars) > 0 {
		bodyMap := map[string]interface{}{
			"variables": channelVars,
		}
		var err error
		bodyBytes, err = json.Marshal(bodyMap)
		if err != nil {
			info.Status = "FAILED"
			info.ErrorMessage = fmt.Sprintf("failed to marshal channel variables: %s", err.Error())
			internal_telephony_base.ReportOutboundFailure(
				statusReporter,
				internal_telephony_base.OutboundFailureClassRequestPayload,
				"failed to build provider request payload",
				internal_telephony_base.OutboundDisconnectReasonSetupFailed,
				err,
				0,
			)
			return info, err
		}
	}

	ariURL := fmt.Sprintf("%s/ari/channels?%s", ariBaseURL, params.Encode())
	var req *http.Request
	var err error
	if bodyBytes != nil {
		req, err = http.NewRequestWithContext(ctx, "POST", ariURL, bytes.NewReader(bodyBytes))
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
		}
	} else {
		req, err = http.NewRequestWithContext(ctx, "POST", ariURL, nil)
	}
	if err != nil {
		info.Status = "FAILED"
		info.ErrorMessage = fmt.Sprintf("request creation error: %s", err.Error())
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassRequestCreation,
			"failed to create provider request",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}

	user, _ := credMap["ari_user"].(string)
	password, _ := credMap["ari_password"].(string)
	req.SetBasicAuth(user, password)

	apt.logger.Infof("ARI outbound call: endpoint=%s, callerId=%s, url=%s", endpoint, callerId, ariURL)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		info.Status = "FAILED"
		info.ErrorMessage = fmt.Sprintf("ARI request error: %s", err.Error())
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassProviderAPI,
			"provider API error",
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			0,
		)
		return info, err
	}
	defer resp.Body.Close()

	var ariResp map[string]interface{}
	if decodeErr := json.NewDecoder(resp.Body).Decode(&ariResp); decodeErr != nil {
		apt.logger.Warnf("failed to decode ARI response: %v", decodeErr)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		errMsg := fmt.Sprintf("ARI returned status %d", resp.StatusCode)
		if msg, ok := ariResp["message"]; ok {
			errMsg = fmt.Sprintf("ARI returned status %d: %v", resp.StatusCode, msg)
		}
		info.Status = "FAILED"
		info.ErrorMessage = errMsg
		apt.logger.Errorf("ARI outbound call failed: %s, response: %+v", errMsg, ariResp)
		err := fmt.Errorf("%s", errMsg)
		internal_telephony_base.ReportOutboundFailure(
			statusReporter,
			internal_telephony_base.OutboundFailureClassProviderAPI,
			errMsg,
			internal_telephony_base.OutboundDisconnectReasonSetupFailed,
			err,
			resp.StatusCode,
		)
		return info, err
	}

	if id, ok := ariResp["id"]; ok {
		info.ChannelUUID = fmt.Sprintf("%v", id)
	}

	info.Status = "SUCCESS"
	info.StatusInfo = internal_type.StatusInfo{Event: "channel_created", Payload: ariResp}
	apt.logger.Infof("ARI outbound call succeeded: channelId=%s, endpoint=%s", info.ChannelUUID, endpoint)
	internal_telephony_base.ReportOutboundInitiated(statusReporter, info.ChannelUUID)
	return info, nil
}

func (apt *asteriskTelephony) InboundCall(
	c *gin.Context,
	auth types.SimplePrinciple,
	assistantId uint64,
	clientNumber string,
	assistantConversationId uint64,
) error {
	contextID, exists := c.Get("contextId")
	if !exists || contextID == "" {
		return fmt.Errorf("missing contextId — CallReciever must save call context before InboundCall")
	}
	c.String(http.StatusOK, fmt.Sprintf("%v", contextID))
	return nil
}
