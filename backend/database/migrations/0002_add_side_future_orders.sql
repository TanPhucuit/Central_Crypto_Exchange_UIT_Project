-- Migration: add `side` column to `future_orders` if missing
-- Review `DESCRIBE future_orders;` before running. This migration assumes
-- the table exists and has a `symbol` column.

-- Run these commands in your MySQL client / phpMyAdmin / TiDB client.

-- 1) Inspect table
-- DESCRIBE future_orders;

-- 2) Add column (run only if DESCRIBE did not show `side`)
ALTER TABLE `future_orders`
  ADD COLUMN `side` ENUM('long','short') NOT NULL DEFAULT 'long' AFTER `symbol`;

-- 3) Verify
-- DESCRIBE future_orders;
