-- Enable Supabase Realtime for the notifications table.
-- Without this, postgres_changes subscriptions won't fire for this table.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
