import React from 'react';
import { FiCalendar, FiUserCheck, FiClock, FiBookOpen } from '@/components/icons';
import { getServerSession } from "next-auth";
import { redirect } from 'next/navigation';

const LandingPage = async () => {
  const session = await getServerSession();
  if (!session) {
    redirect('/login')
  } else {
    redirect('/dashboard')
  }
  
  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
      <div className="tw-w-full tw-max-w-4xl tw-p-8 tw-space-y-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
        <div className="tw-text-center">
          <h2 className="tw-mt-6 tw-text-4xl tw-font-extrabold tw-text-gray-900">Retalloc</h2>
          <p className="tw-mt-4 tw-text-lg tw-text-gray-600">
            Manage and schedule tutoring sessions effortlessly. Retalloc helps teachers, tutors, and students streamline the process of booking and managing educational sessions.
          </p>
        </div>
        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-mt-8">
          <div className="tw-flex tw-items-start tw-space-x-4">
            <FiCalendar className="tw-text-indigo-600" size={48} />
            <div>
              <h3 className="tw-text-2xl tw-font-bold tw-text-gray-900">Schedule Sessions</h3>
              <p className="tw-mt-2 tw-text-gray-600">
                Teachers can easily schedule and manage tutoring sessions for students.
              </p>
            </div>
          </div>
          <div className="tw-flex tw-items-start tw-space-x-4">
            <FiUserCheck className="tw-text-indigo-600" size={48} />
            <div>
              <h3 className="tw-text-2xl tw-font-bold tw-text-gray-900">Assign Tutors</h3>
              <p className="tw-mt-2 tw-text-gray-600">
                Assign the best tutors for each session based on their availability and expertise.
              </p>
            </div>
          </div>
          <div className="tw-flex tw-items-start tw-space-x-4">
            <FiClock className="tw-text-indigo-600" size={48} />
            <div>
              <h3 className="tw-text-2xl tw-font-bold tw-text-gray-900">Tutor Availability</h3>
              <p className="tw-mt-2 tw-text-gray-600">
                Tutors can mark their availability to help teachers and students plan sessions effectively.
              </p>
            </div>
          </div>
          <div className="tw-flex tw-items-start tw-space-x-4">
            <FiBookOpen className="tw-text-indigo-600" size={48} />
            <div>
              <h3 className="tw-text-2xl tw-font-bold tw-text-gray-900">Manage Classes</h3>
              <p className="tw-mt-2 tw-text-gray-600">
                Easily manage and organise classes and group sessions for students.
              </p>
            </div>
          </div>
        </div>
        <div className="tw-text-center tw-mt-8">
          <a
            className="tw-inline-block tw-px-6 tw-py-3 tw-text-lg tw-font-medium tw-text-white tw-bg-indigo-600 tw-rounded-md hover:tw-bg-indigo-700"
            href="/login"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

export default LandingPage