-- ============================================================================
-- Neon.tech: создать таблицу для приложения (заказы / shipments)
--
-- Как запустить вручную:
--   1. Откройте https://console.neon.tech → ваш проект → ветку (branch).
--   2. Слева выберите «SQL Editor» (или «Tables» → там тоже можно выполнить SQL).
--   3. Скопируйте весь этот файл целиком и нажмите Run.
--
-- После этого таблицы shipments и deals будут в PostgreSQL (дашборд / shipments и сделки /dashboard).
-- В `.env.local` должен быть DATABASE_URL из Neon (Connection string).
--
-- Neon.tech: create table for the app (orders / shipments)
--
-- How to run:
--   1. Open Neon Console → your project → branch.
--   2. SQL Editor → paste this whole file → Run.
--
-- Then set DATABASE_URL in .env.local from Neon Connection string.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  sender_location TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_location TEXT NOT NULL,
  service TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  weight TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('arrived', 'in-transit', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Опционально: индекс по дате для быстрой сортировки списка
-- Optional: index for sorting by date
CREATE INDEX IF NOT EXISTS shipments_created_at_idx ON shipments (created_at DESC);

-- Сделки (deals) — дашборд /dashboard
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  images_json TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  shipping_price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (
    status IN (
      'pending', 'escrow', 'shipped', 'in-transit',
      'delivered', 'completed', 'disputed', 'cancelled'
    )
  ),
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
  counterparty TEXT NOT NULL DEFAULT '',
  counterparty_avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deals_created_at_idx ON deals (created_at DESC);

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS images_json TEXT NOT NULL DEFAULT '';
