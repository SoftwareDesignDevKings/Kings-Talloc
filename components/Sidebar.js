"use client";

import React, { useState } from 'react';
import { FiCalendar, FiUsers, FiBook, FiClock, FiUser, FiSettings, FiChevronLeft, FiChevronRight, FiBookOpen } from 'react-icons/fi';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

const Sidebar = ({ setActiveSection, userRole, user }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className={`tw-h-screen tw-bg-white tw-text-gray-900 tw-shadow-lg tw-flex tw-flex-col tw-justify-between tw-transition-width tw-duration-300 ${isCollapsed ? 'tw-w-20' : 'tw-w-64'}`}>
      <div>
        <div className="tw-p-6 tw-flex tw-justify-between tw-items-center">
          {!isCollapsed && <h2 className="tw-text-2xl tw-font-bold tw-text-indigo-600">Menu</h2>}
          <button onClick={toggleSidebar} className="tw-text-indigo-600">
            {isCollapsed ? <FiChevronRight size={24} /> : <FiChevronLeft size={24} />}
          </button>
        </div>
        <div className="tw-flex-1">
          <ul className="tw-mt-4 tw-space-y-2 tw-list-none tw-pl-0">
            <li
              className={`tw-py-2 tw-px-6 tw-cursor-pointer hover:tw-bg-indigo-100 tw-flex tw-items-center ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
              onClick={() => setActiveSection('calendar')}
            >
              <FiCalendar className="tw-text-indigo-600" />
              {!isCollapsed && <span>Calendar</span>}
            </li>
            {userRole === 'teacher' && (
              <>
                <li
                  className={`tw-py-2 tw-px-6 tw-cursor-pointer hover:tw-bg-indigo-100 tw-flex tw-items-center ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
                  onClick={() => setActiveSection('userRoles')}
                >
                  <FiUsers className="tw-text-indigo-600" />
                  {!isCollapsed && <span>User Roles</span>}
                </li>
                <li
                  className={`tw-py-2 tw-px-6 tw-cursor-pointer hover:tw-bg-indigo-100 tw-flex tw-items-center ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
                  onClick={() => setActiveSection('classes')}
                >
                  <FiBook className="tw-text-indigo-600" />
                  {!isCollapsed && <span>Manage Classes</span>}
                </li>
              </>
            )}
            {userRole === 'teacher' && (
              <li
                className={`tw-py-2 tw-px-6 tw-cursor-pointer hover:tw-bg-indigo-100 tw-flex tw-items-center ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
                onClick={() => setActiveSection('subjects')}
              >
                <FiBookOpen className="tw-text-indigo-600" />
                {!isCollapsed && <span>Manage Subjects</span>}
              </li>
            )}
            {userRole !== 'student' && (
              <li
                className={`tw-py-2 tw-px-6 tw-cursor-pointer hover:tw-bg-indigo-100 tw-flex tw-items-center ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
                onClick={() => setActiveSection('tutorHours')}
              >
                <FiClock className="tw-text-indigo-600" />
                {!isCollapsed && <span>Tutor Hours</span>}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="tw-p-4 tw-border-t tw-border-gray-200 tw-relative">
        <div
          className={`tw-flex tw-items-center tw-cursor-pointer ${isCollapsed ? 'tw-justify-center' : 'tw-space-x-2'}`}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          {user?.image ? (
            <Image
              src={user.image}
              alt="Profile"
              width={32}
              height={32}
              className="tw-rounded-full"
            />
          ) : (
            <div className="tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-200 tw-flex tw-items-center tw-justify-center">
              <FiUser className="tw-text-indigo-600" />
            </div>
          )}
          {!isCollapsed && <span>{user.name}</span>}
          {!isCollapsed && <FiSettings className="tw-text-indigo-600" />}
        </div>
        {showProfileMenu && (
          <div className={`tw-mt-2 tw-bg-white tw-shadow-lg tw-rounded-md tw-p-4 tw-absolute tw-bottom-16 tw-z-50 ${isCollapsed ? 'tw-left-0' : 'tw-left-1/2 tw-transform tw--translate-x-1/2'} tw-w-56`}>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="tw-w-full tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
