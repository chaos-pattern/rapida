// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package internal_transformer_deepgram

import (
	"fmt"
	"net/url"
	"strings"

	internal_options "github.com/rapidaai/api/assistant-api/internal/options"
	commons "github.com/rapidaai/pkg/commons"
	utils "github.com/rapidaai/pkg/utils"
	"github.com/rapidaai/protos"

	interfaces "github.com/deepgram/deepgram-go-sdk/v3/pkg/client/interfaces"
)

const deepgramDefaultEndpoint = "api.deepgram.com"

func (dg *deepgramOption) GetEncoding() string {
	return "linear16"
}

type deepgramOption struct {
	key      string
	endpoint string
	logger   commons.Logger
	mdlOpts  utils.Option
}

func NewDeepgramOption(
	logger commons.Logger,
	vaultCredential *protos.VaultCredential,
	opts utils.Option) (*deepgramOption, error) {
	raw := vaultCredential.GetValue().AsMap()
	cx, ok := raw["key"]
	if !ok {
		return nil, fmt.Errorf("illegal vault config")
	}
	key, ok := cx.(string)
	if !ok || strings.TrimSpace(key) == "" {
		return nil, fmt.Errorf("illegal vault config")
	}
	endpoint, err := normalizeDeepgramEndpoint(raw["endpoint"])
	if err != nil {
		return nil, err
	}
	return &deepgramOption{
		key:      key,
		endpoint: endpoint,
		logger:   logger,
		mdlOpts:  opts,
	}, nil
}

func (dgOpt *deepgramOption) GetKey() string {
	return dgOpt.key
}

func (dgOpt *deepgramOption) GetEndpoint() string {
	return dgOpt.endpoint
}

func (dgOpt *deepgramOption) ClientOptions() *interfaces.ClientOptions {
	return &interfaces.ClientOptions{
		APIKey:          dgOpt.GetKey(),
		Host:            dgOpt.GetEndpoint(),
		EnableKeepAlive: true,
	}
}

func (dgOpt *deepgramOption) SpeechToTextOptions() *interfaces.LiveTranscriptionOptions {
	opts := &interfaces.LiveTranscriptionOptions{
		Model:          "nova",
		Language:       "en-US",
		Channels:       1,
		SmartFormat:    true,
		InterimResults: true,
		FillerWords:    true,
		VadEvents:      false,
		Endpointing:    "5",
		Punctuate:      true,
		NoDelay:        true,
		Encoding:       dgOpt.GetEncoding(),
		SampleRate:     16000,
		Diarize:        false,
		Multichannel:   false,
	}

	if language, err := dgOpt.mdlOpts.GetString(internal_options.ListenOptionLanguage); err == nil {
		opts.Language = language
	}

	if smartFormat, err := dgOpt.mdlOpts.GetBool(internal_options.ListenOptionSmartFormat); err == nil {
		opts.SmartFormat = smartFormat
	}

	if fillerWords, err := dgOpt.mdlOpts.GetBool(internal_options.ListenOptionFillerWords); err == nil {
		opts.FillerWords = fillerWords
	}
	if vadEvents, err := dgOpt.mdlOpts.GetBool(internal_options.ListenOptionVADEvents); err == nil {
		opts.VadEvents = vadEvents
	}
	if endpointing, err := dgOpt.mdlOpts.GetString(internal_options.ListenOptionEndpointing); err == nil {
		opts.Endpointing = endpointing
	}
	if multichannel, err := dgOpt.mdlOpts.GetBool(internal_options.ListenOptionMultichannel); err == nil {
		opts.Multichannel = multichannel
	}
	if model, err := dgOpt.mdlOpts.GetString(internal_options.ListenOptionModel); err == nil {
		opts.Model = model
	}

	if keywordsRaw, exists := dgOpt.mdlOpts[internal_options.ListenOptionKeyword]; exists {
		var keywords []string
		switch v := keywordsRaw.(type) {
		case string:
			trimmed := strings.Trim(v, "[]")
			keywords = strings.Fields(trimmed)
		case []interface{}:
			keywords = make([]string, len(v))
			for i, keyword := range v {
				if str, ok := keyword.(string); ok {
					keywords[i] = strings.TrimSpace(str)
				}
			}
		default:
			dgOpt.logger.Warnf("Unexpected type for keywords: %T", keywordsRaw)
		}
		if len(keywords) > 0 {
			if opts.Model == "nova-2" {
				opts.Keywords = keywords
			}
			if opts.Model == "nova-3" {
				opts.Keyterm = keywords
			}

		}
	}
	return opts
}

func (dgOpt *deepgramOption) GetTextToSpeechConnectionString() string {
	params := url.Values{}
	params.Add("encoding", dgOpt.GetEncoding())
	params.Add("sample_rate", "16000")
	if model, err := dgOpt.mdlOpts.GetString(internal_options.SpeakOptionVoiceID); err == nil {
		params.Add("model", model)
	}
	return fmt.Sprintf("wss://%s/v1/speak?%s", dgOpt.GetEndpoint(), params.Encode())
}

func normalizeDeepgramEndpoint(raw interface{}) (string, error) {
	if raw == nil {
		return deepgramDefaultEndpoint, nil
	}
	endpoint, ok := raw.(string)
	if !ok {
		return "", fmt.Errorf("illegal vault config endpoint must be string")
	}
	endpoint = strings.TrimSpace(endpoint)
	if endpoint == "" {
		return deepgramDefaultEndpoint, nil
	}

	if parsed, err := url.Parse(endpoint); err == nil && parsed.Host != "" {
		endpoint = parsed.Host
	} else if host, _, found := strings.Cut(endpoint, "/"); found {
		endpoint = host
	}
	if host, _, found := strings.Cut(endpoint, "?"); found {
		endpoint = host
	}
	if host, _, found := strings.Cut(endpoint, "#"); found {
		endpoint = host
	}
	endpoint = strings.TrimSpace(strings.TrimSuffix(endpoint, "/"))
	if endpoint == "" || strings.ContainsAny(endpoint, " \t\r\n") {
		return "", fmt.Errorf("illegal vault config endpoint")
	}
	return endpoint, nil
}
