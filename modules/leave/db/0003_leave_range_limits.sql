-- leave module — bound every date range to at most 366 days (defense in depth).
-- Apply with:  npm run db:run -- modules/leave/db/0003_leave_range_limits.sql
--
-- The server actions already refuse longer ranges; this makes the database refuse
-- them too, so a direct write can't create a company day off spanning centuries
-- (which every page would then have to expand). Safe to re-run.

alter table public.leave_company_days drop constraint if exists leave_company_days_range_max;
alter table public.leave_company_days
  add constraint leave_company_days_range_max check (end_date - start_date < 366);

alter table public.leave_absences drop constraint if exists leave_absences_range_max;
alter table public.leave_absences
  add constraint leave_absences_range_max check (end_date - start_date < 366);
