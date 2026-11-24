-- Schedules the reminder function every 5 minutes (it sends only at each device's chosen times).
-- scripts/setup-reminders.mjs writes a filled-in copy to supabase/cron.local.sql — paste THAT one.
-- Requires: Dashboard → Integrations → enable "Cron" (pg_cron) and "pg_net".
create extension if not exists pg_net;

select vault.create_secret('<CRON_SECRET>', 'reminders_cron_secret');

select cron.unschedule('send-reminders') where exists (select 1 from cron.job where jobname = 'send-reminders');
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
