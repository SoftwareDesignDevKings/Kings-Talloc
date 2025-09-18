import React, { useState, useEffect } from 'react';
import { db } from '../app/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import moment from 'moment';
import { CSVLink } from 'react-csv';
import LoadingPage from './LoadingPage';
import { FaInfoCircle } from 'react-icons/fa';

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
  const [loading, setLoading] = useState(false);

  const fetchTutorHours = async () => {
    setLoading(true);

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
            tutorHoursMap[staff.value] = { name: staff.label, hours: 0 };
          }
          let eventDuration = (event.end.seconds - event.start.seconds) / 3600;
          
          // Subtract break times
          if (eventDuration > 3 && eventDuration < 6) {
            eventDuration -= 0.5; // 3 < eventDuration < 6
          } else if (eventDuration >= 6) {
            eventDuration -= 1; // eventDuration >= 6
          }

          tutorHoursMap[staff.value].hours += eventDuration;
        }
      }
    }

    let tutorHoursArray = Object.entries(tutorHoursMap).map(([email, data]) => ({ email, ...data }));

    if (userRole === 'tutor') {
      tutorHoursArray = tutorHoursArray.filter(tutor => tutor.email === userEmail);
    }

    setTutorHours(tutorHoursArray);
    setLoading(false);
  };

  useEffect(() => {
    fetchTutorHours();
  }, [startDate, endDate]);

  const csvData = tutorHours.map(tutor => ({
    Email: tutor.email,
    Name: tutor.name,
    Hours: tutor.hours.toFixed(2)
  }));

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Tutor Hours Summary</h2>
      <div className="flex space-x-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <DatePicker selected={startDate} onChange={date => setStartDate(getMonday(date))} className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <DatePicker selected={endDate} onChange={date => setEndDate(new Date(date.setHours(23, 59, 59, 999)))} className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <CSVLink data={csvData} filename={`tutor_hours_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.csv`} className="mt-auto">
          <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Export as CSV
          </button>
        </CSVLink>
      </div>
      <div className="mb-4 p-4 border border-gray-300 bg-gray-100 rounded-md flex items-start space-x-2">
        <FaInfoCircle className="h-5 w-5 text-gray-500 mt-1" />
        <div className="text-sm text-gray-700 space-y-2">
          <p>Please check if the hours are correct by Friday. If there are any discrepancies, report them to Michael Ienna.</p>
          <p>Any given hours that are between 3 (exclusive) and 6 (inclusive) hours account for a 30-minute break. Any given hours that are greater than 6 (exclusive) account for a 1-hour break.</p>
        </div>
      </div>
      {loading ? (
        <LoadingPage withBackground={false} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Hours</th>
              </tr>
            </thead>
            <tbody>
              {tutorHours.map((tutor, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-2 px-4 text-sm text-gray-900">{tutor.email}</td>
                  <td className="py-2 px-4 text-sm text-gray-900">{tutor.name}</td>
                  <td className="py-2 px-4 text-sm text-gray-900">{tutor.hours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TutorHoursSummary;
