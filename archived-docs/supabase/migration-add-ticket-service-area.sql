-- Add service_area to tickets to separate queues (IT vs Mantenimiento vs BEO)

alter table tickets
  add column if not exists service_area text not null default 'it';

-- Backfill BEO tickets
update tickets
set service_area = 'beo'
where is_beo is true;

-- Basic integrity (extensible)
alter table tickets
  drop constraint if exists tickets_service_area_check;

alter table tickets
  add constraint tickets_service_area_check
  check (service_area in ('it','maintenance','beo'));

create index if not exists tickets_service_area_idx on tickets(service_area);
