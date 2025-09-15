import React from 'react';
import { FiCalendar, FiUserCheck, FiClock, FiBookOpen } from 'react-icons/fi';

export default function LandingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="w-full max-w-4xl p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-extrabold text-gray-900">Retalloc</h2>
          <p className="mt-4 text-lg text-gray-600">
            Manage and schedule tutoring sessions effortlessly. Retalloc helps teachers, tutors, and students streamline the process of booking and managing educational sessions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          <div className="flex items-start space-x-4">
            <FiCalendar className="text-indigo-600" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Schedule Sessions</h3>
              <p className="mt-2 text-gray-600">
                Teachers can easily schedule and manage tutoring sessions for students.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <FiUserCheck className="text-indigo-600" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Assign Tutors</h3>
              <p className="mt-2 text-gray-600">
                Assign the best tutors for each session based on their availability and expertise.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <FiClock className="text-indigo-600" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Tutor Availability</h3>
              <p className="mt-2 text-gray-600">
                Tutors can mark their availability to help teachers and students plan sessions effectively.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <FiBookOpen className="text-indigo-600" size={48} />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Manage Classes</h3>
              <p className="mt-2 text-gray-600">
                Easily manage and organise classes and group sessions for students.
              </p>
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <a
            href="/login"
            className="inline-block px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}
