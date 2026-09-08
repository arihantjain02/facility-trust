# Reliable Referrals

I have attached our official SIH 2026 RELI-REF presentation. Treat this PPT as the primary source of truth for the product concept, terminology, workflow, problem statement, features, safety boundaries, and evaluation approach. Analyze it before building anything. Do not invent features that contradict the PPT. Use the following implementation specification to turn the concept into a fully working full-stack web application.




You are a senior full-stack architect, backend engineer, frontend engineer, database engineer, UI/UX designer, QA engineer, and DevOps engineer.

Build a COMPLETE, FULLY WORKING, PRODUCTION-STYLE full-stack web application called:

RELI-REF

Tagline:

"Helping patients reach the right public facility with better information."

Project:

Smart India Hackathon 2026

Problem Statement ID: 26133

Team: Tech Alchemists

Domain: MedTech / BioTech / HealthTech

IMPORTANT:

This is an SIH final-round prototype.

DO NOT create only a frontend.

DO NOT create a static mockup.

DO NOT create fake buttons.

DO NOT use hardcoded data for core functionality.

Build a real integrated system with:

Frontend + Backend + PostgreSQL Database + Authentication + REST APIs + Business Logic + Evidence Engine + Referral Workflow + QR/Referral Token + Analytics + Validation + Demo Data + Offline Queue + Testing + Docker + Documentation.

The entire project must run locally with one clear setup process and must be deployable to AWS EC2.

========================================================

1. UNDERSTAND THE PRODUCT CORRECTLY

========================================================

The central problem:

A public healthcare facility may be officially registered for a service, but that does not prove that the service is actually available at the time a patient is referred.

Current journey:

Referral

→ Travel

→ Service unavailable

→ Return / repeat trip

→ Delay

RELI-REF aims to reduce avoidable referral failures.

The product must NOT claim to:

- increase healthcare capacity

- diagnose patients

- recommend treatment

- make clinical decisions

- guarantee service availability

The product DOES:

- collect observations

- attach timestamps

- record evidence sources

- detect stale information

- detect duplicate reports

- detect conflicting evidence

- summarize evidence

- identify blocked/ineligible facilities

- calculate candidate evidence reliability

- rank eligible facilities

- include geographic distance

- create referrals

- generate secure referral tokens/QR codes

- record referral outcomes

- convert outcomes into new evidence

- improve future referral choices

Core principle:

"Registration is not proof of current availability."

The application must clearly distinguish:

REGISTERED CAPABILITY

vs

OBSERVED CURRENT EVIDENCE

vs

REFERRAL OUTCOME

========================================================

2. CORE WORKFLOW

========================================================

Implement this complete workflow:

RECORD

→ CHECK

→ SUMMARISE

→ DECIDE

→ RANK

→ LEARN

Record:

Store facility/service events with timestamps.

Check:

- evidence freshness

- duplicate reports

- conflicting reports

- source

- time

Summarise:

Calculate candidate ERI.

Decide:

Remove ineligible or currently blocked facilities.

Rank:

Rank remaining facilities using evidence + geographic distance.

Learn:

Referral outcome becomes new evidence.

This workflow must actually execute through the backend and database.

========================================================

3. TECHNOLOGY STACK

========================================================

Frontend:

- Next.js

- TypeScript

- Tailwind CSS

- shadcn/ui

- Lucide icons

- Recharts

- React Hook Form

- Zod

Backend:

- Python

- FastAPI

- Pydantic

- SQLAlchemy

- Alembic

Database:

- PostgreSQL

Authentication:

- JWT access tokens

- Secure password hashing

- Role-based authorization

Infrastructure:

- Docker

- Docker Compose

- Nginx

- Environment variables

Testing:

- Pytest

- Frontend unit/component tests where appropriate

- API tests

========================================================

4. USER ROLES

========================================================

Implement four authenticated operational roles:

1. REFERRAL_WORKER

2. FACILITY_STAFF

3. DISTRICT_SUPERVISOR

4. ADMIN

Optional read-only PATIENT/RECIPIENT role may be implemented only if useful for the demo, but do not turn the application into a patient hospital-management system.

ROLE PERMISSIONS

REFERRAL_WORKER:

- login

- create referral

- search services

- view eligible facilities

- view evidence

- view ERI

- compare facilities

- select facility

- create referral

- generate QR/token

- update referral status

- record outcome when appropriate

FACILITY_STAFF:

- login

- view facility dashboard

- see incoming referrals

- verify referral QR/token

- accept referral

- mark patient arrived

- record service provided/unavailable

- submit evidence

- view facility history

DISTRICT_SUPERVISOR:

- login

- view district facilities

- monitor referral performance

- inspect evidence

- identify conflicts

- inspect stale evidence

- view analytics

- view validation metrics

ADMIN:

- manage users

- manage facilities

- manage services

- manage facility-service mappings

- inspect evidence

- manage system settings

- view audit logs

- view all referrals

- view analytics

========================================================

5. AUTHENTICATION

========================================================

Implement real authentication.

Requirements:

- Login with username/email + password

- Password hashing using a secure algorithm

- JWT authentication

- Protected routes

- Role-based access control

- Refresh-token strategy or secure re-login strategy

- Logout

- Authentication state persistence

- Unauthorized route handling

Do not store plaintext passwords.

Do not expose JWT secret in source code.

Use environment variables.

Important:

The application does NOT need Aadhaar, biometric authentication, or unnecessary patient identity collection because the provided SIH concept focuses on operational referral reliability, not identity verification.

Use a minimal patient reference identifier for a referral.

Example:

Patient Reference ID:

PAT-7F82A

Referral ID:

REF-2026-000184

Generate a secure referral token.

QR code must contain only the secure referral identifier/token.

NEVER put sensitive medical information into the QR code.

========================================================

6. LANDING PAGE

========================================================

Build a high-quality professional landing page.

Hero:

RELI-REF

"Helping patients reach the right public facility with better information."

Subheading:

"Evidence-driven referral reliability for public healthcare."

Primary CTA:

Create Referral

Secondary CTA:

How It Works

Show the problem visually:

Registered Service

↓

Patient Referred

↓

Service May Be Unavailable

↓

Repeat Trip

↓

Delay

Show the RELI-REF improvement:

Referral

↓

Evidence Check

↓

Facility Ranking

↓

Travel

↓

Outcome

↓

Evidence Updated

Sections:

- Problem

- Solution

- How RELI-REF works

- Why registration alone is insufficient

- Evidence ledger

- Explainable ranking

- Feedback loop

- Safety boundary

- Demo CTA

Do NOT make it look like a generic AI startup landing page.

Design language:

Public healthcare + modern enterprise software + trustworthy data system.

========================================================

7. MAIN DASHBOARD

========================================================

After login show a role-specific dashboard.

KPI cards:

- Active Referrals

- Referral Success Rate

- Avoidable Failures

- Evidence Freshness

- Facilities Monitored

- Pending Evidence Conflicts

Charts:

- Referrals over time

- Successful vs failed referrals

- Service availability trend

- Evidence freshness

- Facility reliability

- Referral distance

Recent activity:

- latest evidence events

- latest referrals

- latest outcomes

- conflicts requiring attention

Add system health:

- API status

- Database status

- Last synchronization

- Pending offline events

Clearly label demo data where applicable.

========================================================

8. CREATE REFERRAL

========================================================

Build a guided multi-step referral wizard.

STEP 1:

Enter referral information.

Fields:

- Patient Reference ID

- Required Service

- Referring Facility

- Urgency

- Maximum preferred distance

- Optional operational notes

Do NOT collect unnecessary clinical information.

STEP 2:

Find eligible facilities.

Use:

- registered capability

- facility status

- service status

- current blocked state

STEP 3:

Evidence analysis.

For every candidate display:

Facility

Service

Last Observation

Observation Status

Evidence Age

Evidence Count

Directional Support

Sufficiency

Consistency

ERI

Distance

Current Status

Conflict Warning

STEP 4:

Rank facilities.

Ranking logic:

First:

Eligibility

Then:

Current blocked/ineligible removal

Then:

Evidence reliability

Then:

Distance

Allow sorting and comparison.

STEP 5:

Select a facility.

STEP 6:

Create referral in the database.

STEP 7:

Generate secure referral token + QR.

========================================================

9. FACILITY RANKING PAGE

========================================================

Create a polished comparison interface.

Example:

#1 District Hospital

ERI: 0.86

Distance: 8.4 km

Evidence: Fresh

Status: Likely Available

#2 CHC North

ERI: 0.73

Distance: 5.2 km

Evidence: Moderate

Status: Likely Available

#3 CHC South

ERI: 0.32

Distance: 4.1 km

Evidence: Conflicting

Status: Caution

Every ranking must include:

"WHY THIS FACILITY?"

Example:

✓ Eligible for requested service

✓ Strong recent positive evidence

✓ Sufficient observations

✓ Low conflict

✓ Acceptable distance

If evidence is weak:

"Reliability limited because only one recent observation is available."

Do not make the ranking a black box.

========================================================

10. EVIDENCE ENGINE

========================================================

Implement the candidate Evidence Reliability Index:

ERI = S × Q × C

Where:

S = Directional Support

Q = Evidence Sufficiency

C = Evidence Consistency

Directional Support:

How strongly recent evidence points toward one service state.

Sufficiency:

Whether there is enough evidence rather than relying on a single observation.

Consistency:

Whether overlapping reports agree.

Conflicting reports should reduce consistency.

Fresh evidence should have more weight than stale evidence.

The implementation must be deterministic and explainable.

Do NOT claim that ERI is scientifically validated.

Label:

"Candidate Evidence Reliability Index"

Keep the evidence engine modular:

backend/app/services/evidence_engine/

Files:

- scoring.py

- freshness.py

- conflict.py

- ranking.py

- models.py

Include unit tests.

========================================================

11. EVIDENCE LEDGER

========================================================

This is a CORE feature.

Create an Evidence Ledger page.

Fields:

- Evidence ID

- Facility

- Service

- Observation

- Timestamp

- Source

- Evidence Age

- Status

- Confidence

- Conflict

- Referral ID

- Created By

Example:

10:10

CHC North

X-Ray

Available

Facility Staff

Fresh

10:35

CHC North

X-Ray

Equipment Down

Facility Staff

Fresh

Conflict

12:20

CHC North

X-Ray

Service Provided

Referral Outcome

Create:

- searchable table

- filters

- sort

- pagination

- timeline view

- evidence detail modal

Filters:

- facility

- service

- date

- source

- status

- conflict

- freshness

========================================================

12. EVIDENCE SUBMISSION

========================================================

Facility staff must be able to submit real evidence.

Fields:

Facility

Service

Observation:

- Available

- Unavailable

- Temporarily Blocked

- Service Provided

Timestamp

Source

Notes

After submission:

1. Save event to PostgreSQL

2. Run validation

3. Check duplicate/conflict

4. Recalculate evidence metrics

5. Update relevant facility reliability

6. Update facility ranking

7. Create audit record

Show confirmation.

========================================================

13. FRESHNESS LOGIC

========================================================

Implement evidence aging.

Suggested categories:

0–30 min:

VERY FRESH

30 min–2 hrs:

FRESH

2–12 hrs:

AGING

12+ hrs:

STALE

Make thresholds configurable.

Use freshness as part of evidence weighting.

Never treat old evidence as equivalent to recent evidence.

========================================================

14. CONFLICT DETECTION

========================================================

Implement actual conflict detection.

Example:

10:10 X-Ray Available

10:35 X-Ray Unavailable

System:

- detects overlapping conflict

- stores conflict record

- lowers consistency

- displays warning

- affects ranking

Do not simply hardcode a conflict badge.

========================================================

15. DUPLICATE DETECTION

========================================================

Detect duplicate reports.

Possible duplicate criteria:

- same facility

- same service

- same observation

- same source/user

- very close timestamps

Store duplicate relationship if detected.

Prevent duplicate events from artificially increasing confidence.

========================================================

16. FACILITY MANAGEMENT

========================================================

Admin pages:

Facilities list

Create facility

Edit facility

Deactivate facility

View facility details

View service capabilities

View evidence

View referral history

Fields:

Facility ID

Name

Type

District

Address

Latitude

Longitude

Contact

Active status

Facility types:

PHC

CHC

District Hospital

========================================================

17. SERVICE MANAGEMENT

========================================================

Admin can manage services.

Example services:

X-Ray

Ultrasound

Blood Test

CT Scan

MRI

Dialysis

Service table:

- service ID

- name

- description

- active status

Facility-service relationship must be stored in a relational table.

========================================================

18. REFERRAL MANAGEMENT

========================================================

Referral record must contain:

Referral ID

Patient Reference ID

Referring Facility

Destination Facility

Required Service

Created At

Current Status

Selected ERI

Selected Distance

Evidence Snapshot

Created By

Referral statuses:

Created

Accepted

Arrived

Service Provided

Service Unavailable

Cancelled

Completed

Create referral history.

Every status change must be timestamped.

========================================================

19. QR / SECURE TOKEN

========================================================

Generate a secure unique token for every referral.

Generate real QR code.

QR should resolve to a referral verification route.

Example:

/verify/referral/{token}

Facility staff can scan or enter token.

Verification screen:

Referral ID

Service

Referring Facility

Destination Facility

Created timestamp

Status

Do not expose unnecessary patient information.

========================================================

20. FACILITY REFERRAL WORKFLOW

========================================================

Facility staff workflow:

Incoming Referral

↓

Verify Token

↓

Accept

↓

Patient Arrived

↓

Service Provided / Service Unavailable

↓

Outcome Saved

↓

Outcome becomes Evidence

When service outcome is recorded:

Automatically create an evidence event.

This must be a real database transaction.

========================================================

21. FEEDBACK LOOP

========================================================

Implement the actual feedback loop:

Referral

→ Outcome

→ Evidence

→ Updated Evidence Metrics

→ Future Ranking

Example:

Before:

Facility A ERI = 0.55

After several successful service outcomes:

ERI increases.

After repeated unavailable outcomes:

ERI decreases.

Make this visible in the UI.

========================================================

22. OFFLINE MODE

========================================================

Support poor connectivity.

On the facility evidence submission page:

If offline:

- save event locally

- mark "Pending Sync"

- display count

- retry automatically when online

Use IndexedDB or another reliable client-side storage mechanism.

Display:

OFFLINE MODE

Last synchronized: 10:42 AM

3 events pending sync

On reconnection:

- sync queued events

- confirm successful synchronization

- remove synchronized events

========================================================

23. ANALYTICS

========================================================

Create Analytics page.

Metrics:

- Referral failure rate

- Top-1 operational success

- Top-3 operational success

- Stale selections

- Referral attempts

- Average referral distance

- Evidence conflicts

- Average evidence age

Charts:

- success trend

- failure trend

- facility comparison

- evidence freshness

- service availability

- distance distribution

Use actual database data.

Do not fabricate real-world impact.

Demo/simulated results must be labeled:

"DEMO DATA"

or

"SIMULATED DATA"

========================================================

24. VALIDATION LAB

========================================================

Create a dedicated "Validation Lab".

Purpose:

Compare RELI-REF against simple baseline approaches.

Baselines:

1. Nearest eligible public facility

2. Static capability + distance

3. Freshest positive evidence + distance

4. Recent Majority + distance

5. RELI-REF candidate models

Create simulation pipeline:

Hidden World

↓

Noisy Observation Layer

↓

Referral Decision

↓

Ground Truth

↓

Evaluation

Scenarios:

- normal

- stale information

- sudden service failure

- rapid switching

- conflicting reports

- missing reports

- delayed reports

- cold start

- poor connectivity

- reporting bias

- adversarial observations

Allow:

- scenario selection

- seed selection

- number of runs

- model comparison

Show:

Method

Top-1 Success

Top-3 Success

Failure Rate

Stale Selections

Average Distance

Do not fabricate scientific results.

Every result generated in demo mode must be marked as simulation.

Implement at least 30+ randomized seeds when requested by the user.

========================================================

25. MAP / DISTANCE

========================================================

Store facility coordinates.

Calculate geographic distance rather than hardcoding it.

Display:

- facility location

- distance

- ranking

- availability/evidence status

If a live map API needs a key:

create provider abstraction.

Provide a local fallback that displays facility locations and distances without requiring an external API.

========================================================

26. NOTIFICATIONS

========================================================

Create notification system for:

- referral accepted

- referral rejected

- patient arrival recorded

- service outcome recorded

- evidence conflict detected

- evidence becoming stale

- sync completed

- system warning

Notifications should be database-backed.

========================================================

27. AUDIT LOGS

========================================================

Create audit logging.

Track:

- login

- logout

- referral creation

- referral update

- evidence submission

- evidence modification

- facility modification

- service modification

- user modification

- model execution

- admin actions

Fields:

timestamp

user

action

resource

resource ID

result

metadata

========================================================

28. ADMIN DASHBOARD

========================================================

Admin can view:

Total facilities

Total services

Total users

Total referrals

Evidence events

Conflicts

System health

Admin can manage:

Users

Facilities

Services

Settings

========================================================

29. USER PROFILE & SETTINGS

========================================================

Profile:

- name

- role

- email

- facility/district where appropriate

- last login

Settings:

- evidence freshness thresholds

- ranking weights where configurable

- notification preferences

- system/demo mode

Do not allow ordinary users to change algorithm parameters unless authorized.

========================================================

30. DATABASE DESIGN

========================================================

Use PostgreSQL with proper relations.

Create tables:

users

roles

facilities

services

facility_services

evidence_events

evidence_conflicts

referrals

referral_status_history

referral_outcomes

notifications

audit_logs

system_settings

Relationships:

User

→ submits Evidence

Facility

→ provides Services

Facility

→ owns Evidence

Referral

→ originates from Facility

Referral

→ targets Facility

Referral

→ requires Service

Referral

→ has Outcome

Outcome

→ creates Evidence

Evidence

→ influences ERI

Use:

- foreign keys

- indexes

- constraints

- timestamps

- created_by fields

- soft deletion where appropriate

Use Alembic migrations.

========================================================

31. REST API

========================================================

Implement clean REST APIs.

AUTH:

POST /api/auth/login

POST /api/auth/logout

GET /api/auth/me

USERS:

GET /api/users

POST /api/users

PUT /api/users/{id}

FACILITIES:

GET /api/facilities

POST /api/facilities

GET /api/facilities/{id}

PUT /api/facilities/{id}

DELETE /api/facilities/{id}

SERVICES:

GET /api/services

POST /api/services

PUT /api/services/{id}

EVIDENCE:

POST /api/evidence

GET /api/evidence

GET /api/evidence/{id}

GET /api/facilities/{id}/evidence

REFERRALS:

POST /api/referrals

GET /api/referrals

GET /api/referrals/{id}

POST /api/referrals/{id}/verify

POST /api/referrals/{id}/status

POST /api/referrals/{id}/outcome

RANKING:

GET /api/referrals/{id}/ranking

GET /api/facilities/{id}/eri

ANALYTICS:

GET /api/analytics/dashboard

VALIDATION:

POST /api/validation/simulate

GET /api/validation/baselines

NOTIFICATIONS:

GET /api/notifications

POST /api/notifications/{id}/read

Use Pydantic schemas for request/response validation.

========================================================

32. ERROR HANDLING

========================================================

Every screen must handle:

Loading

Success

Empty state

Error

Unauthorized

Forbidden

Network failure

Offline mode

Use meaningful messages.

Example:

"No recent evidence is available for this service. Registration alone is not treated as proof of availability."

========================================================

33. UX DESIGN

========================================================

Design language:

Professional

Healthcare

Government

Trustworthy

Operational

Data-driven

Avoid:

- excessive gradients

- crypto aesthetics

- flashy animations

- excessive glassmorphism

- giant hero graphics

- generic AI chatbot appearance

Use:

- clean cards

- tables

- timelines

- status badges

- charts

- clear navigation

- subtle transitions

- readable typography

- accessible contrast

Create:

- sidebar navigation

- top bar

- breadcrumb navigation

- responsive layouts

- clear action hierarchy

Status indicators:

Available

Unavailable

Conflicting

Stale

Pending Sync

Successful

Failed

Blocked

========================================================

34. SECURITY & PRIVACY

========================================================

Implement:

- secure password hashing

- JWT authentication

- role authorization

- input validation

- SQL injection prevention through ORM

- API authorization

- rate limiting where reasonable

- secure token generation

- audit logging

- environment variables

- safe CORS configuration

- no secrets in source code

Never store sensitive clinical information unless absolutely required.

The prototype should follow data minimization.

========================================================

35. DEMO ENVIRONMENT

========================================================

Create realistic fictional demo data.

Seed:

15 facilities

10 services

100+ evidence events

50+ referrals

successful referrals

failed referrals

stale evidence

conflicting evidence

duplicate reports

offline/pending events

Use fictional facilities/data.

Clearly show:

DEMO ENVIRONMENT

Never present demo numbers as actual healthcare statistics.

========================================================

36. DEMO USERS

========================================================

Seed demo users:

Admin

Referral Worker

Facility Staff

District Supervisor

Provide credentials in README only.

Do not display public passwords in production.

========================================================

37. PRESENTATION DEMO MODE

========================================================

Create a dedicated fast demo route:

/demo

The SIH team must be able to demonstrate the entire system in 3–5 minutes.

Demo scenario:

1. Referral Worker logs in.

2. Requests X-Ray service.

3. System finds eligible facilities.

4. Show Facility A with stale/conflicting evidence.

5. Show Facility B with strong fresh evidence.

6. RELI-REF ranks facilities.

7. Explain why Facility B is ranked higher.

8. Select Facility B.

9. Create referral.

10. Generate QR/token.

11. Facility Staff scans/verifies token.

12. Mark patient arrived.

13. Mark service provided.

14. System creates referral outcome.

15. Outcome becomes evidence.

16. Evidence ledger updates.

17. ERI changes.

18. Ranking updates.

19. Dashboard metrics update.

This workflow must be smooth and reliable.

========================================================

38. EXPLAINABILITY

========================================================

For every recommendation/ranking provide a human-readable reason.

Example:

"Ranked #1 because:

- Eligible for requested service

- Recent positive evidence

- Sufficient evidence history

- Low evidence conflict

- 8.4 km distance"

Also show:

Evidence used:

10:10 Available

10:35 Available

11:50 Service Provided

Do not hide ranking logic.

========================================================

39. SAFETY MESSAGE

========================================================

Display in the correct places:

"RELI-REF supports operational referral decisions. It does not provide diagnosis, treatment recommendations, or clinical decisions."

Also:

"Service availability is not guaranteed."

And:

"Human referral protocols remain the final safeguard."

========================================================

40. ARCHITECTURE

========================================================

Use professional project structure:

/frontend

/backend

/database

/docker

/docs

Frontend:

/app

/components

/hooks

/lib

/services

/types

Backend:

/app

/api

/core

/db

/models

/schemas

/services

/tests

Evidence engine:

/services/evidence_engine/

========================================================

41. TESTING

========================================================

Implement tests for:

- authentication

- authorization

- facility CRUD

- service CRUD

- evidence creation

- duplicate detection

- conflict detection

- freshness calculation

- S calculation

- Q calculation

- C calculation

- ERI calculation

- facility ranking

- distance calculation

- referral creation

- QR verification

- referral status updates

- referral outcomes

- feedback loop

- baseline comparison

- offline synchronization

Do not mark functionality as complete unless tests pass.

========================================================

42. DOCKER

========================================================

Create:

frontend Dockerfile

backend Dockerfile

PostgreSQL service

Nginx service

docker-compose.yml

The application must start with a simple command.

Provide:

- health checks

- database migration

- seed command

- production build

========================================================

43. AWS EC2 DEPLOYMENT

========================================================

The application must be deployable to AWS EC2.

Provide documentation for:

1. EC2 instance setup

2. Docker installation

3. Git clone

4. environment configuration

5. database migration

6. seed data

7. application startup

8. Nginx

9. ports/security groups

10. domain/HTTPS configuration

Architecture:

Internet

↓

Nginx

↓

Next.js

↓

FastAPI

↓

PostgreSQL

========================================================

44. README

========================================================

Create complete README:

Project overview

Problem statement

Solution

Features

Architecture

Technology stack

Database design

Environment variables

Local setup

Docker setup

Migration

Seed data

Authentication

API documentation

Testing

Demo workflow

AWS deployment

Known limitations

Future improvements

========================================================

45. CRITICAL ANTI-MOCKUP REQUIREMENT

========================================================

Do not produce:

- fake dashboard numbers disconnected from the database

- buttons that do nothing

- fake QR codes

- fake facility rankings

- hardcoded ERI values

- static evidence tables

- simulated backend responses pretending to be real

- frontend-only state for important records

Important actions must use backend APIs and PostgreSQL.

Example:

Create Referral

→ POST API

→ PostgreSQL

→ response

→ frontend updates

Submit Evidence

→ POST API

→ conflict detection

→ ERI recalculation

→ database

→ frontend updates

Service Outcome

→ referral outcome database record

→ evidence event

→ ranking recalculated

→ dashboard update

========================================================

46. DO NOT USE AN LLM AS THE CORE DECISION ENGINE

========================================================

Do not use ChatGPT/Gemini/Claude or another LLM to randomly decide the best facility.

The core recommendation must be:

deterministic

explainable

reproducible

based on evidence

based on eligibility

based on distance

The project innovation is the evidence/reliability/referral workflow.

========================================================

47. QUALITY BAR

========================================================

Before completing the project, verify:

✓ Frontend runs

✓ Backend runs

✓ PostgreSQL runs

✓ Authentication works

✓ Roles work

✓ Protected routes work

✓ CRUD works

✓ Evidence ledger works

✓ Freshness works

✓ Duplicate detection works

✓ Conflict detection works

✓ ERI works

✓ Ranking works

✓ Geographic distance works

✓ Referral workflow works

✓ QR/token works

✓ Facility verification works

✓ Outcome recording works

✓ Feedback loop works

✓ Analytics work

✓ Validation Lab works

✓ Offline queue works

✓ Sync works

✓ Audit logs work

✓ Docker works

✓ Seed data works

✓ Tests pass

✓ README exists

After implementation, run the application and test the critical end-to-end workflow yourself.

Do not stop at generating source files.

Deliver a complete runnable project.

========================================================

48. FINAL SIH STORY

========================================================

The final product must communicate this story clearly:

TODAY:

Referral

→ Travel

→ Service unavailable

→ Repeat trip

→ Delay

WITH RELI-REF:

Referral

→ Evidence Check

→ Eligible Facility Ranking

→ Better-supported Choice

→ Travel

→ Service Outcome

→ Evidence Updated

Core message:

"RELI-REF does not create more healthcare capacity.

It helps use existing public healthcare capacity more reliably by using current, time-stamped evidence."

Build the application around this concept from beginning to end.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/659e06e2-a48c-45dd-a22a-8bae0a95042b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
