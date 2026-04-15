-- User voice assignments per guild
CREATE TABLE IF NOT EXISTS user_voices (
  user_id   TEXT NOT NULL,
  guild_id  TEXT NOT NULL,
  voice     TEXT NOT NULL DEFAULT 'en-US-GuyNeural',
  rate      TEXT NOT NULL DEFAULT '+0%',
  pitch     TEXT NOT NULL DEFAULT '+0Hz',
  PRIMARY KEY (user_id, guild_id)
);
