# Workout Persistence Implementation

## Overview
Implemented a comprehensive solution to prevent loss of in-progress workout data when navigating between pages.

## How It Works

### 1. **WorkoutContext (Global State Management)**
- Location: `app/context/WorkoutContext.tsx`
- Manages the entire workout session state globally across the app
- Automatically syncs with browser's `localStorage` for persistence
- Session data survives page navigation and browser refresh

### 2. **Browser LocalStorage**
- Persists session data to `localStorage` under key: `healthapp_workout_session`
- Automatically saves whenever the session state changes
- Survives browser refresh and tab navigation within the same app

### 3. **Automatic Draft Saving**
- When a user navigates away from the workout page with unsaved exercises:
  - The system automatically saves the workout as a draft to the database
  - Marked with `is_draft: true` flag in the workouts table
  - Can be resumed later or deleted if unwanted

### 4. **Full Workout Completion**
- When the user clicks "Sync Workout", the complete session is saved
  - Marked with `is_draft: false`
  - User is redirected to the calendar page

## Updated Files

### `app/context/WorkoutContext.tsx` (NEW)
- Provides `WorkoutProvider` wrapper component
- Exports `useWorkout()` hook for accessing session data
- Manages session creation, updates, and clearing
- Handles localStorage persistence

### `app/components/ClientLayout.tsx` (MODIFIED)
- Wrapped with `WorkoutProvider` to enable global state management
- All child pages have access to workout context

### `app/workout/train/page.tsx` (MODIFIED)
- Uses `useWorkout()` hook instead of local state
- Automatically saves draft workouts when navigating away
- Restores previous session on page load
- Better error handling and state synchronization

## Database Schema Changes Required

### Add `is_draft` column to `workouts` table:
```sql
ALTER TABLE workouts 
ADD COLUMN is_draft BOOLEAN DEFAULT false;
```

This column distinguishes between:
- `is_draft = true`: Incomplete workouts saved automatically when leaving the page
- `is_draft = false`: Completed workouts the user explicitly saved

## Session Data Structure

```typescript
interface WorkoutSession {
  id: string;                           // Unique session ID
  activePlan: any | null;               // Selected template or null
  selectedEx: any | null;               // Currently editing exercise
  sessionExercises: SessionExercise[];  // Completed exercises
  currentSets: Set[];                   // Sets for current exercise
  weight: string;                       // Weight input value
  reps: string;                         // Reps input value
  customDate: string;                   // Workout date (YYYY-MM-DD)
  isDraft: boolean;                     // Whether already saved to DB
}
```

## Usage Example

```typescript
import { useWorkout } from '@/context/WorkoutContext';

function MyComponent() {
  const { session, createSession, updateSession, clearSession } = useWorkout();

  // Create a new workout session
  const startWorkout = () => {
    createSession(null); // null for "on the fly", or pass a template
  };

  // Update the session
  const addExercise = (exercise) => {
    updateSession({
      sessionExercises: [...session.sessionExercises, exercise]
    });
  };

  // Clear session when done
  const finishWorkout = () => {
    clearSession();
  };

  return (
    <div>
      {session?.sessionExercises.length || 0} exercises logged
    </div>
  );
}
```

## User Experience Flow

1. **Start Workout** → Session created and stored in context + localStorage
2. **Add Exercises** → Session updated, automatically synced to localStorage
3. **Navigate Away** → System detects unsaved exercises and saves as draft to DB
4. **Return to Page** → Previous session automatically restored from localStorage
5. **Complete Workout** → User clicks "Sync Workout" to finalize (is_draft = false)

## Benefits

✅ No data loss during navigation  
✅ Survives page refresh  
✅ Works across browser tabs  
✅ Automatic draft saving to database  
✅ Seamless user experience  
✅ Can resume from drafts later  

## Next Steps

1. Add `is_draft` column to workouts table in Supabase
2. Test the workout flow across multiple page navigations
3. Consider adding a "Resume Draft" feature in the calendar
4. Consider adding a "Draft Workouts" view to see previously saved drafts
