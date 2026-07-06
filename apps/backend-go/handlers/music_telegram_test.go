package handlers

import "testing"

// Feeds a sample getUpdates payload and asserts the parser: filters by channel,
// accepts audio + audio-document, drops non-audio, and tracks the max update id.
func TestParseChannelAudios(t *testing.T) {
	body := []byte(`{
	  "ok": true,
	  "result": [
	    {"update_id": 10, "channel_post": {"message_id": 5, "date": 1700000000,
	      "chat": {"id": -100123},
	      "audio": {"file_id":"AAA","file_unique_id":"U1","title":"Oceanos","performer":"Hillsong","file_name":"oceanos.mp3","mime_type":"audio/mpeg","duration":420,"file_size":9999}}},
	    {"update_id": 11, "channel_post": {"message_id": 6, "date": 1700000100,
	      "chat": {"id": -100999},
	      "audio": {"file_id":"BBB","file_unique_id":"U2","title":"otro canal"}}},
	    {"update_id": 12, "channel_post": {"message_id": 7, "date": 1700000200,
	      "chat": {"id": -100123},
	      "document": {"file_id":"CCC","file_unique_id":"U3","file_name":"doc.mp3","mime_type":"audio/mpeg"}}},
	    {"update_id": 13, "channel_post": {"message_id": 8, "date": 1700000300,
	      "chat": {"id": -100123},
	      "document": {"file_id":"DDD","file_unique_id":"U4","file_name":"notes.pdf","mime_type":"application/pdf"}}}
	  ]
	}`)

	files, maxUpdate, err := parseChannelAudios(body, -100123)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if maxUpdate != 13 {
		t.Fatalf("maxUpdate = %d, want 13", maxUpdate)
	}
	// U1 (audio in channel) and U3 (audio document) pass; U2 (other channel) and U4 (pdf) drop.
	if len(files) != 2 {
		t.Fatalf("got %d files, want 2: %+v", len(files), files)
	}
	if files[0].FileUniqueID != "U1" || files[0].Title != "Oceanos" || files[0].Duration != 420 {
		t.Errorf("file[0] unexpected: %+v", files[0])
	}
	if files[1].FileUniqueID != "U3" || files[1].MimeType != "audio/mpeg" {
		t.Errorf("file[1] unexpected: %+v", files[1])
	}
}
