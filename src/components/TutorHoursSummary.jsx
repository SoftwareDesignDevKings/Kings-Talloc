'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firestore/firestoreClient';
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
        ? event.tutorResponses.some(
              (response) => response.email === tutorEmail && response.response,
          )
        : true;
};

/**
 * Component to display and manage tutor hours summary
 */
const TutorHoursSummary = ({ userRole, userEmail }) => {
    const { addAlert } = useAlert();
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
            collection(db, 'shifts'),
            where('start', '>=', startDate),
            where('end', '<=', endDate),
            orderBy('start'),
        );

        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map((doc) => doc.data());

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
                    tutorHoursMap[staff.value] = {
                        name: staff.label,
                        tutoringHours: 0,
                        coachingHours: 0,
                    };
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
        let tutorHoursArray = Object.entries(tutorHoursMap).map(([email, data]) => ({
            email,
            ...data,
        }));
        if (userRole === 'tutor') {
            tutorHoursArray = tutorHoursArray.filter((tutor) => tutor.email === userEmail);
        }

        setTutorHours(tutorHoursArray);
    }, [startDate, endDate, userRole, userEmail]);

    useEffect(() => {
        fetchTutorHours();
    }, [startDate, endDate, fetchTutorHours]);

    const csvData = tutorHours.map((tutor) => ({
        Email: tutor.email,
        Name: tutor.name,
        'Tutoring Hours': tutor.tutoringHours.toFixed(2),
        'Coaching Hours': tutor.coachingHours.toFixed(2),
        'Total Hours': (tutor.tutoringHours + tutor.coachingHours).toFixed(2),
    }));

    const fetchTimesheetEvents = async (tutorEmail) => {
        const q = query(
            collection(db, 'shifts'),
            where('start', '>=', startDate),
            where('end', '<=', endDate),
            orderBy('start'),
        );

        const querySnapshot = await getDocs(q);
        const events = querySnapshot.docs.map((doc) => doc.data());

        return events.filter((event) => {
            if (!isEventValid(event)) return false;

            const isStaffMember = event.staff.some((staff) => staff.value === tutorEmail);
            if (!isStaffMember) return false;

            return isTutorConfirmed(event, tutorEmail);
        });
    };

    const buildDayData = (events, minShiftHours = 3) => {
        const dayData = {};
        const excludedEvents = {};

        // Group events by day and categorize them
        for (const event of events) {
            const eventStartDate = new Date(event.start.seconds * 1000);
            const eventEndDate = new Date(event.end.seconds * 1000);
            const dayName = eventStartDate.toLocaleDateString('en-US', { weekday: 'long' });
            const eventDuration = (event.end.seconds - event.start.seconds) / 3600;

            if (!dayData[dayName]) {
                dayData[dayName] = {
                    date: eventStartDate.toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                    }),
                    mainShifts: [],
                    shortEvents: [],
                    totalDuration: 0,
                };
            }

            if (eventDuration >= minShiftHours) {
                dayData[dayName].mainShifts.push({
                    start: eventStartDate,
                    end: eventEndDate,
                    duration: eventDuration,
                });
            } else {
                dayData[dayName].shortEvents.push({
                    start: eventStartDate,
                    end: eventEndDate,
                    duration: eventDuration,
                });
            }
        }

        // Calculate times and totals for each day
        for (const dayName in dayData) {
            const data = dayData[dayName];

            if (data.mainShifts.length > 0) {
                // Has main shifts - use earliest and latest
                data.mainShifts.sort((a, b) => a.start - b.start);
                data.earliestStart = data.mainShifts[0].start;

                let shortEventsTotal = 0;
                for (const event of data.shortEvents) {
                    shortEventsTotal += event.duration;
                }

                let mainShiftsTotal = 0;
                for (const shift of data.mainShifts) {
                    mainShiftsTotal += shift.duration;
                }

                const lastShiftEnd = data.mainShifts[data.mainShifts.length - 1].end;
                data.latestEnd = new Date(lastShiftEnd.getTime() + shortEventsTotal * 3600 * 1000);
                data.totalDuration = mainShiftsTotal + shortEventsTotal;
            } else {
                // Only short events
                let shortEventsTotal = 0;
                for (const event of data.shortEvents) {
                    shortEventsTotal += event.duration;
                }

                if (shortEventsTotal >= minShiftHours) {
                    data.shortEvents.sort((a, b) => a.start - b.start);
                    data.earliestStart = data.shortEvents[0].start;
                    data.latestEnd = new Date(
                        data.shortEvents[0].start.getTime() + shortEventsTotal * 3600 * 1000,
                    );
                    data.totalDuration = shortEventsTotal;
                } else {
                    // Exclude this day
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
            Friday: { date: '', commenced: '', finished: '', break: '', total: 0 },
        };

        for (const dayName in dayData) {
            const data = dayData[dayName];
            const totalHours = (data.latestEnd - data.earliestStart) / (1000 * 60 * 60);
            const breakTime = calculateBreakTime(totalHours);

            hoursData[dayName] = {
                date: data.date,
                commenced: data.earliestStart.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                finished: data.latestEnd.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                break: breakTime > 0 ? breakTime.toFixed(1) : '',
                total: totalHours.toFixed(2),
            };
        }

        return hoursData;
    };

    const handleGenerateTimesheet = async (tutorEmail, tutorName, role = 'Academic Tutor') => {
        try {
            // Fetch events for this tutor
            const events = await fetchTimesheetEvents(tutorEmail);
            const { dayData, excludedEvents } = buildDayData(events);
            const hoursData = processDayData(dayData);
            setExcludedShifts(Object.keys(excludedEvents).length > 0 ? { tutorName, events: excludedEvents } : null);

            // Calculate total hours from excluded events
            let excludedHoursTotal = 0;
            for (const dayName in excludedEvents) {
                const dayEvents = excludedEvents[dayName];
                for (const event of dayEvents) {
                    excludedHoursTotal += event.duration;
                }
            }

            // Send data to API route
            const response = await fetch('/api/timesheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tutorEmail,
                    tutorName,
                    hoursData,
                    excludedHoursTotal,
                    role,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate timesheet');
            }

            // Download the file
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${tutorName}_${role.toLowerCase()}_timesheet_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addAlert('success', `${role} timesheet generated and downloaded successfully`);
        } catch (error) {
            console.error('Error generating timesheet:', error);
            addAlert('error', `Error generating timesheet: ${error.message}`);
        }
    };

    return (
        <div className="p-2 p-md-4 bg-white rounded shadow-lg h-100 d-flex flex-column">
            <h2 className="h4 mb-4 fw-bold text-tks-secondary">
                Tutor Hours Summary
            </h2>
            <div className="d-flex flex-column flex-md-row align-items-md-end gap-3 mb-3">
                <div>
                    <label className="form-label small fw-medium text-secondary d-block mb-1">
                        Start Date
                    </label>
                    <DatePicker
                        selected={startDate}
                        onChange={(date) => setStartDate(getMonday(date))}
                        className="form-control form-control-sm"
                    />
                </div>
                <div>
                    <label className="form-label small fw-medium text-secondary d-block mb-1">
                        End Date
                    </label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(new Date(date.setHours(23, 59, 59, 999)))}
                        className="form-control form-control-sm"
                    />
                </div>
                <CSVLink
                    data={csvData}
                    filename={`tutor_hours_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.csv`}
                >
                    <button className="btn btn-primary btn-sm">
                        Export as CSV
                    </button>
                </CSVLink>
            </div>
            <div className="mb-3 p-3 border border-secondary-subtle bg-light rounded d-flex align-items-start gap-2">
                <FaInfoCircle className="text-secondary mt-1 flex-shrink-0" style={{ fontSize: '1.25rem' }} />
                <div className="small text-secondary">
                    <p className="mb-2">
                        Please check if the hours are correct by Friday. If there are any
                        discrepancies, report them to Michael Ienna.
                    </p>
                    <p className="mb-0">
                        Any given hours that are between 3 (exclusive) and 6 (inclusive) hours
                        account for a 30-minute break. Any given hours that are greater than 6
                        (exclusive) account for a 1-hour break.
                    </p>
                </div>
            </div>
            <div className="flex-grow-1 overflow-auto">
                {excludedShifts && (
                    <div className="mb-3 p-3 border border-info bg-info-subtle rounded d-flex align-items-start gap-2">
                        <FaInfoCircle className="text-info mt-1 flex-shrink-0" style={{ fontSize: '1.25rem' }} />
                        <div className="small text-dark">
                            <h5 className="fw-bold mb-2">Excluded Hours Below Payroll Threshold</h5>
                            <p className="fw-bold mb-2">
                                TUTOR: {excludedShifts.tutorName}
                            </p>
                            <p className="fw-semibold fst-italic mb-1">
                                Short shifts (&lt;3 hours) excluded as they are below the minimum shift threshold. Add the following shift hours manually:
                            </p>
                            {Object.entries(excludedShifts.events).map(([day, events]) => (
                                <div key={day} className="mt-2">
                                    <p className="fw-medium mb-1">{day}:</p>
                                    <ul className="list-unstyled ms-3">
                                        {events.map((e, idx) => (
                                            <li key={idx} className="mb-1">
                                                • {e.start.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                                                })}{' '}
                                                -{' '}
                                                {e.end.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false,
                                                })}{' '}
                                                ({e.duration.toFixed(2)} hrs)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="table-responsive">
                    <table className="table table-sm table-hover bg-white">
                        <thead className="sticky-top bg-light">
                        <tr>
                            <th className="small fw-medium text-secondary">Email</th>
                            <th className="small fw-medium text-secondary">Name</th>
                            <th className="small fw-medium text-secondary">Tutoring</th>
                            <th className="small fw-medium text-secondary">Coaching</th>
                            <th className="small fw-medium text-secondary">Total</th>
                            {userRole === 'teacher' && (
                                <th className="small fw-medium text-secondary">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {tutorHours.map((tutor, index) => (
                            <tr key={index}>
                                <td className="small text-break align-middle">{tutor.email}</td>
                                <td className="small align-middle">{tutor.name}</td>
                                <td className="small align-middle">{tutor.tutoringHours.toFixed(2)}</td>
                                <td className="small align-middle">{tutor.coachingHours.toFixed(2)}</td>
                                <td className="small fw-semibold align-middle">
                                    {(tutor.tutoringHours + tutor.coachingHours).toFixed(2)}
                                </td>
                                {userRole === 'teacher' && (
                                    <td className="small align-middle">
                                        <div className="d-flex flex-column gap-2 align-items-start">
                                            <button
                                                onClick={() =>
                                                    handleGenerateTimesheet(
                                                        tutor.email,
                                                        tutor.name,
                                                        'Academic Tutor',
                                                    )
                                                }
                                                className="btn btn-success btn-sm"
                                            >
                                                Generate Tutor Timesheet
                                            </button>
                                            {tutor.coachingHours > 0 && (
                                                <button
                                                    onClick={() =>
                                                        handleGenerateTimesheet(
                                                            tutor.email,
                                                            tutor.name,
                                                            'Coach',
                                                        )
                                                    }
                                                    className="btn btn-success btn-sm"
                                                >
                                                    Generate Coaching Timesheet
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
};

export default TutorHoursSummary;
