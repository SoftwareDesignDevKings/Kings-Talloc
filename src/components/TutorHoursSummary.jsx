"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/firestore/clientFirestore';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CSVLink } from 'react-csv';
import { FaInfoCircle } from '@/components/icons';

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const TutorHoursSummary = ({ userRole, userEmail }) => {
  const [startDate, setStartDate] = useState(getMonday(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  });
  const [tutorHours, setTutorHours] = useState([]);

  const fetchTutorHours = async () => {

    const q = query(
      collection(db, 'events'),
      where('start', '>=', startDate),
      where('end', '<=', endDate),
      orderBy('start')
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    const tutorHoursMap = {};

    for (const event of events) {
      if (event.createdByStudent && event.approvalStatus !== 'approved') {
        continue;
      }

      // Only count events with workStatus set to 'completed'
      if (event.workStatus !== 'completed') {
        continue;
      }

      for (const staff of event.staff) {
        const isConfirmed = event.confirmationRequired
          ? event.tutorResponses.some(response => response.email === staff.value && response.response)
          : true;

        if (isConfirmed) {
          if (!tutorHoursMap[staff.value]) {
            tutorHoursMap[staff.value] = { name: staff.label, tutoringHours: 0, coachingHours: 0 };
          }
          let eventDuration = (event.end.seconds - event.start.seconds) / 3600;

          // Subtract break times
          if (eventDuration > 3 && eventDuration < 6) {
            eventDuration -= 0.5; // 3 < eventDuration < 6
          } else if (eventDuration >= 6) {
            eventDuration -= 1; // eventDuration >= 6
          }

          // Add to appropriate category based on workType
          if (event.workType === 'coaching') {
            tutorHoursMap[staff.value].coachingHours += eventDuration;
          } else {
            // Default to tutoring if not specified
            tutorHoursMap[staff.value].tutoringHours += eventDuration;
          }
        }
      }
    }

    let tutorHoursArray = Object.entries(tutorHoursMap).map(([email, data]) => ({ email, ...data }));

    if (userRole === 'tutor') {
      tutorHoursArray = tutorHoursArray.filter(tutor => tutor.email === userEmail);
    }

    setTutorHours(tutorHoursArray);
  };

  useEffect(() => {
    fetchTutorHours();
  }, [startDate, endDate]);

  const csvData = tutorHours.map(tutor => ({
    Email: tutor.email,
    Name: tutor.name,
    'Tutoring Hours': tutor.tutoringHours.toFixed(2),
    'Coaching Hours': tutor.coachingHours.toFixed(2),
    'Total Hours': (tutor.tutoringHours + tutor.coachingHours).toFixed(2)
  }));

  return (
    <div className="tw-p-4 sm:tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
      <h2 className="tw-text-xl sm:tw-text-2xl tw-font-bold tw-mb-4 tw-text-indigo-600">Tutor Hours Summary</h2>
      <div className="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-end sm:tw-space-x-4 tw-space-y-3 sm:tw-space-y-0 tw-mb-4">
        <div className="tw-w-full sm:tw-w-auto">
          <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Start Date</label>
          <DatePicker selected={startDate} onChange={date => setStartDate(getMonday(date))} className="tw-mt-1 tw-p-2 tw-w-full tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm" />
        </div>
        <div className="tw-w-full sm:tw-w-auto">
          <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">End Date</label>
          <DatePicker selected={endDate} onChange={date => setEndDate(new Date(date.setHours(23, 59, 59, 999)))} className="tw-mt-1 tw-p-2 tw-w-full tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm" />
        </div>
        <CSVLink data={csvData} filename={`tutor_hours_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.csv`} className="tw-w-full sm:tw-w-auto">
          <button className="tw-w-full tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500">
            Export as CSV
          </button>
        </CSVLink>
      </div>
      <div className="tw-mb-4 tw-p-3 sm:tw-p-4 tw-border tw-border-gray-300 tw-bg-gray-100 tw-rounded-md tw-flex tw-items-start tw-space-x-2">
        <FaInfoCircle className="tw-h-5 tw-w-5 tw-text-gray-500 tw-mt-0.5 tw-flex-shrink-0" />
        <div className="tw-text-xs sm:tw-text-sm tw-text-gray-700 tw-space-y-2">
          <p>Please check if the hours are correct by Friday. If there are any discrepancies, report them to Michael Ienna.</p>
          <p>Any given hours that are between 3 (exclusive) and 6 (inclusive) hours account for a 30-minute break. Any given hours that are greater than 6 (exclusive) account for a 1-hour break.</p>
        </div>
      </div>
      {
        <div className="tw-overflow-x-auto tw--mx-4 sm:tw-mx-0">
          <div className="tw-inline-block tw-min-w-full tw-align-middle">
            <table className="tw-min-w-full tw-bg-white">
              <thead>
                <tr>
                  <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Email</th>
                  <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Name</th>
                  <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Tutoring</th>
                  <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Coaching</th>
                  <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {tutorHours.map((tutor, index) => (
                  <tr key={index} className="tw-border-b tw-border-gray-200">
                    <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm tw-text-gray-900 tw-break-all">{tutor.email}</td>
                    <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm tw-text-gray-900">{tutor.name}</td>
                    <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm tw-text-gray-900">{tutor.tutoringHours.toFixed(2)}</td>
                    <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm tw-text-gray-900">{tutor.coachingHours.toFixed(2)}</td>
                    <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm tw-text-gray-900 tw-font-semibold">{(tutor.tutoringHours + tutor.coachingHours).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  );
};

export default TutorHoursSummary;
