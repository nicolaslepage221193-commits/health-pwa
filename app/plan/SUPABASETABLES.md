---

## 3. Table Definitions & Field Details

### Custom Enum Types

Two custom PostgreSQL `ENUM` types define standard sports and training block focus areas:

- **`sport_type`**: `'RUN'`, `'CYCLE'`, `'SWIM'`
- **`mesocycle_focus`**: `'BASE'`, `'BUILD'`, `'PEAK'`, `'TAPER'`, `'RECOVERY'`, `'TRANSITION'`

---

### A. `macrocycles`

The `macrocycles` table tracks the highest level of an athlete's plan, such as an annual plan or a multi-month event buildup.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the macrocycle. |
| `user_id` | `UUID` | `NOT NULL`, `FK -> auth.users.id` | ID of the athlete who owns this training plan. |
| `title` | `TEXT` | `NOT NULL` | Plan title (e.g., *"Annual Road Cycling Performance Plan"*). |
| `description` | `TEXT` | Optional | Higher-level overview or notes regarding season goals. |
| `start_date` | `DATE` | `NOT NULL` | Start date of the overall plan. |
| `end_date` | `DATE` | `NOT NULL` | End date of the plan (must be $\ge$ `start_date`). |
| `primary_sport` | `sport_type` | `NOT NULL` | Primary discipline for the plan (`RUN`, `CYCLE`, or `SWIM`). |
| `target_event_date` | `DATE` | Optional | Key race or event date the macrocycle peaks toward. |
| `created_at` | `TIMESTAMPTZ`| Default `NOW()` | Timestamp when the record was created. |
| `updated_at` | `TIMESTAMPTZ`| Default `NOW()` | Timestamp when the record was last modified. |

---

### B. `mesocycles`

The `mesocycles` table splits a macrocycle into distinct multi-week training phases.

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the mesocycle block. |
| `macrocycle_id` | `UUID` | `FK -> macrocycles.id ON DELETE CASCADE` | Link to the parent macrocycle. |
| `title` | `TEXT` | `NOT NULL` | Block title (e.g., *"Base 1: Aerobic Capacity"*). |
| `focus` | `mesocycle_focus` | `NOT NULL` | The primary adaptation goal (`BASE`, `BUILD`, `PEAK`, etc.). |
| `sequence_order` | `INT` | `NOT NULL` | Execution order within the macrocycle (e.g., `1`, `2`, `3`). |
| `start_date` | `DATE` | `NOT NULL` | Block start date. |
| `end_date` | `DATE` | `NOT NULL` | Block end date (must be $\ge$ `start_date`). |
| `target_volume_hours`| `NUMERIC(6,2)` | Optional | Total planned training hours across the entire block. |
| `target_distance_km` | `NUMERIC(6,2)` | Optional | Total planned distance in kilometers across the block. |
| `notes` | `TEXT` | Optional | Specific instructions or focus notes for the block. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was created. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was last modified. |

---

### C. `microcycles`

The `microcycles` table breaks down each mesocycle into individual weekly units (usually 7 days).

| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `uuid_generate_v4()` | Unique identifier for the microcycle week. |
| `mesocycle_id` | `UUID` | `FK -> mesocycles.id ON DELETE CASCADE` | Link to the parent mesocycle. |
| `week_number` | `INT` | `NOT NULL` | Cumulative week number across the plan (e.g., Week 1 to 52). |
| `start_date` | `DATE` | `NOT NULL` | Start date for the week (typically a Monday). |
| `end_date` | `DATE` | `NOT NULL` | End date for the week (typically a Sunday). |
| `target_volume_hours`| `NUMERIC(6,2)` | Default `0.00` | Target workout hours for this week. |
| `target_distance_km` | `NUMERIC(6,2)` | Default `0.00` | Target training distance in km for this week. |
| `actual_volume_hours`| `NUMERIC(6,2)` | Default `0.00` | Aggregated completed hours (calculated from actual activities). |
| `actual_distance_km` | `NUMERIC(6,2)` | Default `0.00` | Aggregated completed distance in km. |
| `is_recovery_week` | `BOOLEAN` | Default `FALSE` | Flag indicating a deload/recovery microcycle. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was created. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when the record was last modified. |

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

---

## 4. Foreign Key Rules & Cascades

1. **`macrocycles` $\rightarrow$ `mesocycles`**: `ON DELETE CASCADE`
   - Deleting a macrocycle automatically removes all related mesocycles, microcycles, and planned workouts.
2. **`mesocycles` $\rightarrow$ `microcycles`**: `ON DELETE CASCADE`
   - Deleting a mesocycle cleans up its nested microcycles and their workouts.
3. **`microcycles` $\rightarrow$ `planned_workouts`**: `ON DELETE CASCADE`
   - Deleting a microcycle removes all workouts assigned to that week.

---

## 5. Security & Access Control (Row Level Security)

All tables utilize **Supabase Row Level Security (RLS)**:
- **`macrocycles`**: Restricted directly by comparing `auth.uid() = user_id`.
- **`mesocycles`**, **`microcycles`**, & **`planned_workouts`**: Access rights are derived through multi-level `EXISTS` subqueries checking ownership of the root `macrocycles.user_id`. This pattern allows future coaching features where coaches or athletes can be granted access to shared plan structures.