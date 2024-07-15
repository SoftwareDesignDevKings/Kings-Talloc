"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import CalendarWrapper from '../components/CalendarWrapper';
import NotLoggedIn from '../components/NotLoggedIn';
import Sidebar from '../components/Sidebar';
import UserRolesManager from '../components/UserRolesManager';
import ClassList from '../components/ClassList';
import TutorHoursSummary from '../components/TutorHoursSummary';
import { db } from '../firebase'; // Ensure this points to your Firebase configuration
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const Dashboard = () => {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeSection, setActiveSection] = useState('calendar');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [calendarStartTime, setCalendarStartTime] = useState("00:00");
  const [calendarEndTime, setCalendarEndTime] = useState("23:59");

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    const checkUserInFirestore = async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          // Add user to Firestore with a default role of 'student'
          await setDoc(userRef, {
            email: user.email,
            name: user.name, // Store the full name
            role: 'student'
          });
          setUserRole('student');
        } else {
          const userData = userDoc.data();
          setUserRole(userData.role);

          // Update user's name if it's not set
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
        setLoading(false); // Stop loading once the Firestore check is complete
      });
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [status, session]);

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <NotLoggedIn />;
  }

  const dashboardTitle = userRole === 'student' ? 'Student Dashboard' : userRole === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard';

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
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign out
            </button>
          </div>
          <div className="border-t border-gray-200 pt-4 flex-1 overflow-auto">
            {activeSection === 'calendar' && (
              <div className="h-full">
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
              <div className="h-full">
                <UserRolesManager />
              </div>
            )}
            {userRole === 'teacher' && activeSection === 'classes' && (
              <div className="h-full">
                <ClassList />
              </div>
            )}
            {userRole !== 'student' && activeSection === 'tutorHours' && (
              <div className="h-full">
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
