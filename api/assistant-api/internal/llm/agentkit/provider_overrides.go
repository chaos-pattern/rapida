// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package internal_llm_agentkit

import (
	"strings"

	internal_assistant_entity "github.com/rapidaai/api/assistant-api/internal/entity/assistants"
	internal_options "github.com/rapidaai/api/assistant-api/internal/options"
	gorm_types "github.com/rapidaai/pkg/models/gorm/types"
	"github.com/rapidaai/pkg/utils"
	"google.golang.org/protobuf/types/known/anypb"
)

func withAgentkitOverrides(
	provider *internal_assistant_entity.AssistantProviderAgentkit,
	conversationOptions utils.Option,
) (*internal_assistant_entity.AssistantProviderAgentkit, map[string]*anypb.Any) {
	if provider == nil {
		return nil, agentkitInitializationOptions(conversationOptions)
	}

	resolved := *provider
	resolved.Metadata = make(gorm_types.StringMap, len(provider.Metadata))
	for key, value := range provider.Metadata {
		resolved.Metadata[key] = value
	}
	if len(conversationOptions) == 0 {
		return &resolved, agentkitInitializationOptions(conversationOptions)
	}

	if value, err := conversationOptions.GetString(internal_options.AgentkitOptionTransportSecurity); err == nil && value != "" {
		resolved.TransportSecurity = &value
	}
	if value, err := conversationOptions.GetString(internal_options.AgentkitOptionTLSVerification); err == nil && value != "" {
		resolved.TLSVerification = &value
	}
	if value, err := conversationOptions.GetString(internal_options.AgentkitOptionTLSServerName); err == nil {
		resolved.TLSServerName = &value
	}
	if value, err := conversationOptions.GetString(internal_options.AgentkitOptionCertificate); err == nil {
		resolved.Certificate = value
	}
	if value, err := conversationOptions.GetUint32(internal_options.AgentkitOptionConnectTimeoutMs); err == nil {
		resolved.ConnectTimeoutMs = &value
	}
	if value, err := conversationOptions.GetUint32(internal_options.AgentkitOptionKeepaliveTimeMs); err == nil {
		resolved.KeepaliveTimeMs = &value
	}
	if value, err := conversationOptions.GetUint32(internal_options.AgentkitOptionKeepaliveTimeoutMs); err == nil {
		resolved.KeepaliveTimeoutMs = &value
	}
	if value, err := conversationOptions.GetUint32(internal_options.AgentkitOptionMaxRecvMessageBytes); err == nil {
		resolved.MaxRecvMessageBytes = &value
	}
	if value, err := conversationOptions.GetUint32(internal_options.AgentkitOptionMaxSendMessageBytes); err == nil {
		resolved.MaxSendMessageBytes = &value
	}
	if metadata, err := conversationOptions.GetStringMap(internal_options.AgentkitOptionMetadata); err == nil {
		for key, value := range metadata {
			resolved.Metadata[key] = value
		}
	}

	return &resolved, agentkitInitializationOptions(conversationOptions)
}

func agentkitInitializationOptions(conversationOptions utils.Option) map[string]*anypb.Any {
	resolved := make(map[string]*anypb.Any, len(conversationOptions))
	if len(conversationOptions) > 0 {
		filteredConversationOptions := make(map[string]interface{}, len(conversationOptions))
		for key, value := range conversationOptions {
			if strings.HasPrefix(key, internal_options.AgentkitOptionPrefix) {
				continue
			}
			filteredConversationOptions[key] = value
		}
		if convertedOptions, err := utils.InterfaceMapToAnyMap(filteredConversationOptions); err == nil {
			for key, value := range convertedOptions {
				resolved[key] = value
			}
		}
	}
	if len(resolved) == 0 {
		return nil
	}
	return resolved
}
