CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('success', 'warning', 'info', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_text TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
