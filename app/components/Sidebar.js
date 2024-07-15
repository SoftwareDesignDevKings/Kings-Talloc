import React, { useState } from 'react';
import { FiCalendar, FiUsers, FiBook, FiClock, FiUser, FiSettings } from 'react-icons/fi';
import { signOut } from 'next-auth/react';
import Settings from './Settings';

const Sidebar = ({ setActiveSection, userRole, user, calendarStartTime, calendarEndTime, setCalendarStartTime, setCalendarEndTime }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const toggleSettingsModal = () => setShowSettingsModal(!showSettingsModal);

  return (
    <div className="h-screen bg-white text-gray-900 shadow-lg w-64 flex flex-col justify-between">
      <div>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-indigo-600">Menu</h2>
        </div>
        <div className="flex-1">
          <ul className="mt-4 space-y-2">
            <li
              className="py-2 px-6 cursor-pointer hover:bg-indigo-100 flex items-center space-x-2"
              onClick={() => setActiveSection('calendar')}
            >
              <FiCalendar className="text-indigo-600" />
              <span>Calendar</span>
            </li>
            {userRole === 'teacher' && (
              <>
                <li
                  className="py-2 px-6 cursor-pointer hover:bg-indigo-100 flex items-center space-x-2"
                  onClick={() => setActiveSection('userRoles')}
                >
                  <FiUsers className="text-indigo-600" />
                  <span>User Roles</span>
                </li>
                <li
                  className="py-2 px-6 cursor-pointer hover:bg-indigo-100 flex items-center space-x-2"
                  onClick={() => setActiveSection('classes')}
                >
                  <FiBook className="text-indigo-600" />
                  <span>Manage Classes</span>
                </li>
              </>
            )}
            {userRole !== 'student' && (
              <li
                className="py-2 px-6 cursor-pointer hover:bg-indigo-100 flex items-center space-x-2"
                onClick={() => setActiveSection('tutorHours')}
              >
                <FiClock className="text-indigo-600" />
                <span>Tutor Hours</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 relative">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          {user.image ? (
            <img
              src={user.image}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <FiUser className="text-indigo-600" />
            </div>
          )}
          <span>{user.name}</span>
          <FiSettings className="text-indigo-600" />
        </div>
        {showProfileMenu && (
          <div className="mt-2 bg-white shadow-lg rounded-md p-4 absolute bottom-16 left-1/2 transform -translate-x-1/2 w-56">
            <button
              onClick={toggleSettingsModal}
              className="w-full px-4 py-2 mb-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Settings
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
      <Settings
        isOpen={showSettingsModal}
        onClose={toggleSettingsModal}
        calendarStartTime={calendarStartTime}
        calendarEndTime={calendarEndTime}
        setCalendarStartTime={setCalendarStartTime}
        setCalendarEndTime={setCalendarEndTime}
      />
    </div>
  );
};

export default Sidebar;
