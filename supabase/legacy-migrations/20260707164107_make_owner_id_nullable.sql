/*
# Make owner_id nullable for anon access

## Overview
Drops the NOT NULL constraint and DEFAULT auth.uid() on owner_id columns so
inserts work without an authenticated session (anon mode).

## Changes
- All 7 tables: owner_id is now nullable with no default.
*/

ALTER TABLE customers ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE enquiries ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE enquiries ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE quotations ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE quotations ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE shipments ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE shipments ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE invoices ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE activity_log ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE activity_log ALTER COLUMN owner_id DROP DEFAULT;
ALTER TABLE team_members ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE team_members ALTER COLUMN owner_id DROP DEFAULT;
