# React Hooks Directory

This directory contains custom React hooks organized by functionality to support the Kings-Talloc tutor allocation system.

## Directory Structure

```
hooks/
├── calendar/           # Calendar and event management hooks
├── forms/             # Form handling and operations hooks
├── auth/              # Authentication and user management hooks
└── README.md          # This file
```

## Hook Categories

### Calendar Hooks (`/calendar/`)

**`useCalendarEvents.js`**
- **Purpose**: Manages calendar events and availabilities data fetching
- **Key Features**:
  - Fetches events, availabilities, subjects, and tutors from Firebase
  - Splits availability data based on existing events
  - Provides real-time data updates for calendar components
- **Used by**: CalendarProvider
- **Returns**: Event data, availability data, subjects, tutors, students

**`useCalendarState.js`**
- **Purpose**: Manages calendar UI state and filtering logic
- **Key Features**:
  - `useCalendarUI`: Controls visibility settings (events, initials, filter panel)
  - `useCalendarFilterState`: Manages subject/tutor filters and visibility toggles
- **Used by**: CalendarProvider
- **Returns**: UI controls and filter states with actions

**`useCalendarModals.js`**
- **Purpose**: Manages calendar modal states and transitions
- **Key Features**:
  - Controls teacher, student, availability, and details modals
  - Provides centralized modal state management with safe transitions
  - Includes editing states and event data passing
- **Used by**: CalendarProvider, CalendarWrapper
- **Returns**: Modal states and control functions

**`useCalendarInteractions.js`**
- **Purpose**: Handles calendar user interactions (slot/event selection)
- **Key Features**:
  - Manages slot selection for creating new events/availabilities
  - Handles event clicks with role-based access control
  - Creates appropriate data structures for different user roles
- **Used by**: CalendarWrapper
- **Returns**: Event/availability data and interaction handlers

**`useEventOperations.js`**
- **Purpose**: Handles event CRUD operations and drag/drop functionality
- **Key Features**:
  - Event drag/drop with Firebase persistence
  - Event resizing with validation
  - Event deletion with proper cleanup
  - Student confirmation responses
- **Used by**: CalendarWrapper, EventForm
- **Returns**: Event operation handlers

### Form Hooks (`/forms/`)

**`useEventForm.js`**
- **Purpose**: Handles EventForm (teacher) operations and validation
- **Key Features**:
  - Input change handlers for all event fields
  - Staff, class, and student selection management
  - Event creation/editing with Firebase operations
  - Teams meeting integration queue management
- **Used by**: EventForm component
- **Returns**: Form handlers and submission logic

**`useStudentEventForm.js`**
- **Purpose**: Handles StudentEventForm operations (simplified version)
- **Key Features**:
  - Student-specific event creation workflow
  - Input handling for student event requests
  - Approval status management
- **Used by**: StudentEventForm component
- **Returns**: Form handlers optimized for student usage

**`useAvailabilityOperations.js`**
- **Purpose**: Handles availability CRUD operations
- **Key Features**:
  - Availability creation and editing in Firebase
  - Tutor availability management
  - Work type and location handling
- **Used by**: useTutorAvailabilityForm
- **Returns**: Availability submission operations

**`useTutorAvailabilityForm.js`**
- **Purpose**: Handles TutorAvailabilityForm operations
- **Key Features**:
  - Tutor availability form management
  - Combines useAvailabilityOperations for data operations
  - Input handling for availability-specific fields
- **Used by**: TutorAvailabilityForm component
- **Returns**: Form handlers for tutor availability

### Authentication Hooks (`/auth/`)

**`useUserInfo.js`**
- **Purpose**: Manages user authentication and role information
- **Key Features**:
  - Session management with NextAuth
  - User document creation and role assignment
  - Loading states for authentication flow
  - User role retrieval and caching
- **Used by**: Dashboard, various components requiring user info
- **Returns**: Session data, user role, loading states

## Usage Patterns

### Provider Composition
The calendar hooks are composed together in `CalendarProvider` to create a unified state management system:

```javascript
// CalendarProvider.js
const eventsData = useCalendarEvents(userRole, userEmail);
const uiState = useCalendarUI();
const filterState = useCalendarFilterState();
const modals = useCalendarModals();
const handlers = useCalendarInteractions(userRole, userEmail, modals, eventsData);
```

### Form Integration
Form hooks integrate with Firebase operations and state management:

```javascript
// EventForm.jsx
const { handleSubmit, handleInputChange } = useEventForm(eventsData);
const { handleDeleteEvent } = useEventOperations(eventsData, userRole, userEmail);
```

### Role-Based Access
Many hooks implement role-based functionality:
- **Students**: Can create event requests, view approved events
- **Tutors**: Can manage availability, view assigned events
- **Teachers**: Full event management capabilities

## Import Paths

With the new organization, import hooks using their category paths:

```javascript
// Calendar hooks
import { useCalendarEvents } from '@hooks/calendar/useCalendarEvents';
import { useCalendarUI } from '@hooks/calendar/useCalendarState';

// Form hooks
import { useEventForm } from '@hooks/forms/useEventForm';
import { useStudentEventForm } from '@hooks/forms/useStudentEventForm';

// Auth hooks
import { useUserRole } from '@hooks/auth/useUserInfo';
```

## Dependencies

### External Dependencies
- React hooks (useState, useEffect, useMemo)
- NextAuth.js for authentication
- Firebase Firestore for data operations
- Moment.js for date handling

### Internal Dependencies
- `@firebase/fetchData` - Data fetching utilities
- `@firebase/db` - Firebase configuration
- `@utils/firebaseOperations` - CRUD operations
- `@components/calendar/availabilityUtils` - Calendar utilities

## Development Notes

- All hooks follow React hooks rules and conventions
- Firebase operations include error handling and optimistic updates
- State management uses immutable patterns for React compatibility
- Hooks are designed for composition and reusability
- Role-based access control is implemented throughout

## Testing Considerations

When testing components that use these hooks:
- Mock Firebase operations for unit testing
- Test role-based functionality with different user roles
- Verify state updates and side effects
- Test error handling and loading states