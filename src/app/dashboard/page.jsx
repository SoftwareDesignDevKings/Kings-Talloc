"use client";

import React, { useState } from "react";
import CalendarWrapper from "@components/CalendarWrapper.jsx";
import Sidebar from "@components/Sidebar.jsx";
import UserRolesManager from "@components/UserRolesManager.jsx";
import ClassList from "@components/ClassList.jsx";
import TutorHoursSummary from "@components/TutorHoursSummary.jsx";
import SubjectList from "@components/SubjectList.jsx";
import LoadingPage from "@components/LoadingPage.jsx";
import { useUserRole } from "@/hooks/auth/useUserInfo";

const Dashboard = () =>  {
  const { session, userRole, loading } = useUserRole();
  const [activeSection, setActiveSection] = useState("calendar");

  // Show loading while fetching user role
  if (loading || !userRole) {
    return <LoadingPage withBackground={true} />;
  }

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

      <div className="tw-flex-1 tw-p-4 tw-flex tw-flex-col tw-overflow-hidden">
        <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-p-8 tw-flex tw-flex-col tw-flex-1 tw-overflow-hidden">
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard