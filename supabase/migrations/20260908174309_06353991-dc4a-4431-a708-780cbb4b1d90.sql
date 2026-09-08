
-- ============ ENUM + ROLES ============
CREATE TYPE public.app_role AS ENUM ('ADMIN','DISTRICT_SUPERVISOR','FACILITY_STAFF','REFERRAL_WORKER');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  facility_id uuid,
  district text,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- ============ FACILITIES / SERVICES ============
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('PHC','CHC','DISTRICT_HOSPITAL')),
  district text NOT NULL,
  address text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilities TO authenticated;
GRANT SELECT ON public.facilities TO anon;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities readable" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "facilities admin write" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services readable" ON public.services FOR SELECT USING (true);
CREATE POLICY "services admin write" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

CREATE TABLE public.facility_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_registered boolean NOT NULL DEFAULT true,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, service_id)
);
CREATE INDEX idx_fs_service ON public.facility_services(service_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_services TO authenticated;
GRANT SELECT ON public.facility_services TO anon;
GRANT ALL ON public.facility_services TO service_role;
ALTER TABLE public.facility_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs readable" ON public.facility_services FOR SELECT USING (true);
CREATE POLICY "fs staff update" ON public.facility_services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fs admin insert" ON public.facility_services FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'ADMIN'));
CREATE POLICY "fs admin delete" ON public.facility_services FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN'));

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL UNIQUE,
  patient_ref text NOT NULL,
  origin_facility_id uuid NOT NULL REFERENCES public.facilities(id),
  destination_facility_id uuid NOT NULL REFERENCES public.facilities(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  urgency text NOT NULL DEFAULT 'ROUTINE' CHECK (urgency IN ('ROUTINE','URGENT','EMERGENCY')),
  max_distance_km numeric,
  notes text,
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','ACCEPTED','ARRIVED','SERVICE_PROVIDED','SERVICE_UNAVAILABLE','CANCELLED','COMPLETED')),
  token text NOT NULL UNIQUE,
  selected_eri numeric,
  selected_distance_km numeric,
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ref_dest ON public.referrals(destination_facility_id);
CREATE INDEX idx_ref_created ON public.referrals(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals readable" ON public.referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "referrals insert" ON public.referrals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "referrals update" ON public.referrals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.referral_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  note text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rsh_ref ON public.referral_status_history(referral_id);
GRANT SELECT, INSERT ON public.referral_status_history TO authenticated;
GRANT ALL ON public.referral_status_history TO service_role;
ALTER TABLE public.referral_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rsh readable" ON public.referral_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "rsh insert" ON public.referral_status_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.referral_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL UNIQUE REFERENCES public.referrals(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('SERVICE_PROVIDED','SERVICE_UNAVAILABLE')),
  notes text,
  recorded_by uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referral_outcomes TO authenticated;
GRANT ALL ON public.referral_outcomes TO service_role;
ALTER TABLE public.referral_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outcomes readable" ON public.referral_outcomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "outcomes insert" ON public.referral_outcomes FOR INSERT TO authenticated WITH CHECK (true);

-- ============ EVIDENCE ============
CREATE TABLE public.evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  observation text NOT NULL CHECK (observation IN ('AVAILABLE','UNAVAILABLE','TEMPORARILY_BLOCKED','SERVICE_PROVIDED')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('FACILITY_STAFF','REFERRAL_OUTCOME','DISTRICT_SUPERVISOR','OFFLINE_SYNC','DEMO_SEED')),
  notes text,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  is_duplicate boolean NOT NULL DEFAULT false,
  duplicate_of uuid REFERENCES public.evidence_events(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ev_fs ON public.evidence_events(facility_id, service_id, observed_at DESC);
GRANT SELECT, INSERT ON public.evidence_events TO authenticated;
GRANT ALL ON public.evidence_events TO service_role;
ALTER TABLE public.evidence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence readable" ON public.evidence_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "evidence insert" ON public.evidence_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.evidence_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  evidence_a uuid NOT NULL REFERENCES public.evidence_events(id) ON DELETE CASCADE,
  evidence_b uuid NOT NULL REFERENCES public.evidence_events(id) ON DELETE CASCADE,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  note text,
  UNIQUE (evidence_a, evidence_b)
);
GRANT SELECT, INSERT, UPDATE ON public.evidence_conflicts TO authenticated;
GRANT ALL ON public.evidence_conflicts TO service_role;
ALTER TABLE public.evidence_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conflicts readable" ON public.evidence_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "conflicts insert" ON public.evidence_conflicts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "conflicts update" ON public.evidence_conflicts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ NOTIFICATIONS / AUDIT / SETTINGS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  role_scope public.app_role,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications readable" ON public.notifications FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notifications insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid()) WITH CHECK (true);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_email text,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  result text NOT NULL DEFAULT 'SUCCESS',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit readable by supervisors and admins" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN') OR public.has_role(auth.uid(),'DISTRICT_SUPERVISOR'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;
GRANT SELECT ON public.system_settings TO anon;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'ADMIN')) WITH CHECK (public.has_role(auth.uid(),'ADMIN'));

INSERT INTO public.system_settings (key, value, description) VALUES
 ('freshness_thresholds', '{"very_fresh_min":30,"fresh_min":120,"aging_min":720}', 'Evidence freshness thresholds in minutes'),
 ('ranking_weights', '{"eri":0.7,"distance":0.3,"distance_normalizer_km":40}', 'Ranking weights for evidence vs distance'),
 ('demo_mode', '{"enabled":true}', 'Demo environment banner');

-- ============ DEMO DATA (fictional) ============
INSERT INTO public.services (code, name, description) VALUES
 ('XRAY','X-Ray','Plain radiography'),
 ('USG','Ultrasound','Ultrasonography'),
 ('BLOOD','Blood Test','Basic laboratory blood investigations'),
 ('CT','CT Scan','Computed tomography'),
 ('MRI','MRI','Magnetic resonance imaging'),
 ('DIALYSIS','Dialysis','Haemodialysis service'),
 ('ECG','ECG','Electrocardiography'),
 ('OT','Emergency Surgery','Emergency operation theatre availability'),
 ('BLOODBANK','Blood Bank','Blood component availability'),
 ('MATERNITY','Maternity Care','Institutional delivery services');

INSERT INTO public.facilities (code, name, type, district, address, latitude, longitude, contact) VALUES
 ('DH-CENTRAL','Central District Hospital','DISTRICT_HOSPITAL','Sagarpur','Hospital Road, Sagarpur City',23.2599,77.4126,'+91-90000-10001'),
 ('DH-NORTH','North District Hospital','DISTRICT_HOSPITAL','Sagarpur','NH-12 Bypass, Rampura',23.3401,77.4502,'+91-90000-10002'),
 ('CHC-NORTH','CHC North','CHC','Sagarpur','Block Road, Rampura',23.3110,77.4310,'+91-90000-10003'),
 ('CHC-SOUTH','CHC South','CHC','Sagarpur','Market Chowk, Devgarh',23.1902,77.3805,'+91-90000-10004'),
 ('CHC-EAST','CHC East','CHC','Sagarpur','Station Road, Beltola',23.2705,77.5121,'+91-90000-10005'),
 ('CHC-WEST','CHC West','CHC','Sagarpur','Tehsil Road, Karondi',23.2450,77.3100,'+91-90000-10006'),
 ('CHC-RIVER','CHC Riverside','CHC','Sagarpur','Ghat Road, Nadipar',23.1550,77.4650,'+91-90000-10007'),
 ('PHC-01','PHC Bansagar','PHC','Sagarpur','Village Bansagar',23.3620,77.3805,'+91-90000-10008'),
 ('PHC-02','PHC Kotra','PHC','Sagarpur','Village Kotra',23.2210,77.2705,'+91-90000-10009'),
 ('PHC-03','PHC Malhargarh','PHC','Sagarpur','Village Malhargarh',23.1205,77.3410,'+91-90000-10010'),
 ('PHC-04','PHC Dhanpur','PHC','Sagarpur','Village Dhanpur',23.3005,77.5605,'+91-90000-10011'),
 ('PHC-05','PHC Neempani','PHC','Sagarpur','Village Neempani',23.1810,77.5410,'+91-90000-10012'),
 ('PHC-06','PHC Suraj Tola','PHC','Sagarpur','Village Suraj Tola',23.4102,77.4901,'+91-90000-10013'),
 ('PHC-07','PHC Amjhera','PHC','Sagarpur','Village Amjhera',23.0905,77.4205,'+91-90000-10014'),
 ('PHC-08','PHC Barwani Khurd','PHC','Sagarpur','Village Barwani Khurd',23.3305,77.2405,'+91-90000-10015');

-- registered capability: district hospitals everything, CHCs mid-tier, PHCs basic
INSERT INTO public.facility_services (facility_id, service_id, is_registered)
SELECT f.id, s.id, true FROM public.facilities f CROSS JOIN public.services s
WHERE (f.type = 'DISTRICT_HOSPITAL')
   OR (f.type = 'CHC' AND s.code IN ('XRAY','USG','BLOOD','ECG','MATERNITY','OT'))
   OR (f.type = 'PHC' AND s.code IN ('BLOOD','ECG','MATERNITY'));

-- a couple of currently blocked service registrations
UPDATE public.facility_services fs SET is_blocked = true, blocked_reason = 'Equipment under repair'
FROM public.facilities f, public.services s
WHERE fs.facility_id = f.id AND fs.service_id = s.id AND f.code = 'CHC-WEST' AND s.code = 'XRAY';
UPDATE public.facility_services fs SET is_blocked = true, blocked_reason = 'Radiographer on leave'
FROM public.facilities f, public.services s
WHERE fs.facility_id = f.id AND fs.service_id = s.id AND f.code = 'PHC-08' AND s.code = 'ECG';

-- evidence ledger: deterministic pseudo-random spread over the last 3 days
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes)
SELECT f.id, s.id,
  CASE WHEN (n + length(f.code) + length(s.code)) % 7 IN (0,1,2,3) THEN 'AVAILABLE'
       WHEN (n + length(f.code) + length(s.code)) % 7 IN (4,5) THEN 'UNAVAILABLE'
       ELSE 'TEMPORARILY_BLOCKED' END,
  now() - make_interval(mins => ((n * 37 + length(f.code) * 11 + length(s.code) * 5) % 4000)),
  CASE WHEN n % 5 = 0 THEN 'DISTRICT_SUPERVISOR' ELSE 'FACILITY_STAFF' END,
  'Seeded demo observation'
FROM public.facilities f
JOIN public.facility_services fs ON fs.facility_id = f.id
JOIN public.services s ON s.id = fs.service_id
CROSS JOIN generate_series(1,2) AS n
WHERE s.code IN ('XRAY','USG','BLOOD','ECG')
LIMIT 160;

-- a deliberate fresh conflicting pair on CHC North / X-Ray (the demo story)
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes)
SELECT f.id, s.id, 'AVAILABLE', now() - interval '55 minutes', 'FACILITY_STAFF', 'X-ray running normally'
FROM public.facilities f, public.services s WHERE f.code='CHC-NORTH' AND s.code='XRAY';
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes)
SELECT f.id, s.id, 'UNAVAILABLE', now() - interval '30 minutes', 'FACILITY_STAFF', 'Equipment down'
FROM public.facilities f, public.services s WHERE f.code='CHC-NORTH' AND s.code='XRAY';
INSERT INTO public.evidence_conflicts (facility_id, service_id, evidence_a, evidence_b, note)
SELECT a.facility_id, a.service_id, a.id, b.id, 'Overlapping reports disagree on current state'
FROM public.evidence_events a JOIN public.evidence_events b
  ON a.facility_id=b.facility_id AND a.service_id=b.service_id
JOIN public.facilities f ON f.id=a.facility_id JOIN public.services s ON s.id=a.service_id
WHERE f.code='CHC-NORTH' AND s.code='XRAY' AND a.notes='X-ray running normally' AND b.notes='Equipment down';

-- strong fresh positive evidence for Central District Hospital / X-Ray
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes)
SELECT f.id, s.id, v.obs, now() - make_interval(mins => v.age), v.src, 'Seeded demo observation'
FROM public.facilities f, public.services s,
 (VALUES ('AVAILABLE',20,'FACILITY_STAFF'),('AVAILABLE',75,'FACILITY_STAFF'),
         ('SERVICE_PROVIDED',110,'REFERRAL_OUTCOME'),('AVAILABLE',150,'DISTRICT_SUPERVISOR')) AS v(obs,age,src)
WHERE f.code='DH-CENTRAL' AND s.code='XRAY';

-- duplicate reports (same facility/service/observation within a few minutes)
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes, is_duplicate, duplicate_of)
SELECT e.facility_id, e.service_id, e.observation, e.observed_at + interval '3 minutes', e.source, 'Duplicate demo report', true, e.id
FROM public.evidence_events e
JOIN public.facilities f ON f.id = e.facility_id
WHERE f.code IN ('CHC-SOUTH','CHC-EAST') LIMIT 6;

-- referrals: 55 across the last 30 days with outcomes
INSERT INTO public.referrals (referral_code, patient_ref, origin_facility_id, destination_facility_id, service_id,
  urgency, max_distance_km, status, token, selected_eri, selected_distance_km, evidence_snapshot, created_at, updated_at)
SELECT
  'REF-2026-' || lpad(n::text, 6, '0'),
  'PAT-' || upper(substr(md5(n::text), 1, 5)),
  o.id, d.id, s.id,
  (ARRAY['ROUTINE','URGENT','EMERGENCY'])[1 + (n % 3)],
  40,
  CASE WHEN n % 9 = 0 THEN 'SERVICE_UNAVAILABLE' WHEN n % 9 = 1 THEN 'CREATED' WHEN n % 9 = 2 THEN 'ACCEPTED' ELSE 'SERVICE_PROVIDED' END,
  encode(gen_random_bytes(16),'hex'),
  round((0.30 + ((n * 13) % 60) / 100.0)::numeric, 2),
  round((3 + ((n * 7) % 35))::numeric, 1),
  '{"seeded":true}'::jsonb,
  now() - make_interval(mins => (n * 610) % 43200),
  now() - make_interval(mins => (n * 610) % 43200)
FROM generate_series(1,55) AS n
JOIN LATERAL (SELECT id FROM public.facilities WHERE type='PHC' ORDER BY code OFFSET (n % 8) LIMIT 1) o ON true
JOIN LATERAL (SELECT id FROM public.facilities WHERE type <> 'PHC' ORDER BY code OFFSET (n % 7) LIMIT 1) d ON true
JOIN LATERAL (SELECT id FROM public.services WHERE code IN ('XRAY','USG','BLOOD','ECG') ORDER BY code OFFSET (n % 4) LIMIT 1) s ON true;

INSERT INTO public.referral_status_history (referral_id, from_status, to_status, changed_at, note)
SELECT r.id, NULL, 'CREATED', r.created_at, 'Referral created (demo seed)' FROM public.referrals r;
INSERT INTO public.referral_status_history (referral_id, from_status, to_status, changed_at, note)
SELECT r.id, 'CREATED', r.status, r.created_at + interval '90 minutes', 'Demo seed progression'
FROM public.referrals r WHERE r.status <> 'CREATED';

INSERT INTO public.referral_outcomes (referral_id, outcome, notes, recorded_at)
SELECT r.id, r.status, 'Demo seed outcome', r.created_at + interval '2 hours'
FROM public.referrals r WHERE r.status IN ('SERVICE_PROVIDED','SERVICE_UNAVAILABLE');

INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes, referral_id)
SELECT r.destination_facility_id, r.service_id, r.status, r.created_at + interval '2 hours', 'REFERRAL_OUTCOME', 'Outcome converted to evidence', r.id
FROM public.referrals r WHERE r.status = 'SERVICE_PROVIDED';
INSERT INTO public.evidence_events (facility_id, service_id, observation, observed_at, source, notes, referral_id)
SELECT r.destination_facility_id, r.service_id, 'UNAVAILABLE', r.created_at + interval '2 hours', 'REFERRAL_OUTCOME', 'Outcome converted to evidence', r.id
FROM public.referrals r WHERE r.status = 'SERVICE_UNAVAILABLE';

INSERT INTO public.notifications (role_scope, kind, title, body)
VALUES ('DISTRICT_SUPERVISOR','CONFLICT','Evidence conflict detected','CHC North / X-Ray has overlapping reports that disagree.'),
       ('ADMIN','SYSTEM','Demo environment ready','Fictional demo data has been loaded for the SIH prototype.');
