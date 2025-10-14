# Kings-Talloc

Kings-Talloc is a Tutor Allocation Web App developed by tutors in the CST Department.  

---

## Features

**Role-Based Access**
- Student, Tutor, and Teacher roles with Google OAuth authentication (@kings.edu.au domains)

**Scheduling & Calendar**
- Interactive calendar with drag-and-drop event management
- Tutor availability tracking (tutoring, coaching, work)
- Student session requests with teacher approval workflow
- Real-time event updates via Firestore listeners

**Event Management**
- Create, edit, and delete tutoring/coaching sessions
- Track event completion status and hours
- Student confirmation system for group sessions
- Filter events by tutor, subject, and availability type

**Dashboard & Analytics**
- Role-specific overview cards showing upcoming events, pending approvals, and completion stats
- Weekly hours tracking for tutors (tutoring vs coaching)
- Active tutor utilization and subject distribution for teachers
- Quick approval dropdown for pending student requests

**Data Management**
- Subject and class management
- User role administration
- Hours summary and CSV export
- Firebase Firestore real-time database  

---

## MS Teams Integration

- Integration with Microsoft Teams is under development  
Currently uses Power Automate. 
Workflow:
Teacher Approval -> Email -> PA Email Trigger -> Parse Email Data -> Create Teams Meeting

Update email to computing@kings.edu.au in workflow instead of mmei@kings.edu.au

- Alternative - obtain app registration from ICT. 

---



