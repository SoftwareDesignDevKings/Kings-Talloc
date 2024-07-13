import React from 'react';
import { FiCalendar, FiUsers, FiBook, FiClock } from 'react-icons/fi';

const Sidebar = ({ setActiveSection, userRole }) => {
  return (
    <div className="h-screen bg-white text-gray-900 shadow-lg w-64 flex flex-col">
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
          <li
            className="py-2 px-6 cursor-pointer hover:bg-indigo-100 flex items-center space-x-2"
            onClick={() => setActiveSection('tutorHours')}
          >
            <FiClock className="text-indigo-600" />
            <span>Tutor Hours</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
