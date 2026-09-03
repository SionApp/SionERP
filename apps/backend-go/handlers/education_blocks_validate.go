// education_blocks_validate.go — the ONLY write path into
// education_lesson_steps.blocks (design: "The block validator is the ONLY
// write path ... No second entry point, no admin bypass"). Pure Go: no DB,
// no echo, so it is fast and independently unit-testable
// (education_blocks_validate_test.go).
//
// Spec ref: education-content-model — "Block envelope and type whitelist",
// "Restricted ProseMirror JSON is server-sanitized". Threat matrix rows:
// "Stored XSS via block content" (High), "SSRF / arbitrary embed via the
// video block" (Medium).
//
// Per-type `data` shapes below are this PR's concrete instantiation of the
// design's block model. The design doc (obs #504/#514) spells out the exact
// shape only for `paragraph` and `pdf` (via the migration's content
// backfill) and the security-relevant fields of `video`/`image`/`link`
// hrefs (via the threat matrix); it does not enumerate every field of
// `heading`/`list`/`quote`/`callout`/`question`/`divider`. Those shapes are
// filled in here, closed (extra keys rejected) and consistent with the
// backfill's own paragraph/pdf shapes — flagged as a design gap filled
// during implementation, not a silent deviation from an explicit design
// decision.
package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// allowedBlockTypes is the exact whitelist from spec: "type is one of
// exactly: heading, paragraph, list, image, video, quote, callout, pdf,
// question, divider".
var allowedBlockTypes = map[string]bool{
	"heading":   true,
	"paragraph": true,
	"list":      true,
	"image":     true,
	"video":     true,
	"quote":     true,
	"callout":   true,
	"pdf":       true,
	"question":  true,
	"divider":   true,
}

var blockIDPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)

// videoIDPattern is the design's exact regex (threat matrix: "SSRF /
// arbitrary embed via the video block").
var videoIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{6,32}$`)

var allowedVideoProviders = map[string]bool{"youtube": true, "vimeo": true}
var allowedListStyles = map[string]bool{"bullet": true, "number": true}
var allowedCalloutVariants = map[string]bool{"info": true, "warning": true, "success": true}
var allowedMarkTypes = map[string]bool{"bold": true, "italic": true, "underline": true, "link": true}

// blockEnvelope is the closed `{id,type,data}` shape (spec: "Every block
// MUST be {id, type, data}"). DisallowUnknownFields rejects any 4th key.
type blockEnvelope struct {
	ID   string          `json:"id"`
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// ValidateLessonBlocks validates a full `blocks` array for ONE step write,
// atomically: the whole array is accepted or the whole write is rejected
// (spec: "the entire write is rejected ... the unknown block MUST NOT be
// silently stripped, coerced, or persisted"). `idsUsedElsewhereInLesson` is
// the set of block ids already present in the OTHER steps of the same
// lesson (empty for a lesson with no other steps yet) — uniqueness is
// lesson-wide, not step-wide (spec: "Duplicate block id across steps").
//
// On success, callers should persist `rawBlocks` VERBATIM (it has already
// been proven conformant) — this function performs no normalization or
// re-marshaling that would diverge from what was submitted.
func ValidateLessonBlocks(rawBlocks []byte, idsUsedElsewhereInLesson map[string]bool) error {
	trimmed := bytes.TrimSpace(rawBlocks)
	if len(trimmed) == 0 || trimmed[0] != '[' {
		return fmt.Errorf("blocks must be a JSON array, got: %s", firstToken(trimmed))
	}

	var envelopes []json.RawMessage
	if err := strictUnmarshal(trimmed, &envelopes); err != nil {
		return fmt.Errorf("blocks must be a JSON array: %w", err)
	}

	seenInThisWrite := map[string]bool{}
	for i, raw := range envelopes {
		var b blockEnvelope
		if err := strictUnmarshalObject(raw, &b); err != nil {
			return fmt.Errorf("block[%d]: invalid envelope (expected exactly id/type/data): %w", i, err)
		}
		if b.ID == "" || !blockIDPattern.MatchString(b.ID) {
			return fmt.Errorf("block[%d]: id must be a v4 UUID, got %q", i, b.ID)
		}
		if seenInThisWrite[b.ID] {
			return fmt.Errorf("block[%d]: duplicate block id %q within this write", i, b.ID)
		}
		if idsUsedElsewhereInLesson[b.ID] {
			return fmt.Errorf("block[%d]: duplicate block id %q — already used elsewhere in this lesson (ids are lesson-wide, not step-wide)", i, b.ID)
		}
		seenInThisWrite[b.ID] = true

		if !allowedBlockTypes[b.Type] {
			return fmt.Errorf("block[%d]: unknown block type %q — not one of the whitelisted types", i, b.Type)
		}
		if err := validateBlockData(b.Type, b.Data); err != nil {
			return fmt.Errorf("block[%d] (type=%s): %w", i, b.Type, err)
		}
	}
	return nil
}

func firstToken(b []byte) string {
	const max = 40
	if len(b) > max {
		b = b[:max]
	}
	return string(b)
}

// strictUnmarshal decodes into dst using DisallowUnknownFields, requiring
// the input to be exactly one JSON value with no trailing garbage.
func strictUnmarshal(raw []byte, dst interface{}) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if dec.More() {
		return fmt.Errorf("unexpected trailing content after JSON value")
	}
	return nil
}

// strictUnmarshalObject is strictUnmarshal, but if the raw bytes are not a
// JSON object (e.g. an array or a bare string) it fails with a message that
// blames the envelope shape rather than a random field name.
func strictUnmarshalObject(raw []byte, dst interface{}) error {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		return fmt.Errorf("expected a JSON object, got: %s", firstToken(trimmed))
	}
	return strictUnmarshal(trimmed, dst)
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type `data` shapes
// ─────────────────────────────────────────────────────────────────────────────

type headingData struct {
	Text  string `json:"text"`
	Level int    `json:"level"`
}

type paragraphData struct {
	Doc pmDoc `json:"doc"`
}

type listData struct {
	Style string   `json:"style"`
	Items []string `json:"items"`
}

type imageData struct {
	Path    string  `json:"path"`
	Alt     string  `json:"alt"`
	Caption *string `json:"caption,omitempty"`
}

type videoData struct {
	Provider string  `json:"provider"`
	VideoID  string  `json:"videoId"`
	Caption  *string `json:"caption,omitempty"`
}

type quoteData struct {
	Doc         pmDoc   `json:"doc"`
	Attribution *string `json:"attribution,omitempty"`
}

type calloutData struct {
	Doc     pmDoc  `json:"doc"`
	Variant string `json:"variant"`
}

type pdfData struct {
	Path      string `json:"path"`
	Name      string `json:"name"`
	SizeBytes int    `json:"sizeBytes"`
}

type questionData struct {
	Prompt string `json:"prompt"`
}

// dividerData is intentionally empty — divider blocks carry no data. Any key
// at all is rejected by strictUnmarshalObject's DisallowUnknownFields.
type dividerData struct{}

func validateBlockData(blockType string, raw json.RawMessage) error {
	switch blockType {
	case "heading":
		var d headingData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if strings.TrimSpace(d.Text) == "" {
			return fmt.Errorf("heading.text is required")
		}
		if d.Level != 2 && d.Level != 3 {
			return fmt.Errorf("heading.level must be 2 or 3, got %d", d.Level)
		}
		return nil

	case "paragraph":
		var d paragraphData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		return validatePMDoc(d.Doc)

	case "list":
		var d listData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if !allowedListStyles[d.Style] {
			return fmt.Errorf("list.style must be one of bullet|number, got %q", d.Style)
		}
		if len(d.Items) == 0 {
			return fmt.Errorf("list.items must not be empty")
		}
		for i, item := range d.Items {
			if strings.TrimSpace(item) == "" {
				return fmt.Errorf("list.items[%d] must not be empty", i)
			}
		}
		return nil

	case "image":
		var d imageData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if strings.TrimSpace(d.Path) == "" {
			return fmt.Errorf("image.path is required")
		}
		return nil

	case "video":
		var d videoData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if !allowedVideoProviders[d.Provider] {
			return fmt.Errorf("video.provider must be one of youtube|vimeo, got %q", d.Provider)
		}
		if !videoIDPattern.MatchString(d.VideoID) {
			return fmt.Errorf("video.videoId must match ^[A-Za-z0-9_-]{6,32}$, got %q", d.VideoID)
		}
		return nil

	case "quote":
		var d quoteData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		return validatePMDoc(d.Doc)

	case "callout":
		var d calloutData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if !allowedCalloutVariants[d.Variant] {
			return fmt.Errorf("callout.variant must be one of info|warning|success, got %q", d.Variant)
		}
		return validatePMDoc(d.Doc)

	case "pdf":
		var d pdfData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if strings.TrimSpace(d.Path) == "" {
			return fmt.Errorf("pdf.path is required")
		}
		if strings.TrimSpace(d.Name) == "" {
			return fmt.Errorf("pdf.name is required")
		}
		if d.SizeBytes < 0 {
			return fmt.Errorf("pdf.sizeBytes must not be negative")
		}
		return nil

	case "question":
		var d questionData
		if err := strictUnmarshalObject(raw, &d); err != nil {
			return err
		}
		if strings.TrimSpace(d.Prompt) == "" {
			return fmt.Errorf("question.prompt is required")
		}
		return nil

	case "divider":
		var d dividerData
		return strictUnmarshalObject(raw, &d)

	default:
		// Unreachable: callers only invoke this after allowedBlockTypes check.
		return fmt.Errorf("unknown block type %q", blockType)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Restricted ProseMirror JSON ("PMDoc")
//
// Spec: "PMDoc values MUST be a single doc > paragraph whose children are
// text nodes carrying only bold | italic | underline | link marks, plus
// hardBreak. The server MUST whitelist node and mark types on every write.
// link hrefs MUST be scheme-whitelisted to http, https, mailto."
// ─────────────────────────────────────────────────────────────────────────────

type pmDoc struct {
	Type    string   `json:"type"`
	Content []pmNode `json:"content"`
}

type pmNode struct {
	Type    string   `json:"type"`
	Content []pmNode `json:"content,omitempty"`
	Text    string   `json:"text,omitempty"`
	Marks   []pmMark `json:"marks,omitempty"`
}

type pmMark struct {
	Type  string            `json:"type"`
	Attrs map[string]string `json:"attrs,omitempty"`
}

func validatePMDoc(doc pmDoc) error {
	if doc.Type != "doc" {
		return fmt.Errorf("paragraph.doc.type must be \"doc\", got %q", doc.Type)
	}
	if len(doc.Content) != 1 || doc.Content[0].Type != "paragraph" {
		return fmt.Errorf("paragraph.doc.content must be exactly one node of type \"paragraph\"")
	}
	para := doc.Content[0]
	if len(para.Content) == 0 {
		return nil // an empty paragraph is valid (e.g. a blank line)
	}
	for i, child := range para.Content {
		switch child.Type {
		case "text":
			if len(child.Content) != 0 {
				return fmt.Errorf("paragraph.doc text node[%d] must not have nested content", i)
			}
			for _, m := range child.Marks {
				if !allowedMarkTypes[m.Type] {
					return fmt.Errorf("paragraph.doc text node[%d]: mark type %q is not whitelisted (bold|italic|underline|link)", i, m.Type)
				}
				if m.Type == "link" {
					href, ok := m.Attrs["href"]
					if !ok || len(m.Attrs) != 1 {
						return fmt.Errorf("paragraph.doc text node[%d]: link mark must carry exactly one attr, href", i)
					}
					if !hrefSchemeAllowed(href) {
						return fmt.Errorf("paragraph.doc text node[%d]: link href %q is not scheme-whitelisted (http|https|mailto)", i, href)
					}
				} else if len(m.Attrs) != 0 {
					return fmt.Errorf("paragraph.doc text node[%d]: mark type %q must not carry attrs", i, m.Type)
				}
			}
		case "hardBreak":
			if len(child.Content) != 0 || child.Text != "" || len(child.Marks) != 0 {
				return fmt.Errorf("paragraph.doc hardBreak node[%d] must not carry text, marks or content", i)
			}
		default:
			return fmt.Errorf("paragraph.doc.content[0] (paragraph) child[%d]: disallowed node type %q — only text and hardBreak are permitted", i, child.Type)
		}
	}
	return nil
}

func hrefSchemeAllowed(href string) bool {
	lower := strings.ToLower(strings.TrimSpace(href))
	return strings.HasPrefix(lower, "http://") ||
		strings.HasPrefix(lower, "https://") ||
		strings.HasPrefix(lower, "mailto:")
}
