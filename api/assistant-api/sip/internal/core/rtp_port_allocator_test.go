// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package core

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestRTPPortAllocatorKeysUseInstanceID(t *testing.T) {
	allocator := NewRTPPortAllocatorWithInstanceID(nil, nil, 10000, 10010, "sip-prod-a")

	assert.Equal(t, "sip-prod-a", allocator.instanceID)
	assert.Equal(t, "{rtp:ports:sip-prod-a}:available", allocator.availableKey())
	assert.Equal(t, "{rtp:ports:sip-prod-a}:allocated:sip-prod-a", allocator.allocatedKey())
}

func TestRTPPortAllocatorKeysSanitizeInstanceID(t *testing.T) {
	allocator := NewRTPPortAllocatorWithInstanceID(nil, nil, 10000, 10010, " prod {a}\n")

	assert.Equal(t, "prod__a_", allocator.instanceID)
	assert.Equal(t, "{rtp:ports:prod__a_}:available", allocator.availableKey())
	assert.Equal(t, "{rtp:ports:prod__a_}:allocated:prod__a_", allocator.allocatedKey())
}
