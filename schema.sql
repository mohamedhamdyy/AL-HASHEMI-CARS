-- الصق الكود ده في Supabase > SQL Editor > Run
create table if not exists public.cars (
  id         bigint generated always as identity primary key,
  visible    boolean not null default true,
  type       text not null default 'sale' check (type in ('sale','rent')),
  name       text not null,
  year       text,
  km         integer,
  price      text,
  note       text,
  status     text not null default 'available' check (status in ('available','reserved','sold')),
  image      text,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cars enable row level security;

-- الزوار يقروا بس العربيات الظاهرة. محدش غيرك يقدر يضيف أو يعدّل.
grant select on public.cars to anon, authenticated;
drop policy if exists "public read visible cars" on public.cars;
create policy "public read visible cars" on public.cars
  for select to anon, authenticated using (visible = true);

insert into public.cars (type, name, year, km, image, sort) values
  ('sale', 'فولكس واجن تيجوان', '2021', 45000, 'car-tiguan.jpg', 1),
  ('sale', 'شيري تيجو 7 برو',   '2023', 18000, 'car-tiggo.jpg', 2),
  ('rent', 'سيارة ربع نقل',     '2020', null,  'car-pickup.jpg', 3);
