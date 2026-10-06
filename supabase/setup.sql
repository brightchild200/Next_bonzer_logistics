-- Bonzer Logistics CS module — Supabase setup
-- Run in: Supabase Dashboard -> SQL Editor.  Safe to re-run.
--
-- SECURITY NOTE: this app has no login yet, so it talks to Supabase with the
-- public anon key. The policies below therefore grant the *anon* role access.
-- That is fine for a private/internal deployment, but anyone who has the anon
-- key (it ships in the browser bundle) can read/write these tables. Before
-- exposing the app publicly, add Supabase Auth and change `to anon` to
-- `to authenticated`.

-- 1) Private storage bucket for customer KYC files ---------------------------
insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='cs_docs_select') then
    create policy cs_docs_select on storage.objects for select to anon using (bucket_id = 'customer-documents');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='cs_docs_insert') then
    create policy cs_docs_insert on storage.objects for insert to anon with check (bucket_id = 'customer-documents');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='cs_docs_delete') then
    create policy cs_docs_delete on storage.objects for delete to anon using (bucket_id = 'customer-documents');
  end if;
end $$;

-- 2) Table policies — ONLY needed if Row Level Security is enabled -----------
-- Symptom without them: the app connects but every list is empty.
do $$
declare
  t text;
  read_only text[] := array['customer_master','description_master','sales_persons','mode_master','port_master','companies'];
  read_write text[] := array['enquiries','enquiry_charges','jobs','customer_documents'];
begin
  foreach t in array read_only loop
    if to_regclass('public.'||t) is not null
       and not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cs_anon_select') then
      execute format('create policy cs_anon_select on public.%I for select to anon using (true)', t);
    end if;
  end loop;
  foreach t in array read_write loop
    if to_regclass('public.'||t) is not null
       and not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='cs_anon_all') then
      execute format('create policy cs_anon_all on public.%I for all to anon using (true) with check (true)', t);
    end if;
  end loop;
end $$;
