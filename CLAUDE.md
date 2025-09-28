# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kings-Talloc is a tutor allocation web application for TKS Computing Studies Department. It manages tutor scheduling, teacher approval workflows, and student session requests using Next.js 14 with Firebase Firestore.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14.2.5 (App Router) with React 18
- **Authentication**: NextAuth.js v4 with Google OAuth
- **Database**: Firebase Firestore with real-time listeners
- **Styling**: Tailwind CSS 3.4.1 + Bootstrap 5.3.8
- **Calendar**: React Big Calendar for scheduling interface

### Key Directory Structure
```
app/                 # Next.js App Router pages and API routes
  api/auth/          # NextAuth configuration
  api/send-event/    # Event handling API
  api/send-emails/   # Email notification API
  dashboard/         # Main application pages
components/          # Reusable React components (27 files)
providers/           # Context providers (Session, Auth, Calendar)
firebase/            # Firestore configuration and utilities
hooks/               # Custom React hooks
meetings/            # MS Teams integration
```

### Provider Architecture
The app uses a multi-layered provider structure:
- `SessionProvider` (NextAuth) → `AuthProvider` (custom) → App components
- `CalendarDataProvider` manages calendar state across components
- All providers are configured in `app/layout.jsx`

### Path Aliases
Configured in `jsconfig.json`:
- `@components/*` → `./components/*`
- `@hooks/*` → `./hooks/*`
- `@providers/*` → `./providers/*`
- `@firebase/*` → `./firebase/*`

## Authentication & Authorization

- **Provider**: Google OAuth restricted to `kings.edu.au` and `student.kings.edu.au` domains (currently disabled for development)
- **Default Role**: Student users, with role-based access control
- **Session Management**: Handled through `AuthProvider.jsx` wrapping NextAuth's `SessionProvider`

## Database & Data Fetching

- **Primary DB**: Firebase Firestore
- **Configuration**: `firebase/db.js` for client, admin SDK for server operations
- **Utilities**: `firebase/fetchData.js` contains custom data fetching functions
- **Real-time**: Components use Firestore listeners for live updates

## Key Components

### Calendar System
- `CalendarWrapper.js` (17KB) - Main calendar component with custom event handling
- Supports multiple views and time slot management
- Integrates with student/tutor availability tracking

### Event Management
- `EventForm.js` (14KB) - Comprehensive event creation interface
- `StudentEventForm.js` - Student-specific event requests
- Teacher approval workflow integration

### Administrative Features
- `UserRolesManager.js` - User role management
- `ClassList.js`, `SubjectList.js` - Administrative data management
- Hours summary and reporting components

## MS Teams Integration

- **Current**: Email-triggered Power Automate workflow creates Teams meetings
- **Future**: Direct app registration with ICT department
- **Development**: Requires ngrok for local testing with Power Automate webhooks
- **Configuration**: Teams meeting creation in `meetings/` directory

## Environment Configuration

- **File**: `.env` (contains production credentials - security concern)
- **Firebase**: Service account key in `firebase/serviceAccountKey.json`
- **NextAuth**: Google OAuth client configuration
- **Development**: Domain restrictions currently bypassed

## Development Notes

### Current Branch
Working on `mm/tw/refactor/v1` branch focusing on authentication refactoring and provider architecture.

### Testing
No formal testing framework configured. Verify functionality through manual testing of calendar, authentication, and data flows.

### Security Considerations
- Production Firebase credentials are committed to repository
- Domain authentication bypassed for development
- Consider implementing proper environment variable management for production

### Common Development Patterns
- Use Firebase real-time listeners for data that needs live updates
- Maintain provider pattern for shared state (auth, calendar data)
- Follow Next.js App Router conventions for new pages
- Use Tailwind utility classes with custom dark mode support

## Deployment Considerations

- Power Automate webhook configuration required for Teams integration
- Firebase security rules should be reviewed before production
- Environment variables need proper production configuration
- Domain authentication restrictions should be re-enabled for production