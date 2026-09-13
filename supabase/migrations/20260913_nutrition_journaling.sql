create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories_target integer not null default 2000,
  protein_g numeric(8, 2) not null default 150,
  carbs_g numeric(8, 2) not null default 200,
  fat_g numeric(8, 2) not null default 70,
  micronutrient_targets_jsonb jsonb not null default '[]'::jsonb,
  activity_multiplier numeric(4, 2) not null default 1.2,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  total_calories integer not null default 0,
  macros_jsonb jsonb not null default '{}'::jsonb,
  micros_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_name text not null,
  portion_amount numeric(10, 2) not null default 1,
  unit text not null default 'serving',
  macros_jsonb jsonb not null default '{}'::jsonb,
  micros_jsonb jsonb not null default '{}'::jsonb
);

create table if not exists public.daily_food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  source_type text not null check (source_type in ('quick_entry', 'recipe', 'food_item')),
  name text not null,
  calories integer not null default 0,
  macros_jsonb jsonb not null default '{}'::jsonb,
  micros_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.nutrition_goals enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.daily_food_logs enable row level security;

create policy "Users manage their nutrition goals" on public.nutrition_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their recipes" on public.recipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their recipe ingredients" on public.recipe_ingredients for all using (exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid())) with check (exists (select 1 from public.recipes where recipes.id = recipe_ingredients.recipe_id and recipes.user_id = auth.uid()));
create policy "Users manage their food logs" on public.daily_food_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);