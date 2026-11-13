create extension if not exists pgcrypto;

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  format text not null check (format in ('text', 'epub')),
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  section_number int not null,
  start_word_index int not null,
  end_word_index int not null,
  status text not null default 'locked'
    check (status in ('locked', 'ready_to_practice', 'ready_to_read', 'completed')),
  unique (book_id, section_number)
);

create table words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  definition text,
  book_id uuid references books(id) on delete set null,
  repetitions int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 1,
  next_review_date date not null default current_date,
  last_rating text check (last_rating in ('again', 'hard', 'good', 'easy')),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

create table section_words (
  section_id uuid not null references sections(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  primary key (section_id, word_id)
);

alter table books enable row level security;
alter table sections enable row level security;
alter table words enable row level security;
alter table section_words enable row level security;

create policy "own books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own words" on words for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sections via owned book" on sections for all
  using (exists (select 1 from books where books.id = sections.book_id and books.user_id = auth.uid()))
  with check (exists (select 1 from books where books.id = sections.book_id and books.user_id = auth.uid()));
create policy "section_words via owned section" on section_words for all
  using (exists (select 1 from sections join books on books.id = sections.book_id
                 where sections.id = section_words.section_id and books.user_id = auth.uid()))
  with check (exists (select 1 from sections join books on books.id = sections.book_id
                       where sections.id = section_words.section_id and books.user_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('epubs', 'epubs', false)
on conflict (id) do nothing;
create policy "own epub uploads" on storage.objects for all
  using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);
