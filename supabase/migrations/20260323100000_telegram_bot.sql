-- ============================================
-- SaveDin Telegram Bot - Tables
-- ============================================

-- Vinculação Telegram ↔ User
CREATE TABLE savedin.telegram_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  link_code TEXT UNIQUE,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Sessões temporárias do bot (fluxo conversacional)
CREATE TABLE savedin.telegram_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  step TEXT NOT NULL DEFAULT 'idle',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index para busca rápida
CREATE INDEX idx_telegram_links_chat_id ON savedin.telegram_links(chat_id);
CREATE INDEX idx_telegram_links_user_id ON savedin.telegram_links(user_id);
CREATE INDEX idx_telegram_links_link_code ON savedin.telegram_links(link_code);
CREATE INDEX idx_telegram_sessions_chat_id ON savedin.telegram_sessions(chat_id);

-- RLS
ALTER TABLE savedin.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE savedin.telegram_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns" ON savedin.telegram_links FOR ALL USING (auth.uid() = user_id);
-- Sessions are managed by the Edge Function (service role), no user RLS needed
CREATE POLICY "service_all" ON savedin.telegram_sessions FOR ALL USING (true);

-- Cleanup expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION savedin.cleanup_telegram_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM savedin.telegram_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
