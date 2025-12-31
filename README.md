# Kings-Talloc

[![CI Pipeline](https://img.shields.io/badge/CI%20Pipeline-Passing-brightgreen?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/SoftwareDesignDevKings/Kings-Talloc/actions)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.7-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://console.firebase.google.com/u/1/project/kings-talloc-1f638/overview)

Kings-Talloc is a Tutor Allocation Web App developed by tutors in the CST Department.

**Live Deployment**: [https://talloc.kings.edu.au](https://talloc.kings.edu.au)

**Vercel Project**: Hosted under CST projects at [vercel.com/tkscsts-projects/kings-talloc](https://vercel.com/tkscsts-projects/kings-talloc)

---

## Quick Start

[![Install Dependencies](https://img.shields.io/badge/Install-Dependencies-4CAF50?style=for-the-badge&logo=npm&logoColor=white)](#installation)
[![Run Development Server](https://img.shields.io/badge/Run-Dev%20Server-FF9800?style=for-the-badge&logo=next.js&logoColor=white)](#running-the-app)
[![Run Tests](https://img.shields.io/badge/Run-Tests-2196F3?style=for-the-badge&logo=jest&logoColor=white)](#testing)

### Installation

```bash
npm install
```

### Running the App

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Testing

```bash
# run all tests
npm run test:all

# run Jest tests only
npm run test

# run Firebase emulator tests only
npm run test:firebase
```
---

## Overview

Kings-Talloc streamlines tutor allocation and scheduling for the CST Department. Students request tutoring sessions, tutors manage availability, and teachers oversee allocations through a calendar interface. 

Built with Next.js and Firebase Firestore, the system provides real-time updates with role-based access restricted to `@kings.edu.au`.

---

## Features
Kings-Talloc is built with React Big Calendar. 
Old version was styled using tailwind CSS and now integrated with Bootstrap for responsiveness and accessibility features. 

### NextAuth
- Student, Tutor, and Teacher roles assigned after MS OAuth login. 
- Manual assignment of roles from 'Teacher' as ICT scope does not give role identity. 
    - Entra Tennant restricted to `@kings.edu.au | @student.kings.edu.au` domains only

- Integrated with Firebase Auth to ensure only users of the app can access the firestore database.
- Production ReCapture integrated to ensure origin of all requests. 

### Scheduling & Calendar
Built with React Big Calendar
- Drag-and-drop event management
- Tutor availability tracking (tutoring, coaching, work)
- Student session requests with teacher approval workflow
- Real-time event updates via Firestore listeners

### Event Management
- Create, edit, and delete tutoring/coaching sessions
- Track event completion status and hours
- Student confirmation system for group sessions
- Filter events by tutor, subject, and availability type

### Dashboard & Analytics
- Role-specific overview cards showing upcoming events, pending approvals, and completion stats
- Weekly hours tracking for tutors (tutoring vs coaching)
- Active tutor utilisation and subject distribution for teachers
- Quick approval dropdown for pending student requests

### Data Management

- Subject and class management
- User role administration
- Hours summary and CSV export
- Firebase Firestore real-time database

---

## CI/CD Pipeline

> [!NOTE]
> The project uses **GitHub Actions** for continuous integration. All tests must pass before code can be merged.
> Tests are primarily for Firebase auth with 1 unit test configured for future integration. 

**Pipeline Steps:**

- **Linting**: ESLint checks on every push/PR
- **Testing**: Jest unit tests and Firebase emulator security rules tests
- **Deployment**: Automatic deployment to Vercel on pushes to `main`

---

## MS Teams Integration
> [!IMPORTANT]
> Microsoft Teams is now fully integrated via Microsoft Graph API on Kings-Talloc. 

**Features:**

- Automatic Teams meeting creation when events are approved
- Recurring meeting series support
- Meeting updates sync with event changes (time, attendees, etc.)
- Meeting deletion when events are cancelled

**Deployment:**

- ICT has CNAME pointed [talloc.kings.edu.au](https://talloc.kings.edu.au) to deployed version on Vercel at [kings-talloc.vercel.app](https://kings-talloc.vercel.app)
- All code pushed to `main` is automatically deployed on Vercel. 

---

## Future Fixes
> [!NOTE]
> The following improvements are planned for future development:

**1. React Big Calendar Performance** ✅ **(Resolved)**
- ~~Initial design was `/dashboard` was designed around SPA (initial slow load time, fast interactivity after Next.js hydrates the app).~~
- ~~Components for `CalendarWrapper` and `TutorHoursSummary` could be split into seperate page.jsx.~~
- **Status**: Migrated to Next.js app router with separate pages (`/calendar`, `/tutorHours`)
- **Future optimisation**: Split Firestore fetches into date ranges rather than fetching all events at once for improved performance with large datasets

**2. Context Provider Optimisation**
- Multiple nested providers may cause unnecessary re-renders
- Consider consolidating or memoising provider values

**3. Styling**
- Bootstrap was integrated to quickly develop a responsive UI for the redesign of the old app. 
- Migration completely away from tailwind to bootstrap will speed up load times as there will be no CSS styles conflicting with bootstrap. 
