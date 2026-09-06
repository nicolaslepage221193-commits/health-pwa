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

---

## 3. Table Definitions & Field Details

### A. `macrocycles`

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the macrocycle. |
| `user_id` | `UUID` | `NOT NULL`, `FK -> auth.users.id` | ID of the athlete who owns this plan. |
| `title` | `TEXT` | `NOT NULL` | Plan title. |
| `mesocycle_ids` | `UUID[]` | Default `'{}'` | Ordered array of Mesocycle IDs referenced in this macrocycle. |
| `start_date` | `DATE` | `NOT NULL` | Start date of the overall plan. |
| `end_date` | `DATE` | `NOT NULL` | End date of the overall plan. |

---

### B. `mesocycles`

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the mesocycle. |
| `title` | `TEXT` | `NOT NULL` | Block title. |
| `focus` | `mesocycle_focus` | `NOT NULL` | Adaptation goal (`BASE`, `BUILD`, `PEAK`, etc.). |
| `microcycle_ids` | `UUID[]` | Default `'{}'` | Ordered array of Microcycle IDs referenced in this mesocycle. |

---

### C. `microcycles`

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the microcycle week. |
| `week_number` | `INT` | `NOT NULL` | Week sequence number. |
| `planned_workout_ids`| `UUID[]` | Default `'{}'` | Array of Planned Workout IDs assigned to this week. |
| `is_recovery_week` | `BOOLEAN` | Default `FALSE` | Deload/recovery flag. |

---

### D. `planned_workouts`

The `planned_workouts` table stores specific training sessions scheduled on specific calendar dates within a microcycle.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the individual workout session. |
| `microcycle_id` | `UUID` | `FK -> microcycles.id ON DELETE CASCADE` | Link to the parent microcycle week. |
| `scheduled_date` | `DATE` | `NOT NULL` | Calendar date on which the workout is scheduled. |
| `title` | `TEXT` | `NOT NULL` | Name of the session (e.g., *"Sweet Spot Intervals (3x12m)"*). |
| `description` | `TEXT` | Optional | Detailed instructions, sets, repetitions, or execution details. |
| `sport` | `sport_type` | `NOT NULL`, Default `'CYCLE'` | Discipline for the workout (`RUN`, `CYCLE`, or `SWIM`). |
| `target_duration_minutes` | `INT` | `NOT NULL`, Default `60` | Target session duration in minutes. |
| `target_distance_km` | `NUMERIC(6,2)` | Optional | Target distance in kilometers. |
| `target_rpe` | `INT` | Check (`1` to `10`) | Target Rate of Perceived Exertion (1 = Easy, 10 = All Out). |
| `workout_type` | `TEXT` | Optional | Category label (e.g., `'Recovery'`, `'Threshold'`, `'VO2 Max'`). |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was created. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was last modified. |
