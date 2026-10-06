/*
# Bypass auth — allow anon access to all tables

## Overview
Temporarily switches all RLS policies from `authenticated` + `auth.uid()` ownership
to `anon, authenticated` with `USING (true)` so the app works without a login
session. This is for demo/preview mode.

## Security
- All tables now allow anon + authenticated full CRUD (public/shared data).
- This is intentionally permissive for the no-auth demo mode.
*/

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['customers','enquiries','quotations','shipments','invoices','activity_log','team_members'];
  verbs text[] := ARRAY['select','insert','update','delete'];
  v text;
  pol_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOREACH v IN ARRAY verbs LOOP
      pol_name := t || '_anon_' || v;
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, t);
      IF v = 'select' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true)', pol_name, t);
      ELSIF v = 'insert' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true)', pol_name, t);
      ELSIF v = 'update' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', pol_name, t);
      ELSIF v = 'delete' THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true)', pol_name, t);
      END IF;
    END LOOP;
  END LOOP;
END $$;
