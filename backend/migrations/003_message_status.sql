-- ============================================================
-- Adds delivered/seen tracking to messages.
-- Run in Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at      TIMESTAMPTZ;
