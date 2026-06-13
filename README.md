# LifeRPG Progression Service

The **LifeRPG Progression Service** is a standalone NestJS application responsible for executing the daily settlement pipeline for the LifeRPG platform.

At the end of each user's day, the service evaluates quest completions, updates progression-related data, awards experience, calculates level gains, updates quest strength, distributes attribute experience, and records all progression events in an immutable audit log.

---

## Overview

LifeRPG uses a deferred progression model.

When a user completes a quest, a record is inserted into the `quest_completions` table immediately. Progression rewards are not awarded at that time.

Instead, an hourly settlement process determines which timezones have crossed their daily boundary and processes all outstanding quest completions for users within those timezones.

This design provides:

* Consistent progression calculations
* Timezone-aware daily processing
* Reduced database write volume
* Full auditability through progression logs
* Transactional integrity across progression updates

---

## Responsibilities

The Progression Service is responsible for:

### User Progression

* Awarding user experience
* Calculating user level increases
* Updating:

  * `users.experience`
  * `users.level`
  * `users.updated_at`

### Quest Progression

* Updating quest streaks
* Applying rest day logic
* Awarding or deducting quest strength points
* Determining quest strength rank changes
* Updating:

  * `quests.streak`
  * `quests.rest_progress`
  * `quests.strength_points`
  * `quests.strength_level`
  * `quests.last_completed_date`
  * `quests.updated_at`

### Attribute Progression

* Awarding experience to affected attributes
* Calculating attribute level increases
* Updating:

  * `attributes.experience`
  * `attributes.level`
  * `attributes.updated_at`

### Audit Logging

Creating immutable progression records in:

* `progression_logs`

Tracking execution batches in:

* `daily_progression_batches`

### Completion Processing

Marking processed quest completions:

* `quest_completions.processed_at`

---

## High-Level Pipeline Flow

```text
┌──────────────────────┐
│ Hourly Cron Trigger  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Determine Timezones  │
│ Crossing 2:00 AM     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Fetch Settlement     │
│ Data from Supabase   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Build Progression    │
│ Updates In Memory    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Execute Database     │
│ Transaction          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Write Logs & Batch   │
│ Records              │
└──────────────────────┘
```

---

## Settlement Process

### 1. Detect Eligible Timezones

The scheduler runs every hour.

It determines which user timezones have crossed the configured settlement boundary:

```text
02:00 Local Time
```

Only users within those timezones are processed.

---

### 2. Retrieve Settlement Data

The service calls:

```sql
public.get_settlement_users_data()
```

This RPC returns all data required to calculate progression:

* Users
* Quests
* Attributes
* Quest completions
* Quest ↔ Attribute relationships

in a single database round trip.

---

### 3. Build Progression Updates

For each user:

#### Process Completed Quests

Calculate:

* User experience earned
* Attribute experience earned
* Quest strength gains
* Streak increases
* Rest progress increases

#### Process Missing Required Quests

Determine whether:

* A streak should reset
* A rest day should be consumed
* Strength points should be deducted

---

### 4. Calculate Levels

The service calculates:

#### User Levels

Based on accumulated experience.

#### Quest Strength Levels

Based on strength points.

#### Attribute Levels

Each attribute levels independently.

---

### 5. Generate Progression Logs

Each progression event generates audit records.

Examples:

```text
Completed quest "Workout"
+25 User Experience

Completed quest "Workout"
+3 Strength Points

Completed quest "Workout"
+10 Strength Experience (Fitness)

Missed required quest "Read"
-10 Strength Points
```

Logs are inserted into:

```text
progression_logs
```

---

### 6. Execute Transaction

Once calculations are complete:

1. Create daily batch record
2. Update users
3. Update quests
4. Update attributes
5. Insert progression logs
6. Mark quest completions processed

All changes are committed atomically.

If any operation fails, the entire transaction is rolled back.

---

## Architecture

```text
src/
│
├── progression/
│   ├── progression.module.ts
│   ├── progression.service.ts
│
├── settlement/
│   ├── settlement.module.ts
│   ├── settlement.service.ts
│
├── scheduler/
│   ├── scheduler.module.ts
│   ├── scheduler.service.ts
│
├── supabase/
│   ├── supabase.module.ts
│   ├── supabase.service.ts
│
├── common/
│   ├── interfaces/
│   ├── utils/
│   └── constants/
│
└── main.ts
```

---

## Core Technologies

### Framework

* NestJS

### Database

* Supabase
* PostgreSQL

### Scheduling

* @nestjs/schedule

### Testing

* Jest

### Language

* TypeScript

---

## Key Design Principles

### Timezone-Aware Processing

Progression is calculated using the user's configured timezone rather than UTC.

---

### Auditability

Every progression change is persisted to:

```text
progression_logs
```

allowing complete reconstruction of user progression history.

---

### Transaction Safety

Progression updates are committed as a single transaction.

This prevents partial progression updates.

---

### Batch Processing

Users are processed in batches grouped by timezone.

This minimizes database load while ensuring correct daily boundaries.

---

## Future Enhancements

### Retry Queue

Retry failed settlement batches automatically.

### Dead Letter Handling

Persist failed progression calculations for manual inspection.

### Metrics & Monitoring

Track:

* Settlement duration
* Users processed
* Failed batches
* Experience awarded

### Distributed Processing

Scale settlement processing across multiple workers.

---

## Related Database Tables

| Table                     | Purpose                       |
| ------------------------- | ----------------------------- |
| users                     | User progression              |
| attributes                | User-defined attributes       |
| quests                    | Quest progression             |
| quest_completions         | Raw completion events         |
| quests_attributes         | Quest ↔ Attribute mapping     |
| progression_logs          | Audit trail                   |
| daily_progression_batches | Settlement execution tracking |
| strength_levels           | Strength rank lookup          |

---

## Development Status

Current Status: **Operational**

The service currently targets:

* Hourly execution
* Timezone-based settlement detection
* Full progression calculations
* Transactional database updates
* Audit logging
* Batch tracking

Part of the LifeRPG platform progression infrastructure.
