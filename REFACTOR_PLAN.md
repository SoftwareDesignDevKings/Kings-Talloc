# Codebase Naming Convention Refactor Plan

## Principle

**File name prefix = Function name prefix**

Every function should be prefixed with a clear namespace matching its file/domain.

---

## Firestore Files

### `/firestore/adminFirebase.js`

- Already exports: `adminAuth`, `adminDb` ✅
- No functions to rename

### `/firestore/firebaseFetch.js` → Rename functions with `firestore` prefix

- `fetchEvents` → `firestoreFetchEvents`
- `fetchAvailabilities` → `firestoreFetchAvailabilities`
- `fetchStudentRequests` → `firestoreFetchStudentRequests`
- `fetchTutors` → `firestoreFetchTutors`
- `fetchSubjectsWithTutors` → `firestoreFetchSubjectsWithTutors`

### `/firestore/firebaseOperations.js` → Already has `firestore` prefix via core refactor

- Functions already renamed in `/core/firestoreOperations.js` ✅

---

## Utils Files

### `/utils/recurringEvents.js` → Rename functions with `recurring` prefix

- `expandRecurringEvents` → `recurringExpand` ✅ (already has prefix)

### `/utils/msTeams.js` → Already refactored to `/core/msTeams.js` with `ms` prefix ✅

### `/utils/calendarHelpers.js` → Already refactored to `/core/calendarHelpers.js` ✅

### `/utils/eventOperations.js` → Already refactored to `/core/calendarOperations.js` ✅

---

## Components Helper Files

### `/components/calendar/helpers.js` → Rename functions with `calendarUI` prefix

- `eventStyleGetter` → `calendarUIGetEventStyle`
- `customSlotPropGetter` → `calendarUIGetSlotProps`
- `messages` → `calendarUIMessages`

### `/components/calendar/availabilityUtils.js` → Rename functions with `availability` prefix

- `splitAvailabilities` → `availabilitySplit` ✅ (already has prefix in right position)

---

## Auth Files

### `/app/api/auth/[...nextauth]/firebaseAuth.js` → Rename functions with `authFirebase` prefix

- Need to read file and identify functions

### `/app/api/auth/[...nextauth]/msAuth.js` → Rename functions with `authMs` prefix

- Need to read file and identify functions

---

## API Route Handlers

### `/app/api/send-emails/[action]/route.js` → Rename functions with `email` prefix

- Need to read file and identify functions

### `/app/api/timesheet/route.js` → Rename functions with `timesheet` prefix

- Need to read file and identify functions

---

## Summary of Changes

### Phase 1: Firestore

1. Rename fetch functions in `firebaseFetch.js`
2. Update imports in `CalendarDataProvider.jsx`

### Phase 2: Component Helpers

1. Rename functions in `components/calendar/helpers.js`
2. Update imports across calendar components

### Phase 3: Auth

1. Rename functions in auth files
2. Update imports in `authOptions.js`

### Phase 4: API Routes

1. Rename functions in API route handlers

### Phase 5: Cleanup

1. Delete old `/utils/` files (already refactored to `/core/`)
2. Update all imports
3. Test build
