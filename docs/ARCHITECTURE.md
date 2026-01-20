# Architecture Overview

## Technology Stack

The Talloc application is built using modern web technologies with a focus on scalability, performance, and developer experience.

> [!IMPORTANT]
> **Core Framework:** Next.js 15 (React 18)
>
> **Deployment:** Vercel
>
> **Database:** Firebase Firestore
>
> **Authentication:** NextAuth.js with Microsoft OAuth

---

## Core Dependencies

### Frontend Framework

**Next.js** `^15.5.9`
- App Router architecture
- API routes for backend functionality
- File-based routing

**React** `^18`
- Component-based UI architecture
- Hooks for state management
- Context API for global state

### UI Libraries

**Bootstrap** `^5.3.8`
- Responsive grid system
- Pre-built components
- Utility classes for styling

**React Big Calendar** `^1.13.1`
- Interactive calendar views
- Event management and scheduling

**React DatePicker** `^7.3.0`
- Date and time selection
- Custom date range filtering

**React Select** `^5.8.0`
- Advanced dropdown selections
- Multi-select capabilities
- Custom styling options

**React CSV** `^2.2.2`
- Export data to CSV format
- Used for tutor hours summary exports

### Authentication & Authorization

**NextAuth.js** `^4.24.11`
- OAuth integration with Microsoft
- Session management
- JWT token handling
- Role-based access control (RBAC)

> [!NOTE]
> **User Roles:**
> - `teacher` - Full access to all features
> - `tutor` - Limited access (calendar, hours tracking)
> - `student` - Basic access (calendar view, personal events)

### Database & Backend

**Firebase** `^10.12.3`
- Client-side Firestore SDK
- Real-time database updates
- Authentication integration

**Firebase Admin** `^13.5.0`
- Server-side Firestore operations
- Admin SDK for privileged operations

**Google APIs** `^164.0.0`
- Google Calendar integration
- Service account authentication

### Document Processing

**Docxtemplater** `^3.66.7`
- Generate Word documents from templates
- Used for timesheet generation

**PizZip** `^3.2.0`
- ZIP file handling for .docx files
- Works with Docxtemplater

### Utilities

**date-fns** `^3.6.0`
- Date manipulation and formatting
- Timezone handling
- Date calculations

**browser-image-compression** `^2.0.2`
- Client-side image optimization
- Reduce file sizes before upload

---

## Development Dependencies

### Testing

**Jest** `^30.2.0`
- Unit and integration testing
- Code coverage reports

**@testing-library/react** `^16.3.0`
- Component testing utilities
- User interaction testing

**@testing-library/jest-dom** `^6.9.0`
- Custom Jest matchers for DOM

**@firebase/rules-unit-testing** `^3.0.1`
- Firestore security rules testing
- Firebase emulator integration

### Code Quality

**ESLint** `^8`
- Code linting and style enforcement
- Next.js configuration

**eslint-config-next** `14.2.5`
- Next.js-specific linting rules

### Security

**jose** `^6.1.3`
- JWT signing and verification
- Token validation in tests

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── calendar/       # Calendar operations
│   │   ├── send-emails/    # Email notifications
│   │   ├── timesheet/      # Timesheet generation
│   │   └── download-template/  # Template downloads
│   ├── calendar/           # Calendar page
│   ├── classes/            # Class management (teacher-only)
│   ├── dashboard/          # User dashboard
│   ├── maintenance/        # Maintenance mode page
│   ├── subjects/           # Subject management (teacher-only)
│   ├── tutorHours/         # Hours tracking (teacher/tutor)
│   ├── userRoles/          # User role management (teacher-only)
│   ├── layout.jsx          # Root layout
│   ├── loading.jsx         # Loading state
│   └── page.jsx            # Landing page
├── components/             # Reusable React components
├── contexts/              # React Context definitions
│   ├── AlertContext.jsx   # Global alerts
│   ├── AuthContext.jsx    # Authentication state
│   ├── CalendarDataContext.jsx  # Calendar data
│   └── CalendarUIContext.jsx    # Calendar UI state
├── firestore/             # Firestore operations
│   ├── firestoreAdmin.js  # Server-side Firestore
│   ├── firestoreClient.js # Client-side Firestore
│   ├── firestoreDashboard*.js  # Role-specific dashboards
│   ├── firestoreFetch.js  # Data fetching utilities
│   └── firestoreOperations.js  # CRUD operations
├── hooks/                 # Custom React hooks
│   ├── useAlert.js       # Alert management
│   ├── useAuthSession.js # Session handling
│   ├── useCalendarStrategy.js  # Calendar logic
│   └── useModalActionStrategy.js  # Modal actions
├── providers/            # Context providers
│   ├── AlertProvider.jsx
│   ├── AppSessionProvider.jsx
│   ├── AuthProvider.jsx
│   ├── CalendarDataProvider.jsx
│   └── CalendarUIProvider.jsx
├── strategy/             # Strategy pattern implementations
├── styles/               # Global styles and CSS
├── utils/                # Utility functions
└── middleware.js         # Next.js middleware (auth, RBAC)
```

---

## Architecture Patterns

### 1. Authentication Flow

> [!IMPORTANT]
> **NextAuth.js** handles all authentication with Microsoft OAuth integration.

**Flow:**
1. User clicks "Sign in with Microsoft"
2. Redirected to Microsoft login
3. OAuth callback returns user data
4. NextAuth.js creates session with JWT token
5. User role fetched from Firestore
6. Middleware validates token on protected routes

**Middleware Protection:**
- All routes except `/`, `/login`, and `/api/auth/*` require authentication
- Role-based route protection (teacher-only, teacher/tutor-only)
- Maintenance mode support

### 2. State Management

**Context API** is used for global state:
- `AuthContext` - User authentication state
- `AlertContext` - Toast notifications and alerts
- `CalendarDataContext` - Calendar events and data
- `CalendarUIContext` - Calendar view state and filters

**Custom Hooks** encapsulate logic:
- `useAuthSession` - Session management
- `useAlert` - Alert dispatching
- `useCalendarStrategy` - Calendar operations by role
- `useModalActionStrategy` - Modal CRUD operations

### 3. Data Layer

**Firestore Collections:**
- `users` - User profiles and roles
- `shifts` - Calendar events (tutoring/coaching)
- `classes` - Class definitions
- `subjects` - Subject definitions
- `timesheets` - Uploaded timesheet templates
- `emailQueue` - Notification queue

**Firestore Operations:**
- Client-side: Read-only for most users
- Server-side: Admin SDK for privileged operations
- Real-time listeners for dashboard updates

### 4. Security

**App Check with reCAPTCHA:**
- Protects Firestore from unauthorized access
- Validates client requests

**Firestore Security Rules:**
- Role-based read/write permissions
- Teacher-only write access
- Student read-only access

**Middleware Authorization:**
- JWT token validation
- Route-level role checks
- Automatic redirect for unauthorized access

---

## API Routes

### Authentication
- `POST /api/auth/signin` - Microsoft OAuth login
- `POST /api/auth/signout` - Logout

### Calendar
- `POST /api/calendar` - CRUD operations for events
- `GET /api/calendar/feed` - iCalendar feed export

### Email
- `POST /api/send-emails/[action]` - Send notifications

### Timesheet
- `POST /api/timesheet` - Generate timesheet document
- `GET /api/download-template` - Download timesheet templates

---

## Testing Strategy

### Unit Tests
```bash
npm run test
```
Tests components, hooks, and utilities in isolation.

### Firebase Tests
```bash
npm run test:firebase
```
Tests Firestore security rules using Firebase emulator.

### All Tests
```bash
npm run test:all
```
Runs both unit and Firebase tests.

### Coverage Report
```bash
npm run test:coverage
```
Generates code coverage report.

> [!TIP]
> Always use the Firebase emulator for local development:
> ```bash
> npm run dev
> ```

---

## Development Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start development server with Firebase emulator |
| **build** | `npm run build` | Production build (generates build version) |
| **start** | `npm start` | Start production server |
| **lint** | `npm run lint` | Run ESLint |
| **test** | `npm test` | Run unit tests |
| **test:firebase** | `npm run test:firebase` | Run Firestore security rules tests |
| **test:all** | `npm run test:all` | Run all tests |
| **test:watch** | `npm run test:watch` | Run tests in watch mode |
| **test:coverage** | `npm run test:coverage` | Generate coverage report |

---

## Key Features

### Role-Based Access Control (RBAC)

**Teacher Role:**
- Manage users and roles
- Create/edit/delete calendar events
- Manage classes and subjects
- View all tutor hours
- Generate timesheets
- Send email notifications

**Tutor Role:**
- View calendar (read-only)
- View personal hours summary
- Confirm shift attendance
- Request new shifts (requires approval)

**Student Role:**
- View calendar (read-only)
- Request tutoring sessions (requires approval)
- View personal upcoming sessions

### Calendar System

- **Multiple views:** Month, week, day, agenda
- **Event types:** Tutoring, coaching, other
- **Confirmation system:** Tutors confirm attendance
- **Approval workflow:** Student-created events require teacher approval
- **iCalendar export:** Subscribe to calendar in external apps

### Timesheet Generation

- Automatic calculation of hours worked
- Break time calculation (3-6 hours = 30 min, 6+ hours = 1 hour)
- Export to Word document format
- Separate templates for tutors and coaches
- Excluded short shifts notification

### Email Notifications

- Queue-based system
- Manual trigger (button-based)
- Sends to selected or all users
- Notification preferences per user

---

## Environment Variables

> [!IMPORTANT]
> Required environment variables for the application:

```bash
# NextAuth
NEXTAUTH_URL=https://talloc.kings.edu.au
NEXTAUTH_SECRET=<secret>

# Microsoft OAuth
MS_CLIENT_ID=<client-id>
MS_CLIENT_SECRET=<client-secret>

# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=<api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>

# Firebase Admin (Server-side)
FIREBASE_SERVICE_ACCOUNT_KEY=<base64-encoded-json>

# Google Calendar API
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<private-key>
GOOGLE_CALENDAR_ID=<calendar-id>
```

---

## Maintenance Mode

The application supports a maintenance mode that can be toggled in `src/middleware.js`:

```javascript
const MAINTENANCE_MODE = false; // Set to true to enable
```

When enabled, all users are redirected to `/maintenance` page.

---

## Performance Considerations

**Image Optimization:**
- Client-side compression before upload
- Reduces bandwidth and storage costs

**Code Splitting:**
- Next.js automatic code splitting
- Dynamic imports for heavy components

**Caching:**
- Next.js automatic static optimization
- Vercel edge caching for static assets

**Database Optimization:**
- Indexed queries for fast lookups
- Pagination for large datasets
- Real-time listeners only where needed

---

## Future Improvements

Potential areas for enhancement:

1. **Migrate to Firestore v2 modular SDK** for better tree-shaking
2. **Implement service workers** for offline support
3. **Add real-time notifications** with Firebase Cloud Messaging
4. **Enhance test coverage** (current target: 80%+)
5. **Add E2E tests** with Playwright or Cypress
6. **Implement analytics** with Firebase Analytics
7. **Add performance monitoring** with Firebase Performance

---

## Contact

For architecture-related questions:
- **Technical Lead:** mmei@kings.edu.au
- **Repository:** https://github.com/SoftwareDesignDevKings/Kings-Talloc
