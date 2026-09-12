-- Adds support for the structured cardio workout builder (app/workout/cardio).
-- Run this manually against your Supabase project (SQL editor or `supabase db push`).
-- The app currently has no auth flow wired up, so this mirrors the existing
-- tables in SUPABASETABLES.md: no RLS is enabled here. Add auth-scoped RLS
-- policies later once user login is implemented.

-- 1. Shared enum for how a workout's intensity values were authored.
DO $$ BEGIN
  CREATE TYPE intensity_mode AS ENUM ('WATTS', 'FTP_PERCENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend planned_workouts with an ordered segment structure so builder
--    workouts (warmup/steady/interval/free/cooldown blocks) round-trip
--    for editing, plus the intensity basis + FTP snapshot used to author it.
ALTER TABLE planned_workouts
  ADD COLUMN IF NOT EXISTS structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS intensity_mode intensity_mode NOT NULL DEFAULT 'FTP_PERCENT',
  ADD COLUMN IF NOT EXISTS ftp_used_watts INT;

COMMENT ON COLUMN planned_workouts.structure IS
  'Ordered array of workout segments: [{ id, type: WARMUP|STEADY|INTERVAL|FREE|COOLDOWN, durationSec, intensityType, intensityValue, repeats?, restDurationSec?, restIntensityValue? }]. Empty array for non-structured/legacy workouts.';
COMMENT ON COLUMN planned_workouts.intensity_mode IS
  'Whether this workout was authored using raw WATTS or FTP_PERCENT; used to pick the default toggle state when re-editing.';
COMMENT ON COLUMN planned_workouts.ftp_used_watts IS
  'Athlete FTP (watts) in effect when this workout was authored, used to convert stored intensities between watts and %FTP.';

-- 3. Single-row-per-athlete FTP + builder preferences. user_id is nullable
--    and unenforced today since the app has no auth session yet.
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  ftp_watts INT,
  preferred_intensity_mode intensity_mode NOT NULL DEFAULT 'FTP_PERCENT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

COMMENT ON TABLE user_settings IS
  'Athlete-level app settings (currently just FTP + preferred intensity mode) used by the cardio workout builder.';
