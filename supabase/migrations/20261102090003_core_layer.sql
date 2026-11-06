-- =============================================================================
-- 0003 · CORE conformed canonical model
-- -----------------------------------------------------------------------------
-- The "truth" layer. Everything resolves through core.person so a student, a
-- graduate, and a staff researcher are ONE entity across all six sources.
-- SCD Type-2 (valid_from/valid_to/is_current) wherever institutional reporting
-- needs point-in-time history ("how many students in School of Medicine in 2024").
-- =============================================================================

-- ─────────────────────────────── People ────────────────────────────────────
create table core.person (
  person_id      bigint generated always as identity primary key,
  full_name      text not null,
  display_name   text,
  primary_email  text,
  gender         text,                         -- nullable; sourced from SIS where available
  date_of_birth  date,
  kind           text[] not null default '{}', -- {'researcher','student','staff','alumni'}
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_person_updated before update on core.person
  for each row execute function core.set_updated_at();
create index person_name_trgm_idx on core.person using gin (full_name extensions.gin_trgm_ops);

-- Identity crosswalk: the mechanism that defeats the "same person, N ids" problem.
create table core.person_identifier (
  person_id    bigint not null references core.person (person_id) on delete cascade,
  scheme       text   not null references core.identifier_scheme (scheme),
  value        text   not null,
  confidence   numeric(3,2) not null default 1.00,  -- < 1.0 for fuzzy-matched links
  source       text   not null,                     -- which ETL job asserted this link
  created_at   timestamptz not null default now(),
  primary key (scheme, value)
);
create index person_identifier_person_idx on core.person_identifier (person_id);

-- ─────────────────────────── Org structure (SCD2) ───────────────────────────
create table core.institution (
  institution_id bigint generated always as identity primary key,
  name           text not null,
  ror_id         text,
  country        text,
  is_unza        boolean not null default false
);

create table core.department (
  department_sk  bigint generated always as identity primary key,  -- surrogate (SCD2)
  department_id  text not null,          -- natural/business key from SIS
  name           text not null,
  school         text,
  valid_from     date not null default date '1900-01-01',
  valid_to       date,
  is_current     boolean not null default true
);
create unique index department_current_idx on core.department (department_id) where is_current;

-- ───────────────────────── Affiliations (SCD2) ──────────────────────────────
create table core.person_affiliation (
  person_id      bigint not null references core.person (person_id) on delete cascade,
  institution_id bigint not null references core.institution (institution_id),
  department_id  text,
  role           text,                   -- 'student','lecturer','researcher','professor'
  valid_from     date not null,
  valid_to       date,
  is_current     boolean not null default true,
  primary key (person_id, institution_id, valid_from)
);

-- ──────────────────────── Student status (SCD2) ─────────────────────────────
-- Point-in-time student state. The single decision that makes year-over-year
-- institutional reports correct instead of lossy.
create table core.student_enrollment_status (
  person_id      bigint not null references core.person (person_id) on delete cascade,
  student_number text not null,
  program        text,
  study_level    text,                   -- 'undergraduate','masters','phd'
  year_of_study  int,
  status         text,                   -- 'active','deferred','graduated','withdrawn','excluded'
  valid_from     date not null,
  valid_to       date,
  is_current     boolean not null default true,
  primary key (person_id, valid_from)
);
create unique index student_status_current_idx
  on core.student_enrollment_status (person_id) where is_current;

-- ─────────────────────────────── Teaching ───────────────────────────────────
create table core.academic_term (
  term_id        bigint generated always as identity primary key,
  academic_year  int not null,
  semester       int not null check (semester in (1,2,3)),
  start_date     date,
  end_date       date,
  unique (academic_year, semester)
);

create table core.course (
  course_id      bigint generated always as identity primary key,
  code           text not null,
  title          text not null,
  department_id  text,
  credits        numeric(4,1),
  moodle_id      bigint,                 -- crosswalk to Moodle
  sis_id         text,                   -- crosswalk to SIS
  unique (code)
);

create table core.enrollment (
  enrollment_id  bigint generated always as identity primary key,
  person_id      bigint not null references core.person (person_id) on delete cascade,
  course_id      bigint not null references core.course (course_id),
  term_id        bigint not null references core.academic_term (term_id),
  status         text,                   -- 'enrolled','completed','dropped','failed'
  grade          text,                   -- raw grade symbol (A, B+, ...)
  grade_points   numeric(3,2),           -- normalized to GPA scale
  credits        numeric(4,1),
  enrolled_on    date,
  unique (person_id, course_id, term_id)
);

-- ───────────────────── LMS activity (partitioned) ───────────────────────────
-- Highest-volume table. Range-partitioned by month; pg_partman maintains future
-- partitions (see 0006). Partitioning keeps nightly loads and dashboards fast.
create table core.lms_activity (
  activity_id    bigint generated always as identity,
  person_id      bigint not null,
  course_id      bigint,
  term_id        bigint,
  event_type     text not null,          -- 'course_viewed','resource_viewed','quiz_attempt','forum_post','submission'
  component      text,                   -- Moodle component
  event_time     timestamptz not null,
  duration_sec   int,
  primary key (activity_id, event_time)  -- partition key must be in PK
) partition by range (event_time);

-- A bootstrap partition so loads work before pg_partman runs; partman takes over.
create table core.lms_activity_default partition of core.lms_activity default;
create index lms_activity_person_idx on core.lms_activity (person_id, event_time desc);
create index lms_activity_course_idx on core.lms_activity (course_id, event_time desc);

-- ──────────────────────── Research / bibliometrics ──────────────────────────
create table core.venue (
  venue_id       bigint generated always as identity primary key,
  name           text not null,
  issn           text,
  publisher      text,
  is_unza_journal boolean not null default false  -- journals.unza.zm titles
);

create table core.publication (
  publication_id bigint generated always as identity primary key,
  title          text not null,
  type           text,                   -- 'journal-article','thesis','conference-paper','book-chapter'
  pub_date       date,
  pub_year       int,
  venue_id       bigint references core.venue (venue_id),
  is_open_access boolean,
  cited_by_count int default 0,          -- denormalized convenience (OpenAlex)
  abstract       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_publication_updated before update on core.publication
  for each row execute function core.set_updated_at();
create index publication_year_idx on core.publication (pub_year);
create index publication_title_trgm_idx on core.publication using gin (title extensions.gin_trgm_ops);

create table core.publication_identifier (
  publication_id bigint not null references core.publication (publication_id) on delete cascade,
  scheme         text not null references core.identifier_scheme (scheme),
  value          text not null,
  source         text not null,
  primary key (scheme, value)
);
create index publication_identifier_pub_idx on core.publication_identifier (publication_id);

-- Links people to publications (who wrote what). Many-to-many with ordering.
create table core.authorship (
  publication_id   bigint not null references core.publication (publication_id) on delete cascade,
  person_id        bigint not null references core.person (person_id) on delete cascade,
  author_position  int,
  is_corresponding boolean default false,
  raw_author_name  text,                 -- name as printed, for audit of the match
  primary key (publication_id, person_id)
);

-- Directional citation edges between publications we hold.
create table core.citation (
  citing_publication_id bigint not null references core.publication (publication_id) on delete cascade,
  cited_publication_id  bigint not null references core.publication (publication_id) on delete cascade,
  source                text not null,
  primary key (citing_publication_id, cited_publication_id)
);
