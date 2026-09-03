// education_blocks_validate_test.go — RED-first table-driven coverage for the
// block/PMDoc validator (PR-B, education-content-model). Pure unit tests: no
// DB, no echo — matches the design's Testing Strategy row for this file
// exactly ("table-driven against the pure validator ... no echo, no DB,
// fast").
//
// Spec ref: education-content-model — "Block envelope and type whitelist",
// "Restricted ProseMirror JSON is server-sanitized". Threat matrix: "Stored
// XSS via block content" (High) and "SSRF / arbitrary embed via the video
// block" (Medium) are both covered here.
package handlers

import "testing"

func TestValidateLessonBlocks(t *testing.T) {
	tests := []struct {
		name          string
		blocks        string
		usedElsewhere map[string]bool
		wantErr       bool
		errContains   string
	}{
		{
			name: "valid: one block of every whitelisted type is accepted",
			blocks: `[
				{"id":"11111111-1111-4111-8111-111111111111","type":"heading","data":{"text":"Intro","level":2}},
				{"id":"22222222-2222-4222-8222-222222222222","type":"paragraph","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hola ","marks":[{"type":"bold"}]},{"type":"text","text":"mundo","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}]}]}}},
				{"id":"33333333-3333-4333-8333-333333333333","type":"list","data":{"style":"bullet","items":["uno","dos"]}},
				{"id":"44444444-4444-4444-8444-444444444444","type":"image","data":{"path":"education/c1/img.png","alt":"desc"}},
				{"id":"55555555-5555-4555-8555-555555555555","type":"video","data":{"provider":"youtube","videoId":"dQw4w9WgXcQ"}},
				{"id":"66666666-6666-4666-8666-666666666666","type":"quote","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"cita"}]}]},"attribution":"Alguien"}},
				{"id":"77777777-7777-4777-8777-777777777777","type":"callout","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"ojo"}]}]},"variant":"info"}},
				{"id":"88888888-8888-4888-8888-888888888888","type":"pdf","data":{"path":"education/c1/doc.pdf","name":"Guía","sizeBytes":1024}},
				{"id":"99999999-9999-4999-8999-999999999999","type":"question","data":{"prompt":"¿Qué aprendiste?"}},
				{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","type":"divider","data":{}}
			]`,
			wantErr: false,
		},
		{
			name:        "unknown block type is rejected whole-write, not dropped",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"script","data":{}}]`,
			wantErr:     true,
			errContains: "script",
		},
		{
			name:        "unknown field within a known type is rejected (closed shapes)",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"quote","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x"}]}]},"onClick":"doEvil()"}}]`,
			wantErr:     true,
			errContains: "quote",
		},
		{
			name:   "duplicate block id across steps is rejected (lesson-wide uniqueness)",
			blocks: `[{"id":"11111111-1111-4111-8111-111111111111","type":"divider","data":{}}]`,
			usedElsewhere: map[string]bool{
				"11111111-1111-4111-8111-111111111111": true,
			},
			wantErr:     true,
			errContains: "duplicate",
		},
		{
			name:        "duplicate block id within the same write is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"divider","data":{}},{"id":"11111111-1111-4111-8111-111111111111","type":"divider","data":{}}]`,
			wantErr:     true,
			errContains: "duplicate",
		},
		{
			name:        "non-array blocks payload (object) is rejected",
			blocks:      `{"id":"11111111-1111-4111-8111-111111111111","type":"divider","data":{}}`,
			wantErr:     true,
			errContains: "array",
		},
		{
			name:        "non-array blocks payload (string) is rejected",
			blocks:      `"not-an-array"`,
			wantErr:     true,
			errContains: "array",
		},
		{
			name:        "disallowed PMDoc node type (heading) is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"paragraph","data":{"doc":{"type":"doc","content":[{"type":"heading","content":[{"type":"text","text":"x"}]}]}}}]`,
			wantErr:     true,
			errContains: "paragraph",
		},
		{
			name:        "disallowed PMDoc node type (codeBlock) is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"paragraph","data":{"doc":{"type":"doc","content":[{"type":"codeBlock","content":[{"type":"text","text":"x"}]}]}}}]`,
			wantErr:     true,
			errContains: "paragraph",
		},
		{
			name:        "javascript: href on a link mark is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"paragraph","data":{"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"click","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}}]`,
			wantErr:     true,
			errContains: "href",
		},
		{
			name:        "video provider outside youtube|vimeo is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"video","data":{"provider":"dailymotion","videoId":"abc123def456"}}]`,
			wantErr:     true,
			errContains: "provider",
		},
		{
			name:        "video id failing the ^[A-Za-z0-9_-]{6,32}$ regex is rejected",
			blocks:      `[{"id":"11111111-1111-4111-8111-111111111111","type":"video","data":{"provider":"youtube","videoId":"a b"}}]`,
			wantErr:     true,
			errContains: "videoId",
		},
		{
			name:        "block id that is not a v4 UUID is rejected",
			blocks:      `[{"id":"not-a-uuid","type":"divider","data":{}}]`,
			wantErr:     true,
			errContains: "id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			used := tt.usedElsewhere
			if used == nil {
				used = map[string]bool{}
			}
			err := ValidateLessonBlocks([]byte(tt.blocks), used)
			if tt.wantErr && err == nil {
				t.Fatalf("expected an error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got: %v", err)
			}
			if tt.wantErr && tt.errContains != "" {
				if err == nil || !containsFold(err.Error(), tt.errContains) {
					t.Fatalf("expected error to mention %q, got: %v", tt.errContains, err)
				}
			}
		})
	}
}

func containsFold(haystack, needle string) bool {
	hl, nl := len(haystack), len(needle)
	if nl == 0 {
		return true
	}
	for i := 0; i+nl <= hl; i++ {
		if equalFold(haystack[i:i+nl], needle) {
			return true
		}
	}
	return false
}

func equalFold(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		ca, cb := a[i], b[i]
		if 'A' <= ca && ca <= 'Z' {
			ca += 'a' - 'A'
		}
		if 'A' <= cb && cb <= 'Z' {
			cb += 'a' - 'A'
		}
		if ca != cb {
			return false
		}
	}
	return true
}
