Build a React component for the "Microcycle View" page of a cardiovascular training module within an app called "Healthcore".

### Core Requirements & Tech Stack
- Framework: React (Next.js App Router preferred, TypeScript)
- Styling: Tailwind CSS (dark mode theme with slate/teal accents)
- Icons: Lucide React (`ChevronLeft`, `Activity`, `Bike`, `Waves`, `Plus`)

### Layout & Component Architecture

1. **Header & Navigation Bar:**
   - Top navigation with a back arrow button (`ChevronLeft`) and header label "SPRING MARATHON PLAN" (Macrocycle Title).
   - Dynamic subtitle below indicating the active cycle level (e.g., "Macrocycle").

2. **Mesocycle Progress Stepper:**
   - A horizontal step indicator representing the mesocycle sequence (e.g., `BASE 1 (4 wks)`, `BUILD 1 (4 wks)`, `BUILD 2 (4 wks)`, `PEAK (2 wks)`, `TAPER (2 wks)`).
   - Active phase should be highlighted with a solid accent node (e.g., emerald/teal) and connecting lines.
   - Micro-pagination indicator dots below the stepper to allow swiping between mesocycles.

3. **Microcycle Weekly Schedule Feed:**
   - Header showing the current microcycle title and date range (e.g., "MICROCYCLE 3: BASE 1 (Nov 8-14)").
   - A vertical daily feed (Monday through Sunday) displaying:
     * **Date Column:** Day label (e.g., "Mon", "Tue") and numerical date (e.g., "8", "9").
     * **Workout Card:** Rounded container color-coded by sport (e.g., Dark Navy/Blue for Run, Teal/Cyan for Swim, Emerald Green for Cycle, Muted Gray for Rest).
     * **Card Content:** Sport icon, Sport type header (Run/Swim/Cycle), sub-heading (e.g., Easy, Drills, Tempo), and key target metrics (e.g., "60m (4:30/km pace)", "120m (220W)").
     * **Rest Days:** Simple card showing "REST".

4. **Bottom Fixed Action CTA:**
   - Fixed bottom card bar with pagination dots and a full-width primary button labeled "+ ADD MICROCYCLE".

### Design & Color Scheme
- Background: Deep slate/dark charcoal gradient background (`#1A232A` to `#10171D`).
- Cards: Semi-transparent rounded panels with soft borders (`border-slate-700/50`).
- Accent Colors:
  * Running: `#2B4C6F` (Dark Blue)
  * Swimming: `#1F5A73` (Teal)
  * Cycling: `#2E6B4B` (Green)
  * Primary Button: `#3E8A68` (Emerald CTA)

### TypeScript Data Interfaces
Provide typed models for:
- `MacrocyclePlan` (id, title, mesocycles array)
- `MesocycleBlock` (id, name, durationWeeks, isCurrent)
- `Microcycle` (id, title, dateRange, days: `DailyWorkout[]`)
- `DailyWorkout` (id, date, dayOfWeek, sportType, workoutName, targetMetrics, isRestDay)

Please generate clean, modular React TypeScript code matching this exact visual structure.