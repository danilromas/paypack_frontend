#!/bin/sh
set -e

echo "==> Applying database migrations..."
npm run db:migrate

echo "==> Seeding demo data (skips if already present)..."
node scripts/seed.mjs

echo "==> Starting dev server..."
exec npm run dev
