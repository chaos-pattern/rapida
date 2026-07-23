// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package core

import (
	"testing"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServerConfigValidate_RequiresInstanceID(t *testing.T) {
	cfg := validServerConfigForValidation()
	cfg.InstanceID = ""

	err := cfg.Validate()

	require.Error(t, err)
	assert.Contains(t, err.Error(), "instance_id is required")
}

func TestServerConfigValidate_AcceptsValidInstanceID(t *testing.T) {
	cfg := validServerConfigForValidation()

	require.NoError(t, cfg.Validate())
}

func validServerConfigForValidation() *ServerConfig {
	return &ServerConfig{
		ListenConfig: &ListenConfig{
			Address:   "0.0.0.0",
			Port:      5060,
			Transport: TransportUDP,
		},
		Logger:            bridgeTestLogger(),
		RedisClient:       redis.NewClient(&redis.Options{Addr: "127.0.0.1:0"}),
		InstanceID:        "assistant-test-01",
		RTPPortRangeStart: 10000,
		RTPPortRangeEnd:   10010,
	}
}
