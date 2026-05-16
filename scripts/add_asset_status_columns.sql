-- Run once on existing Postgres databases (RDS or local).
-- New installs using SQLAlchemy create_all on empty DB get columns from models.py.

ALTER TABLE knowledge_assets
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ready';

ALTER TABLE knowledge_assets
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE knowledge_assets SET status = 'ready' WHERE status IS NULL;
