// Copyright (c) 2023-2025 RapidaAI
// Author: Prashant Srivastav <prashant@rapida.ai>
//
// Licensed under GPL-2.0 with Rapida Additional Terms.
// See LICENSE.md or contact sales@rapida.ai for commercial usage.

package smallest_internal

import (
	internal_type "github.com/rapidaai/api/assistant-api/internal/type"
	"github.com/rapidaai/pkg/commons"
	"github.com/rapidaai/pkg/utils"
)

// =============================================================================
// Smallest AI Text Normalizer
// =============================================================================

// smallestNormalizer handles Lightning TTS text preprocessing.
// Lightning does NOT support SSML - only plain text is accepted.
type smallestNormalizer struct {
	logger   commons.Logger
	language string
}

// NewSmallestNormalizer creates a Smallest-specific text normalizer.
func NewSmallestNormalizer(logger commons.Logger, opts utils.Option) internal_type.TextNormalizer {
	language, _ := opts.GetString("speaker.language")
	if language == "" {
		language = "en"
	}

	return &smallestNormalizer{
		logger:   logger,
		language: language,
	}
}

// Normalize returns text unchanged. Lightning does NOT support SSML.
// Markdown removal and whitespace normalization are handled upstream.
func (n *smallestNormalizer) Normalize(text string) string {
	return text
}
