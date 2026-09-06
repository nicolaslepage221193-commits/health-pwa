Markdown
# Periodization Hierarchy Schema Documentation

This document outlines the database schema and structure for managing endurance training periodization in **Healthcore**. The periodization model uses a **top-down reference architecture**: **Macrocycles** reference an ordered list of **Mesocycles**, which reference **Microcycles**, which reference **Planned Workouts**.

---

## 1. Overview & Data Hierarchy
- **Macrocycle:** High-level season plan containing an array of child `mesocycle_ids` in execution order.
- **Mesocycle:** Training block (e.g., *Base 1*, *Build*) containing an array of child `microcycle_ids`.
- **Microcycle:** Weekly calendar unit containing an array of child `planned_workout_ids`.
- **Planned Workout:** Individual training session details.

---

## 3. Table Definitions & Field Details

### Custom Enum Types

- **`sport_type`**: `'RUN'`, `'CYCLE'`, `'SWIM'`
- **`mesocycle_focus`**: `'BASE'`, `'BUILD'`, `'PEAK'`, `'TAPER'`, `'RECOVERY'`, `'TRANSITION'`

---

### A. `macrocycles`

The `macrocycles` table tracks the overall season plan, referencing ordered mesocycle IDs.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the macrocycle. |
| `user_id` | `UUID` | `NOT NULL`, `FK -> auth.users.id` | ID of the athlete who owns this training plan. |
| `title` | `TEXT` | `NOT NULL` | Plan title (e.g., *"Annual Road Cycling Performance Plan"*). |
| `description` | `TEXT` | Optional | Higher-level overview or season targets. |
| `start_date` | `DATE` | `NOT NULL` | Start date of the overall plan. |
| `end_date` | `DATE` | `NOT NULL` | End date of the overall plan. |
| `primary_sport` | `sport_type` | `NOT NULL` | Primary discipline (`RUN`, `CYCLE`, or `SWIM`). |
| `mesocycle_ids` | `UUID[]` | Default `'{}'` | Ordered array of Mesocycle IDs in sequence. |
| `target_event_date` | `DATE` | Optional | Key target race or event date. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()` | Record last modification timestamp. |

---

### B. `mesocycles`

The `mesocycles` table splits a macrocycle into distinct training blocks and tracks child microcycle counts and sequence array references.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the mesocycle. |
| `title` | `TEXT` | `NOT NULL` | Block title (e.g., *"Base 1: Aerobic Capacity"*). |
| `focus` | `mesocycle_focus` | `NOT NULL` | Primary adaptation goal (`BASE`, `BUILD`, etc.). |
| `start_date` | `DATE` | `NOT NULL` | Block start date. |
| `end_date` | `DATE` | `NOT NULL` | Block end date (calculated dynamically from child `length_days`). |
| `target_volume_hours`| `NUMERIC(6,2)` | Optional | Total planned training hours for the block. |
| `target_distance_km` | `NUMERIC(6,2)` | Optional | Total planned distance in kilometers. |
| `microcycle_count` | `INT` | Default `0` | Total count of microcycles contained in this block. |
| `microcycle_ids` | `UUID[]` | Default `'{}'` | Ordered array of Microcycle IDs. Index position determines sequence. |
| `notes` | `TEXT` | Optional | Specific instructions or focus notes. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Record last modification timestamp. |

---

### C. `microcycles`

The `microcycles` table defines specific training weeks or blocks, tracking explicit duration (`length_days`) and references to planned workouts.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the microcycle. |
| `week_number` | `INT` | `NOT NULL` | Cumulative week number across the plan. |
| `start_date` | `DATE` | `NOT NULL` | Start date for the microcycle. |
| `end_date` | `DATE` | `NOT NULL` | End date for the microcycle (`start_date + length_days - 1`). |
| `length_days` | `INT` | Default `7`, Check (`length_days > 0`) | Duration of the microcycle in days. |
| `target_volume_hours`| `NUMERIC(6,2)` | Default `0.00` | Target workout hours for this microcycle. |
| `target_distance_km` | `NUMERIC(6,2)` | Default `0.00` | Target training distance in km. |
| `actual_volume_hours`| `NUMERIC(6,2)` | Default `0.00` | Completed training hours. |
| `actual_distance_km` | `NUMERIC(6,2)` | Default `0.00` | Completed training distance in km. |
| `planned_workout_ids`| `UUID[]` | Default `'{}'` | Array of Planned Workout IDs assigned to this microcycle. |
| `is_recovery_week` | `BOOLEAN` | Default `FALSE` | Flag indicating a deload/recovery week. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Record last modification timestamp. |

---

### D. `planned_workouts`

The `planned_workouts` table stores specific daily workout sessions.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the workout. |
| `scheduled_date` | `DATE` | `NOT NULL` | Calendar date scheduled for execution. |
| `title` | `TEXT` | `NOT NULL` | Workout name (e.g., *"Sweet Spot Intervals (3x12m)"*). |
| `description` | `TEXT` | Optional | Session structure, intervals, and execution instructions. |
| `sport` | `sport_type` | `NOT NULL`, Default `'CYCLE'` | Discipline (`RUN`, `CYCLE`, or `SWIM`). |
| `target_duration_minutes` | `INT` | `NOT NULL`, Default `60` | Target duration in minutes. |
| `target_distance_km` | `NUMERIC(6,2)` | Optional | Target distance in kilometers. |
| `target_rpe` | `INT` | Check (`1` to `10`) | Target Rate of Perceived Exertion. |
| `workout_type` | `TEXT` | Optional | Intensity label (e.g., `'Recovery'`, `'Threshold'`, `'VO2 Max'`). |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Record last modification timestamp. |

---

## 4. Array Sequencing & Duration Logic

1. **Implicit Sequence Ordering:** Sequence order is determined by array index position. The array elements in `macrocycles.mesocycle_ids` and `mesocycles.microcycle_ids` preserve strict 1-based order when queried (e.g., via `WITH ORDINALITY`).
2. **Dynamic Duration Calculation:** Mesocycle `end_date` and `microcycle_count` are derived by summing `length_days` across all array-referenced microcycles:
   $$\text{Mesocycle end\_date} = \text{start\_date} + \left( \sum \text{microcycles.length\_days} \right) - 1\text{ day}$$

---

## 5. Security & Access Control (Row Level Security)

All tables enforce **Supabase Row Level Security (RLS)** using top-down array containment checks:
- **`macrocycles`**: Verified directly via `auth.uid() = user_id`.
- **`mesocycles`**: Verified if `mesocycles.id = ANY(macrocycles.mesocycle_ids)` for a macrocycle owned by `auth.uid()`.
- **`microcycles`**: Verified if `microcycles.id = ANY(mesocycles.microcycle_ids)` traversing down from user-owned macrocycles.
- **`planned_workouts`**: Verified if `planned_workouts.id = ANY(microcycles.planned_workout_ids)` traversing down from user-owned macrocycles.