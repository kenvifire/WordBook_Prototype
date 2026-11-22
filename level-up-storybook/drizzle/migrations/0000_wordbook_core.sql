create type public.app_role as enum ('learner','reviewer','admin');
create type public.version_status as enum ('draft','approved','auto');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(_user_id,'admin') or public.has_role(_user_id,'reviewer') $$;

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.learners (
  id uuid primary key,
  created_at timestamptz not null default now(),
  first_language text,
  goal text,
  age_confirmed boolean not null default false,
  consent_at timestamptz,
  placement_level text
);
grant select, insert, update on public.learners to authenticated;
grant all on public.learners to service_role;
alter table public.learners enable row level security;
create policy "read own learner" on public.learners for select to authenticated using (id = auth.uid());
create policy "insert own learner" on public.learners for insert to authenticated with check (id = auth.uid());
create policy "update own learner" on public.learners for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.learners (id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'learner') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.stories (
  id text primary key,
  title text not null,
  author text not null,
  genre text not null,
  blurb text,
  minutes int,
  source text, license text,
  pd_us boolean not null default false,
  pd_mx boolean not null default false,
  verified_by text, content_note text
);
create table public.story_versions (
  id text primary key,
  story_id text not null references public.stories(id) on delete cascade,
  level text not null,
  status public.version_status not null default 'draft',
  prompt_version text, reviewer text, change_log text,
  created_at timestamptz not null default now()
);
create table public.sections (
  id text primary key,
  version_id text not null references public.story_versions(id) on delete cascade,
  position int not null,
  title text not null default '',
  text text not null,
  grammar_tags text[] not null default '{}'
);
create table public.cards (
  id text primary key,
  section_id text not null references public.sections(id) on delete cascade,
  lemma text not null, sense text, definition text not null,
  translation text, example text, confidence real
);
create index on public.story_versions(story_id);
create index on public.sections(version_id);
create index on public.cards(section_id);

grant select, insert, update, delete on public.stories, public.story_versions, public.sections, public.cards to authenticated;
grant all on public.stories, public.story_versions, public.sections, public.cards to service_role;
alter table public.stories enable row level security;
alter table public.story_versions enable row level security;
alter table public.sections enable row level security;
alter table public.cards enable row level security;

create or replace function public.version_approved(_version_id text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.story_versions where id = _version_id and status = 'approved') $$;

create policy "read approved stories" on public.stories for select to authenticated
  using (public.is_staff(auth.uid()) or exists (select 1 from public.story_versions v where v.story_id = stories.id and v.status = 'approved'));
create policy "read approved versions" on public.story_versions for select to authenticated
  using (public.is_staff(auth.uid()) or status = 'approved');
create policy "read approved sections" on public.sections for select to authenticated
  using (public.is_staff(auth.uid()) or public.version_approved(version_id));
create policy "read approved cards" on public.cards for select to authenticated
  using (public.is_staff(auth.uid()) or exists (select 1 from public.sections s where s.id = cards.section_id and public.version_approved(s.version_id)));

create policy "staff insert stories" on public.stories for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update stories" on public.stories for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff delete stories" on public.stories for delete to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert story_versions" on public.story_versions for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update story_versions" on public.story_versions for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff delete story_versions" on public.story_versions for delete to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert sections" on public.sections for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update sections" on public.sections for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff delete sections" on public.sections for delete to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert cards" on public.cards for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff update cards" on public.cards for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff delete cards" on public.cards for delete to authenticated using (public.is_staff(auth.uid()));

create table public.reviews (id uuid primary key default gen_random_uuid(), learner_id uuid not null default auth.uid(), card_id text not null, rating int not null, ts timestamptz not null default now(), due timestamptz);
create table public.section_attempts (id uuid primary key default gen_random_uuid(), learner_id uuid not null default auth.uid(), section_id text not null, recognition_rate real not null, unlocked_at timestamptz);
create table public.lookups (id uuid primary key default gen_random_uuid(), learner_id uuid not null default auth.uid(), lemma text not null, section_id text, ts timestamptz not null default now());
create table public.events (id uuid primary key default gen_random_uuid(), learner_id uuid not null default auth.uid(), type text not null, entity text, payload jsonb not null default '{}', ts timestamptz not null default now());
create table public.placement_results (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  learner_id uuid not null default auth.uid(), bank_version text, self_band text, level text, assigned_level text,
  range_flag text, confidence real, flags jsonb, composite real, vocab_score real, false_alarm_rate real,
  grammar_score real, grammar_errors jsonb, duration_seconds int, raw_result jsonb);

create index on public.reviews(learner_id);
create index on public.section_attempts(learner_id);
create index on public.lookups(learner_id);
create index on public.events(learner_id);
create index on public.placement_results(learner_id);
grant select, insert on public.reviews, public.section_attempts, public.lookups, public.events, public.placement_results to authenticated;
grant all on public.reviews, public.section_attempts, public.lookups, public.events, public.placement_results to service_role;
alter table public.reviews enable row level security;
alter table public.section_attempts enable row level security;
alter table public.lookups enable row level security;
alter table public.events enable row level security;
alter table public.placement_results enable row level security;
create policy "insert own reviews" on public.reviews for insert to authenticated with check (learner_id = auth.uid());
create policy "read own reviews" on public.reviews for select to authenticated using (learner_id = auth.uid());
create policy "insert own section_attempts" on public.section_attempts for insert to authenticated with check (learner_id = auth.uid());
create policy "read own section_attempts" on public.section_attempts for select to authenticated using (learner_id = auth.uid());
create policy "insert own lookups" on public.lookups for insert to authenticated with check (learner_id = auth.uid());
create policy "read own lookups" on public.lookups for select to authenticated using (learner_id = auth.uid());
create policy "insert own events" on public.events for insert to authenticated with check (learner_id = auth.uid());
create policy "read own events" on public.events for select to authenticated using (learner_id = auth.uid());
create policy "insert own placement_results" on public.placement_results for insert to authenticated with check (learner_id = auth.uid());
create policy "read own placement_results" on public.placement_results for select to authenticated using (learner_id = auth.uid());

create table public.adaptation_runs (id uuid primary key default gen_random_uuid(), version_id text references public.story_versions(id) on delete cascade, gates_json jsonb, cost numeric, latency_ms int, retries int not null default 0, created_at timestamptz not null default now());
grant select, insert, update, delete on public.adaptation_runs to authenticated;
grant all on public.adaptation_runs to service_role;
alter table public.adaptation_runs enable row level security;
create policy "staff all adaptation_runs" on public.adaptation_runs for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Seed: Alice in Wonderland, B1 + B2, approved
insert into public.stories (id,title,author,genre,blurb,minutes,source,license,pd_us,pd_mx) values ('alice','Alice in Wonderland','Lewis Carroll','fantasy','A girl follows a white rabbit into a strange world.',8,'Project Gutenberg','Public domain',true,true);
insert into public.story_versions (id,story_id,level,status,prompt_version) values ('alice-B1','alice','B1','approved','mock-v1'),('alice-B2','alice','B2','approved','mock-v1');
insert into public.sections (id,version_id,position,title,text) values
('alice-B1-s1','alice-B1',1,'Down the Rabbit Hole','Alice was bored by the river. Suddenly a white rabbit ran past her. It looked at a watch and said, "I am late!" Alice followed it into a deep hole.'),
('alice-B1-s2','alice-B1',2,'Drink Me','On a table there was a small bottle. It said "Drink me". Alice drank it and became very small. Now she could fit through the little door.'),
('alice-B1-s3','alice-B1',3,'The Mad Tea Party','Alice found a long table. A Hatter and a March Hare were having tea. They asked silly questions and changed seats all the time.'),
('alice-B2-s1','alice-B2',1,'Down the Rabbit Hole','Alice was growing bored on the riverbank when a white rabbit hurried past, checking a pocket watch and muttering that it was late. Curious, she followed it straight down a deep hole.'),
('alice-B2-s2','alice-B2',2,'Drink Me','On a glass table stood a small bottle labelled "Drink me". Alice sipped it cautiously and began to shrink until she was small enough to fit through the tiny door.'),
('alice-B2-s3','alice-B2',3,'The Mad Tea Party','Alice came upon a long table where the Hatter and the March Hare were having tea, asking riddles with no answers and moving seats whenever their cups were empty.');
insert into public.cards (id,section_id,lemma,definition,example)
select 'alice-'||lv.l||'-s'||w.s||'-c'||w.n, 'alice-'||lv.l||'-s'||w.s, w.lemma, w.def, 'You will see "'||w.lemma||'" in this part of the story.'
from (values ('B1'),('B2')) lv(l)
cross join (values
(1,1,'rabbit','a small animal with long ears'),(1,2,'bored','not interested; with nothing to do'),(1,3,'riverbank','the land next to a river'),(1,4,'suddenly','very quickly, with no warning'),(1,5,'watch','a small clock you wear'),(1,6,'late','after the right time'),(1,7,'follow','go after someone'),(1,8,'hole','an empty space in the ground'),(1,9,'deep','going far down'),(1,10,'fall','go down to the ground'),(1,11,'curious','wanting to know more'),(1,12,'strange','not normal; odd'),(1,13,'tunnel','a long way under the ground'),(1,14,'shelf','a flat board on a wall'),(1,15,'jar','a glass container'),(1,16,'land','come down onto the ground'),(1,17,'hall','a long room with doors'),(1,18,'key','a metal thing that opens a door'),(1,19,'tiny','very, very small'),(1,20,'garden','land with flowers and plants'),
(2,1,'bottle','a container for drinks'),(2,2,'label','a paper with words on a thing'),(2,3,'drink','take liquid into your mouth'),(2,4,'shrink','become smaller'),(2,5,'grow','become bigger'),(2,6,'fit','be the right size'),(2,7,'door','you open it to go in'),(2,8,'cake','a sweet food you bake'),(2,9,'taste','the flavour of food'),(2,10,'tears','water from your eyes when you cry'),(2,11,'pool','a small area of water'),(2,12,'swim','move through water'),(2,13,'mouse','a very small animal'),(2,14,'cry','make tears because you are sad'),(2,15,'careful','thinking about danger'),(2,16,'enormous','very, very big'),(2,17,'ceiling','the top of a room'),(2,18,'glove','you wear it on your hand'),(2,19,'fan','a thing that moves air'),(2,20,'worried','feeling a little afraid'),
(3,1,'hatter','a person who makes hats'),(3,2,'hare','an animal like a big rabbit'),(3,3,'tea','a hot drink'),(3,4,'party','a happy meeting with food'),(3,5,'seat','a place to sit'),(3,6,'riddle','a question that is a game'),(3,7,'answer','what you say to a question'),(3,8,'rude','not polite'),(3,9,'polite','kind and nice in how you talk'),(3,10,'silly','funny and not serious'),(3,11,'cup','you drink from it'),(3,12,'sleepy','wanting to sleep'),(3,13,'pour','make liquid go into a cup'),(3,14,'nonsense','words with no meaning'),(3,15,'queen','a woman who rules a country'),(3,16,'card','a flat piece of paper for games'),(3,17,'rose','a flower'),(3,18,'paint','put colour on something'),(3,19,'angry','very not happy'),(3,20,'wake','stop sleeping')
) w(s,n,lemma,def);