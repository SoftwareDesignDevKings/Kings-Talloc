"use client";

import 'bootstrap/dist/css/bootstrap.min.css';

import React, { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "@components/Sidebar.jsx";
import { useAuthSession } from "@/hooks/auth/useAuthSession";

// Lazy load all heavy components to reduce initial bundle
const CalendarWrapper = lazy(() => import("@components/CalendarWrapper.jsx"));
const UserRolesManager = lazy(() => import("@components/UserRolesManager.jsx"));
const ClassList = lazy(() => import("@components/ClassList.jsx"));
const TutorHoursSummary = lazy(() => import("@components/TutorHoursSummary.jsx"));
const SubjectList = lazy(() => import("@components/SubjectList.jsx"));

const Dashboard = () =>  {
  const { session, userRole } = useAuthSession();
  const [activeSection, setActiveSection] = useState("calendar");

  let dashboardTitle = "Teacher Dashboard";
  if (userRole === "student") {
    dashboardTitle = "Student Dashboard";
  } else if (userRole === "tutor") {
    dashboardTitle = "Tutor Dashboard";
  }

  return (
    <div className="tw-flex tw-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
      <Sidebar
        setActiveSection={setActiveSection}
        userRole={userRole}
        user={session.user}
      />

      <div className="tw-flex-1 md:tw-p-4 tw-py-2 tw-px-1 tw-flex tw-flex-col tw-overflow-hidden">
        <div className="tw-bg-white tw-rounded-lg md:tw-shadow-lg md:tw-p-8 tw-p-2 tw-flex tw-flex-col tw-flex-1 tw-overflow-hidden">
          <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
            <div>
              <h1 className="tw-text-3xl tw-font-extrabold tw-text-gray-900">
                {dashboardTitle}
              </h1>
              <p className="tw-mt-2 tw-text-sm tw-text-gray-600">
                Signed in as {session.user.email}
              </p>
            </div>
          </div>
          <div className="tw-border-t tw-border-gray-200 tw-pt-4 tw-flex-1 tw-overflow-hidden">
            <Suspense fallback={
              <div className="tw-flex tw-items-center tw-justify-center tw-h-full tw-w-full">
                <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
                  <div className="tw-relative tw-w-16 tw-h-16">
                    <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-purple-200 tw-rounded-full"></div>
                    <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-transparent tw-border-t-purple-600 tw-rounded-full tw-animate-spin"></div>
                  </div>
                  <div className="tw-text-gray-700 tw-text-base tw-font-medium">Loading...</div>
                </div>
              </div>
            }>
              {activeSection === "calendar" && (
                <div className="tw-h-full tw-overflow-auto">
                  <CalendarWrapper
                    userRole={userRole}
                    userEmail={session.user.email}
                  />
                </div>
              )}
              {userRole === "teacher" && activeSection === "userRoles" && <UserRolesManager />}
              {userRole === "teacher" && activeSection === "classes" && <ClassList />}
              {userRole === "teacher" && activeSection === "subjects" && <SubjectList />}
              {userRole !== "student" && activeSection === "tutorHours" && (
                <TutorHoursSummary
                  userRole={userRole}
                  userEmail={session.user.email}
                />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard