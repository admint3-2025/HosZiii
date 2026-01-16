-- Migration: Add additional user profile fields
-- Adds: department, phone, location, position, supervisor

-- Add new columns to profiles table
alter table profiles
  add column if not exists department text,
  add column if not exists phone text,
  add column if not exists building text,
  add column if not exists floor text,
  add column if not exists position text,
  add column if not exists supervisor_id uuid references profiles(id) on delete set null;

-- Create index for supervisor lookups
create index if not exists idx_profiles_supervisor on profiles(supervisor_id);

-- Create index for department filtering
create index if not exists idx_profiles_department on profiles(department);

-- Add comment for documentation
comment on column profiles.department is 'Department or area of the user';
comment on column profiles.phone is 'Phone number or extension';
comment on column profiles.building is 'Building or location';
comment on column profiles.floor is 'Floor number';
comment on column profiles.position is 'Job position or title';
comment on column profiles.supervisor_id is 'Direct supervisor user ID';
