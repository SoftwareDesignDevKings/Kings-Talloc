"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firestore/clientFirestore';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CSVLink } from 'react-csv';
import { FaInfoCircle } from '@/components/icons';
import useAlert from '@/hooks/useAlert';

const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const calculateBreakTime = (totalHours) => {
  if (totalHours > 3 && totalHours <= 6) {
    return 0.5;
  } else if (totalHours > 6) {
    return 1;
  }
  return 0;
};

const isEventValid = (event) => {
  if (event.createdByStudent && event.approvalStatus !== 'approved') {
    return false;
  }
  if (event.workStatus !== 'completed') {
    return false;
  }
  return true;
};

const isTutorConfirmed = (event, tutorEmail) => {
  return event.confirmationRequired
    ? event.tutorResponses.some(response => response.email === tutorEmail && response.response)
    : true;
};

/**
 * Component to display and manage tutor hours summary
 */
const TutorHoursSummary = ({ userRole, userEmail }) => {
  const { setAlertMessage, setAlertType } = useAlert();
  const [startDate, setStartDate] = useState(getMonday(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  });
  const [tutorHours, setTutorHours] = useState([]);
  const [excludedShifts, setExcludedShifts] = useState(null);

  const fetchTutorHours = useCallback(async () => {
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
      if (!isEventValid(event)) {
        continue;
      }

      for (const staff of event.staff) {
        if (!isTutorConfirmed(event, staff.value)) {
          continue;
        }

        if (!tutorHoursMap[staff.value]) {
          tutorHoursMap[staff.value] = { name: staff.label, tutoringHours: 0, coachingHours: 0 };
        }

        // Calculate event duration in hours
        let eventDuration = (event.end.seconds - event.start.seconds) / 3600;
        const breakTime = calculateBreakTime(eventDuration);
        eventDuration -= breakTime;

        // Add to appropriate category based on workType
        if (event.workType === 'coaching') {
          tutorHoursMap[staff.value].coachingHours += eventDuration;
        } else {
          tutorHoursMap[staff.value].tutoringHours += eventDuration;
        }
      }
    }
    
    // map hours to array & filter by user role
    let tutorHoursArray = Object.entries(tutorHoursMap).map(([email, data]) => ({ email, ...data }));
    if (userRole === 'tutor') {
      tutorHoursArray = tutorHoursArray.filter(tutor => tutor.email === userEmail);
    }

    setTutorHours(tutorHoursArray);
  }, [startDate, endDate, userRole, userEmail]);

  useEffect(() => {
    fetchTutorHours();
  }, [startDate, endDate, fetchTutorHours]);

  const csvData = tutorHours.map(tutor => ({
    Email: tutor.email,
    Name: tutor.name,
    'Tutoring Hours': tutor.tutoringHours.toFixed(2),
    'Coaching Hours': tutor.coachingHours.toFixed(2),
    'Total Hours': (tutor.tutoringHours + tutor.coachingHours).toFixed(2)
  }));

  const fetchTimesheetEvents = async (tutorEmail) => {
    const q = query(
      collection(db, 'events'),
      where('start', '>=', startDate),
      where('end', '<=', endDate),
      orderBy('start')
    );

    const querySnapshot = await getDocs(q);
    const events = querySnapshot.docs.map(doc => doc.data());

    return events.filter(event => {
      if (!isEventValid(event)) return false;

      const isStaffMember = event.staff.some(staff => staff.value === tutorEmail);
      if (!isStaffMember) return false;

      return isTutorConfirmed(event, tutorEmail);
    });
  };

  const buildDayData = (events, minShiftHours = 3) => {
    const dayData = {};
    const excludedEvents = {};

    for (const event of events) {
      const eventStartDate = new Date(event.start.seconds * 1000);
      const eventEndDate = new Date(event.end.seconds * 1000);
      const dayName = eventStartDate.toLocaleDateString('en-US', { weekday: 'long' });
      const eventDuration = (event.end.seconds - event.start.seconds) / 3600;

      if (!dayData[dayName]) {
        dayData[dayName] = {
          date: eventStartDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          mainShifts: [], // >= minShiftHours
          shortEvents: [], // < minShiftHours
          totalDuration: 0
        };
      }

      // Categorize events
      if (eventDuration >= minShiftHours) {
        dayData[dayName].mainShifts.push({
          start: eventStartDate,
          end: eventEndDate,
          duration: eventDuration
        });
      } else {
        dayData[dayName].shortEvents.push({
          start: eventStartDate,
          end: eventEndDate,
          duration: eventDuration
        });
      }
    }

    // Process each day to determine what to include
    for (const [dayName, data] of Object.entries(dayData)) {
      if (data.mainShifts.length > 0) {
        // Has main shifts (>=minShiftHours) - use earliest main shift start
        const sortedShifts = data.mainShifts.sort((a, b) => a.start - b.start);
        data.earliestStart = sortedShifts[0].start;

        const shortEventsTotal = data.shortEvents.reduce((sum, e) => sum + e.duration, 0);
        const mainShiftsTotal = data.mainShifts.reduce((sum, e) => sum + e.duration, 0);

        // Adjust finish time: latest main shift end + additional short events duration
        data.latestEnd = new Date(sortedShifts[sortedShifts.length - 1].end.getTime() + (shortEventsTotal * 3600 * 1000));
        data.totalDuration = mainShiftsTotal + shortEventsTotal;
      } else {
        // No main shifts - check if short events add up to >= minShiftHours
        const shortEventsTotal = data.shortEvents.reduce((sum, e) => sum + e.duration, 0);

        if (shortEventsTotal >= minShiftHours) {
          // Use start time of first event and add up durations to calculate end time
          const sortedEvents = data.shortEvents.sort((a, b) => a.start - b.start);
          data.earliestStart = sortedEvents[0].start;
          data.latestEnd = new Date(sortedEvents[0].start.getTime() + (shortEventsTotal * 3600 * 1000));
          data.totalDuration = shortEventsTotal;
        } else {
          // Exclude this day - track for manual entry (pop-up)
          if (!excludedEvents[dayName]) {
            excludedEvents[dayName] = [];
          }
          excludedEvents[dayName] = data.shortEvents;
          delete dayData[dayName];
        }
      }
    }

    return { dayData, excludedEvents };
  };

  const processDayData = (dayData) => {
    const hoursData = {
      Monday: { date: '', commenced: '', finished: '', break: '', total: 0 },
      Tuesday: { date: '', commenced: '', finished: '', break: '', total: 0 },
      Wednesday: { date: '', commenced: '', finished: '', break: '', total: 0 },
      Thursday: { date: '', commenced: '', finished: '', break: '', total: 0 },
      Friday: { date: '', commenced: '', finished: '', break: '', total: 0 }
    };

    for (const [dayName, data] of Object.entries(dayData)) {
      const totalHours = (data.latestEnd - data.earliestStart) / (1000 * 60 * 60);
      const breakTime = calculateBreakTime(totalHours);

      hoursData[dayName] = {
        date: data.date,
        commenced: data.earliestStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        finished: data.latestEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        break: breakTime > 0 ? breakTime.toFixed(1) : '',
        total: totalHours.toFixed(2)
      };
    }

    return hoursData;
  };

  const downloadTimesheet = async (tutorName, hoursData) => {
    const response = await fetch('/api/timesheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorName: tutorName,
        hoursData: hoursData
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate timesheet');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tutorName}-timesheet.docx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleGenerateTimesheet = async (tutorEmail, tutorName) => {
    try {
      const tutor = tutorHours.find(t => t.email === tutorEmail);
      if (!tutor) return;

      const events = await fetchTimesheetEvents(tutorEmail);
      const { dayData, excludedEvents } = buildDayData(events);
      const hoursData = processDayData(dayData);

      // Set excluded shifts for display
      if (Object.keys(excludedEvents).length > 0) {
        setExcludedShifts(excludedEvents);
        setAlertType('info');
        setAlertMessage('Some short shifts (<3 hours) exist and need to be manually added. See details below.');
      } else {
        setExcludedShifts(null);
      }

      await downloadTimesheet(tutorName, hoursData);
    } catch (error) {
      console.error('Error generating timesheet:', error);
      setAlertType('error');
      setAlertMessage('Error generating timesheet');
    }
  };

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
      {excludedShifts && (
        <div className="tw-mb-4 tw-p-3 sm:tw-p-4 tw-border tw-border-blue-300 tw-bg-blue-50 tw-rounded-md tw-flex tw-items-start tw-space-x-2">
          <FaInfoCircle className="tw-h-5 tw-w-5 tw-text-blue-500 tw-mt-0.5 tw-flex-shrink-0" />
          <div className="tw-text-xs sm:tw-text-sm tw-text-blue-900 tw-space-y-2">
            <p className="tw-font-semibold">Short shifts (&lt;3 hours) excluded - Add manually:</p>
            {Object.entries(excludedShifts).map(([day, events]) => (
              <div key={day} className="tw-mt-2">
                <p className="tw-font-medium">{day}:</p>
                <ul className="tw-list-disc tw-list-inside tw-ml-2">
                  {events.map((e, idx) => (
                    <li key={idx}>
                      {e.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {e.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} ({e.duration.toFixed(2)} hrs)
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
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
                  {userRole === 'teacher' && (
                    <th className="tw-py-2 tw-px-2 sm:tw-px-4 tw-bg-gray-200 tw-text-left tw-text-xs sm:tw-text-sm tw-font-medium tw-text-gray-700">Actions</th>
                  )}
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
                    {userRole === 'teacher' && (
                      <td className="tw-py-2 tw-px-2 sm:tw-px-4 tw-text-xs sm:tw-text-sm">
                        <button
                          onClick={() => handleGenerateTimesheet(tutor.email, tutor.name)}
                          className="tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-text-white tw-bg-blue-600 tw-rounded hover:tw-bg-blue-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-blue-500"
                        >
                          Generate Timesheet
                        </button>
                      </td>
                    )}
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
