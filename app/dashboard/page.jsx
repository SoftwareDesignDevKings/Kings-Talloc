"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import CalendarWrapper from '@components/CalendarWrapper';
import NotLoggedIn from '@components/NotLoggedIn';
import Sidebar from '@components/Sidebar';
import UserRolesManager from '@components/UserRolesManager';
import ClassList from '@components/ClassList';
import TutorHoursSummary from '@components/TutorHoursSummary';
import SubjectList from '@components/SubjectList';
import { db } from '../../firebase/db';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import LoadingPage from '@components/LoadingPage';

const Dashboard = () => {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeSection, setActiveSection] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [calendarStartTime, setCalendarStartTime] = useState("06:00");
  const [calendarEndTime, setCalendarEndTime] = useState("22:00");

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    const checkUserInFirestore = async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: user.email,
            name: user.name,
            role: session.user.role || "student",
            calendarStartTime: "06:00",
            calendarEndTime: "22:00"
          });
          console.log('New user added to Firestore with role:', session.user.role || "student");
          setUserRole(session.user.role || "student");
        } else {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setCalendarStartTime(userData.calendarStartTime || "06:00");
          setCalendarEndTime(userData.calendarEndTime || "22:00");

          if (!userData.name) {
            await updateDoc(userRef, {
              name: user.name
            });
          }
        }
      }
    };

    if (status === 'authenticated' && session?.user) {
      checkUserInFirestore(session.user).then(() => {
        setLoading(false);
      });
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session]);

  const updateCalendarTimes = async (startTime, endTime) => {
    if (session?.user) {
      const userRef = doc(db, 'users', session.user.email);
      await updateDoc(userRef, {
        calendarStartTime: startTime,
        calendarEndTime: endTime
      });
    }
  };

  useEffect(() => {
    if (!loading) {
      updateCalendarTimes(calendarStartTime, calendarEndTime);
    }
  }, [calendarStartTime, calendarEndTime]);

  if (status === 'loading' || loading) {
    return <LoadingPage />;
  }

  if (status === 'unauthenticated') {
    return <NotLoggedIn />;
  }

  const dashboardTitle = userRole === 'student' ? 'Student Dashboard' : userRole === 'teacher' ? 'Teacher Dashboard' : 'Tutor Dashboard';

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
            {activeSection === 'calendar' && (
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
                {selectedDate && <p className="text-center mt-4 text-gray-700">Selected Date: {selectedDate.toString()}</p>}
              </div>
            )}
            {userRole === 'teacher' && activeSection === 'userRoles' && (
              <div className="h-full overflow-auto">
                <UserRolesManager />
              </div>
            )}
            {userRole === 'teacher' && activeSection === 'classes' && (
              <div className="h-full overflow-auto">
                <ClassList />
              </div>
            )}
            {userRole === 'teacher' && activeSection === 'subjects' && (
              <div className="h-full overflow-auto">
                <SubjectList />
              </div>
            )}
            {userRole !== 'student' && activeSection === 'tutorHours' && (
              <div className="h-full overflow-auto">
                <TutorHoursSummary userRole={userRole} userEmail={session.user.email} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
