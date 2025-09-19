"use client";

import React, { useState } from "react";
import CalendarWrapper from "@components/CalendarWrapper";
import Sidebar from "@components/Sidebar";
import UserRolesManager from "@components/UserRolesManager";
import ClassList from "@components/ClassList";
import TutorHoursSummary from "@components/TutorHoursSummary";
import SubjectList from "@components/SubjectList";
import { useUserRole } from "@/hooks/useUserInfo";

const Dashboard = () => {
  const { status, session, loading, userRole } = useUserRole();
  // 👇 keep these here for CalendarWrapper props
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeSection, setActiveSection] = useState("calendar");
  const [calendarStartTime, setCalendarStartTime] = useState("06:00");
  const [calendarEndTime, setCalendarEndTime] = useState("22:00");

  const handleDateChange = (date) => setSelectedDate(date);

  let dashboardTitle = "Teacher Dashboard";
  if (userRole === "student") {
    dashboardTitle = "Student Dashboard";
  } else if (userRole === "tutor") {
    dashboardTitle = "Tutor Dashboard";
  }

  return (
    <div className="flex h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <Sidebar
        setActiveSection={setActiveSection}
        userRole={userRole}
        user={session.user}
        calendarStartTime={calendarStartTime}
        calendarEndTime={calendarEndTime}
        setCalendarStartTime={setCalendarStartTime}
        setCalendarEndTime={setCalendarEndTime}
      />
      <div className="flex-1 p-4 flex flex-col overflow-hidden">
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col flex-1 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">{dashboardTitle}</h1>
              <p className="mt-2 text-sm text-gray-600">Signed in as {session.user.email}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 flex-1 overflow-hidden">
            {activeSection === "calendar" && (
              <div className="h-full overflow-auto">
                <CalendarWrapper
                  events={events}
                  setEvents={setEvents}
                  onDateChange={handleDateChange}
                  userRole={userRole}
                  userEmail={session.user.email}
                  calendarStartTime={calendarStartTime}
                  calendarEndTime={calendarEndTime}
                />
                {selectedDate && (
                  <p className="text-center mt-4 text-gray-700">
                    Selected Date: {selectedDate.toString()}
                  </p>
                )}
              </div>
            )}
            {userRole === "teacher" && activeSection === "userRoles" && <UserRolesManager />}
            {userRole === "teacher" && activeSection === "classes" && <ClassList />}
            {userRole === "teacher" && activeSection === "subjects" && <SubjectList />}
            {userRole !== "student" && activeSection === "tutorHours" && (
              <TutorHoursSummary userRole={userRole} userEmail={session.user.email} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
