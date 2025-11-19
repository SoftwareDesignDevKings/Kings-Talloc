# Kings-Talloc

[![CI Pipeline](https://img.shields.io/badge/CI%20Pipeline-Passing-brightgreen?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/SoftwareDesignDevKings/Kings-Talloc/actions)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](<[https://firebase.google.com](https://console.firebase.google.com/u/1/project/kings-talloc-1f638/overview)>)

Kings-Talloc is a Tutor Allocation Web App developed by tutors in the CST Department.

**Live Deployment**: [https://kings-talloc.vercel.app](https://kings-talloc.vercel.app)

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
# Run all tests
npm run test:all

# Run Jest tests only
npm run test

# Run Firebase emulator tests only
npm run test:firebase
```

---

## Overview

Kings-Talloc streamlines tutor allocation and scheduling for the CST Department. Students request tutoring sessions, tutors manage availability, and teachers oversee allocations through an interactive calendar interface. Built with Next.js and Firebase Firestore, the system provides real-time updates with role-based access restricted to `@kings.edu.au`.

---

## Features

### Role-Based Access

- Student, Tutor, and Teacher roles with Google OAuth authentication
- Manual assignment of roles from 'Teacher' as Google OAuth does not give a role tag to identify.
- Restricted to `@kings.edu.au | @student.kings.edu.au` domains only

### Scheduling & Calendar

- Interactive calendar with drag-and-drop event management
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
> Tests are primarily for Firebase auth with 1 unit test configured.

**Pipeline Steps:**

- **Linting**: ESLint checks on every push/PR
- **Testing**: Jest unit tests and Firebase emulator security rules tests
- **Deployment**: Automatic deployment to Vercel on pushes to `main`

---

## MS Teams Integration

> [!WARNING]
> Integration with Microsoft Teams is currently under development and uses Power Automate as a temporary solution.

**Current Workflow:**

```
Teacher Approval → Email → PA Email Trigger → Parse Email Data → Create Teams Meeting
```

> [!IMPORTANT]
> Update email recipient to `computing@kings.edu.au` in the Power Automate workflow (currently set to `mmei@kings.edu.au`)

**Future Alternative:**

- Obtain app registration from ICT for direct Microsoft Graph API integration

---

## Known Issues

> [!CAUTION]
> The following technical issues have been identified and may be a problem in the future:

**1. React Big Calendar Performance**

- The calendar component is wrapped in a large wrapper, causing slow initial load times.

**2. Excessive Hook Usage**

- Numerous React hooks used throughout the application as a workaround for prop drilling

---
