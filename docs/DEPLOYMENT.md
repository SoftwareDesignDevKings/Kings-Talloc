# Deployment Guide

## Overview

The Tallocc application is deployed on Vercel and accessible via the official domain:

> [!IMPORTANT]
> **Production URL:** https://talloc.kings.edu.au/
>
> ICT has CNAME pointed this domain to the Vercel deployed app.

---

## Service Access

> [!IMPORTANT]
> All services are managed under **computing@kings.edu.au** or the **SoftwareDevKings** organization on GitHub.

### 1. GitHub Repository

**Organization:** [SoftwareDesignDevKings](https://github.com/SoftwareDesignDevKings)

**Repository:** https://github.com/SoftwareDesignDevKings/Kings-Talloc

### 2. Firebase / Firestore

**Console:** https://console.firebase.google.com/u/1/project/kings-talloc-1f638/overview

**Google Account:** computing@kings.edu.au

> [!TIP]
> For local development, use `npm run dev` to run the Firebase emulator instead of connecting to the production database.

### 3. reCAPTCHA App Check

**Admin Console:** https://www.google.com/u/1/recaptcha/admin/site/739611843

**Status:** Applied and active

### 4. Vercel

**Dashboard:** https://vercel.com/tkscsts-projects/kings-talloc/

**Account:** computing@kings.edu.au

---

## Repository Access

The repository is **public** with guardrails in place to protect the production environment.

> [!NOTE]
> **Student Access**
> - Students can **view and read** the code
> - Students **cannot make changes** that affect the live app
> - Any changes that affect deployment require **admin approval** on GitHub (e.g. must require at least ONE approval from the `Course_Development_Team`)

### Bypass Permissions

The following groups can bypass the deployment protection rules:
- **Admins**
- **Course_Software_Dev_Team** group members

> [!TIP]
> If you need to grant someone deployment permissions, add them to the `Course_Software_Dev_Team` group on GitHub.
>
> Contact **Foxwell** or **Rocco** if you need assistance with group management.

---

## Vercel Deployment

### GitHub-Vercel Integration

> [!IMPORTANT]
> Vercel links deployments to the **GitHub account** that made the most recent code change.
>
> The person who last updated the code needs to have their GitHub account connected to Vercel, otherwise the app **will not deploy**.

### Current Setup

The deployment is currently connected through the maintainer's GitHub account to ensure continuous deployments as new features and fixes are added.

### Vercel Team Plan Limitations

> [!WARNING]
> Vercel only allows multiple linked GitHub accounts on their **paid team plan**.
>
> **Cost:** Approximately **$30/month**

---

## Future Deployment Options

When transitioning maintainership or scaling the app, consider one of the following options:

1. **Migrate to an open-source or ICT-managed platform**
2. **Upgrade to Vercel Team Plan** (~$30/month)
   - Multiple team members can connect their GitHub accounts
   - Maintained Vercel integration and features

---

## Contact

For deployment-related questions or access requests:
- **GitHub Group Management:** Foxwell or Rocco
- **Deployment Issues:** Current repository maintainer - mmei@kings.edu.au
