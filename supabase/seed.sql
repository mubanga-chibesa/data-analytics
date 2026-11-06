-- =============================================================================
-- seed.sql · Synthetic demo data so the dashboard renders end-to-end.
-- Safe to run repeatedly on an empty dev project. NOT for production.
-- Load with:  psql "$DATABASE_URL" -f supabase/seed.sql  &&  refresh marts.
-- =============================================================================

begin;

-- Institutions / departments ------------------------------------------------
insert into core.institution (name, ror_id, country, is_unza)
values ('University of Zambia', 'https://ror.org/03zj4c476', 'Zambia', true);

insert into core.department (department_id, name, school) values
  ('CS',   'Computer Science',          'School of Natural Sciences'),
  ('MED',  'Medicine',                  'School of Medicine'),
  ('ECON', 'Economics',                 'School of Humanities & Social Sciences'),
  ('ENG',  'Electrical Engineering',    'School of Engineering')
on conflict do nothing;

-- Terms ----------------------------------------------------------------------
insert into core.academic_term (academic_year, semester, start_date, end_date) values
  (2024, 1, '2024-02-01', '2024-06-15'),
  (2024, 2, '2024-08-01', '2024-12-15'),
  (2025, 1, '2025-02-01', '2025-06-15'),
  (2025, 2, '2025-08-01', '2025-12-15')
on conflict do nothing;

-- Courses --------------------------------------------------------------------
insert into core.course (code, title, department_id, credits, moodle_id) values
  ('CS101',  'Introduction to Programming', 'CS',   10, 1001),
  ('CS210',  'Data Structures',             'CS',   10, 1002),
  ('MED110', 'Human Anatomy',               'MED',  15, 1003),
  ('ECON101','Microeconomics',              'ECON', 10, 1004),
  ('ENG220', 'Circuit Theory',              'ENG',  12, 1005)
on conflict (code) do nothing;

-- People: 200 synthetic students + a handful of researchers ------------------
insert into core.person (full_name, display_name, primary_email, gender, kind)
select
  'Student ' || g,
  'Student ' || g,
  'student' || g || '@edu.unza.zm',
  case when g % 2 = 0 then 'F' else 'M' end,
  array['student']
from generate_series(1, 200) g;

-- Student status (SCD2 current rows), spread across departments & levels -----
insert into core.student_enrollment_status
  (person_id, student_number, program, study_level, year_of_study, status, valid_from, is_current)
select
  p.person_id,
  '2023' || lpad(p.person_id::text, 5, '0'),
  (array['BSc Computer Science','MBChB','BA Economics','BEng Electrical'])[1 + (p.person_id % 4)],
  (array['undergraduate','undergraduate','masters','phd'])[1 + (p.person_id % 4)],
  1 + (p.person_id % 4),
  (array['active','active','active','deferred','graduated','withdrawn'])[1 + (p.person_id % 6)],
  '2024-02-01', true
from core.person p
where 'student' = any(p.kind);

-- Enrollments: each student in 1-2 courses per term, with grades -------------
insert into core.enrollment
  (person_id, course_id, term_id, status, grade, grade_points, credits, enrolled_on)
select
  p.person_id,
  c.course_id,
  t.term_id,
  (array['completed','completed','completed','dropped','failed'])[1 + ((p.person_id + c.course_id) % 5)],
  (array['A','B+','B','C','D'])[1 + ((p.person_id + t.term_id) % 5)],
  (array[4.0,3.5,3.0,2.0,1.0])[1 + ((p.person_id + t.term_id) % 5)],
  c.credits,
  t.start_date
from core.person p
join core.course c on (c.department_id = (
    select program_dept from (values
      (0,'CS'),(1,'MED'),(2,'ECON'),(3,'ENG')
    ) as m(k, program_dept) where k = p.person_id % 4))
join core.academic_term t on true
where 'student' = any(p.kind) and (p.person_id + c.course_id) % 2 = 0
on conflict (person_id, course_id, term_id) do nothing;

-- LMS activity: random-ish events for enrolled students ----------------------
insert into core.lms_activity (person_id, course_id, term_id, event_type, event_time, duration_sec)
select
  e.person_id,
  e.course_id,
  e.term_id,
  (array['course_viewed','resource_viewed','quiz_attempt','forum_post','submission'])[1 + (n % 5)],
  t.start_date::timestamptz + ((e.person_id * 7 + n * 13) % 100 || ' days')::interval
                            + ((n * 37) % 24 || ' hours')::interval,
  60 + (n * 17) % 1800
from core.enrollment e
join core.academic_term t on t.term_id = e.term_id
cross join generate_series(1, 8) n
where t.start_date >= '2026-09-01'  -- keep in current partitions
   or t.start_date <  '2026-09-01'; -- (default partition catches the rest)

-- Research: a few publications authored by the first 20 people ----------------
insert into core.venue (name, issn, publisher, is_unza_journal) values
  ('Zambia Journal of Science',    '1234-5678', 'UNZA Press', true),
  ('Medical Journal of Zambia',    '2345-6789', 'UNZA Press', true),
  ('International Journal of CS',   '3456-7890', 'Elsevier',   false);

insert into core.publication (title, type, pub_date, pub_year, venue_id, is_open_access, cited_by_count)
select
  'Research Paper ' || g,
  'journal-article',
  make_date(2023 + (g % 3), 1 + (g % 12), 1),
  2023 + (g % 3),
  1 + (g % 3),
  g % 2 = 0,
  (g * 7) % 50
from generate_series(1, 40) g;

insert into core.authorship (publication_id, person_id, author_position, is_corresponding)
select pub.publication_id, 1 + (pub.publication_id % 20), 1, true
from core.publication pub;

-- Give the first 20 people a researcher affiliation so publications map to depts
insert into core.person_affiliation (person_id, institution_id, department_id, role, valid_from, is_current)
select p.person_id, 1,
       (array['CS','MED','ECON','ENG'])[1 + (p.person_id % 4)],
       'researcher', '2023-01-01', true
from core.person p where p.person_id <= 20
on conflict do nothing;

commit;

-- Refresh marts so dashboards see the seeded data.
select mart.refresh_all(false);
