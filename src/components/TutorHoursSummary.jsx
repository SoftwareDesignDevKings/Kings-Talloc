'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CSVLink } from 'react-csv';
import { FaInfoCircle } from '@/components/icons';
import useAlert from '@/hooks/useAlert';
import useAuthSession from '@/hooks/useAuthSession';
import { calculateHours, decimalHours, formatDuration } from '@/lib/scheduling/hours';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';

const getMonday = (d) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

const buildUserNameMap = (userDocs) => {
    const namesByEmail = new Map();

    userDocs.forEach((userDoc) => {
        const data = userDoc.data();
        const email = (data.email || userDoc.id || '').toLowerCase();
        if (email && data.name) {
            namesByEmail.set(email, data.name);
        }
    });

    return namesByEmail;
};

/**
 * Component to display and manage tutor hours summary
 */
const TutorHoursSummary = () => {
    const { addAlert } = useAlert();
    const { userRole, userRoles, session } = useAuthSession();
    const userEmail = session?.user?.email;
    const isAdmin = userRole === 'admin' || userRoles?.includes('admin') || userRole === 'teacher' || userRoles?.includes('teacher');
    
    const [startDate, setStartDate] = useState(getMonday(new Date()));
    const [endDate, setEndDate] = useState(() => {
        const monday = getMonday(new Date());
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return sunday;
    });
    const [tutorHours, setTutorHours] = useState([]);

    const fetchTutorHours = useCallback(async () => {
        let accessFilter = [];

        // Tutors/Coaches: only see their own shifts
        // Admins: see all shifts (no filter)
        if (!isAdmin) {
            accessFilter = [where('emailsList', 'array-contains', userEmail)];
        }

        // Query 1: Non-recurring shifts in the date range
        const nonRecurringQuery = query(
            collection(db, 'shifts'),
            where('end', '>', startDate),
            ...accessFilter
        );

        // Query 2: ALL recurring shifts (no date filter)
        const recurringQuery = query(
            collection(db, 'shifts'),
            where('recurring', 'in', ['weekly', 'fortnightly']),
            ...accessFilter
        );

        const [nonRecurringSnapshot, recurringSnapshot, usersSnapshot] = await Promise.all([
            getDocs(nonRecurringQuery),
            getDocs(recurringQuery),
            getDocs(collection(db, 'users')),
        ]);
        const userNamesByEmail = buildUserNameMap(usersSnapshot.docs);

        // Process non-recurring shifts
        let shifts = nonRecurringSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
            };
        });

        shifts = shifts.filter(shift => !shift.recurring && shift.start >= startDate && shift.start <= endDate);

        // Process recurring events - expand and filter to date range
        let recurringShifts = recurringSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                ...(data.until && { until: data.until.toDate() }),
            };
        });

        // Expand recurring events, then filter for this time sheet date range
        recurringShifts = recurringCalendarExpand(recurringShifts, {
            rangeStart: startDate,
            rangeEnd: endDate,
            maxOccurrences: 52,

        }).filter(shift => shift.start >= startDate && shift.start <= endDate);
    

        // Combine non-recurring and expanded recurring events
        shifts = [...shifts, ...recurringShifts];

        let tutorHoursArray = calculateHours(shifts).tutors.map(tutor => ({
            ...tutor,
            name: userNamesByEmail.get(tutor.email) || tutor.name,
            tutoringHours: tutor.workMs / 3600000,
            coachingHours: tutor.coachingMs / 3600000,
        }));
        if (!isAdmin) tutorHoursArray = tutorHoursArray.filter(tutor => tutor.email === userEmail?.toLowerCase());

        setTutorHours(tutorHoursArray);
    }, [startDate, endDate, userEmail, isAdmin]);

    useEffect(() => {
        fetchTutorHours();
    }, [startDate, endDate, fetchTutorHours]);

    const csvData = tutorHours.map((tutor) => ({
        Email: tutor.email,
        Name: tutor.name,
        'Work Hours': decimalHours(tutor.workMs),
        'Coaching Hours': decimalHours(tutor.coachingMs),
        'Total Hours': decimalHours(tutor.workMs + tutor.coachingMs),
        Details: tutor.days.map(day => `${day.date} ${day.category}: ${day.start.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false })}–${day.end.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false })}; paid ${formatDuration(day.paidMs)}; deduction ${formatDuration(day.deductionMs)}`).join(' | '),
        Warnings: tutor.warnings.map(warning => `${warning.date}: ${warning.message}`).join(' '),
    }));

    const handleGenerateTimesheet = async (tutorEmail, tutorName, roleType) => {
        try {
            // Send data to API route - send ISO timestamps to avoid timezone parsing issues
            const response = await fetch('/api/timesheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tutorEmail,
                    tutorName,
                    startDateUTC: startDate.toISOString(),
                    endDateUTC: endDate.toISOString(),
                    timesheetType: roleType, // 'tutor' or 'coach'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                addAlert('error', errorData.error || 'Failed to generate timesheet');
                return;
            }

            // Download the file
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${tutorName}_${roleType}_timesheet_${startDate.toLocaleDateString('en-AU')}_to_${endDate.toLocaleDateString('en-AU')}.${response.headers.get('Content-Type')?.includes('zip') ? 'zip' : 'docx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            const roleLabel = roleType === 'coach' ? 'Coach' : 'Tutor';
            addAlert('success', `${roleLabel} timesheet generated and downloaded successfully`);
        } catch (error) {
            console.error('Error generating timesheet:', error);
            addAlert('error', `Error: ${error.message}`);
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
                    filename={`tutor_hours_${startDate.toLocaleDateString('en-AU')}_to_${endDate.toLocaleDateString('en-AU')}.csv`}
                    className="btn btn-outline-primary btn-sm"
                >
                    Export as CSV
                </CSVLink>
            </div>
            <div className="mb-3 p-3 border border-secondary-subtle bg-light rounded d-flex align-items-start gap-2">
                <FaInfoCircle className="text-secondary mt-1 shrink-0 fs-5" />
                <div className="small text-secondary">
                    <p className="mb-2">
                        Please check if the hours are correct by Friday. If there are any
                        discrepancies, report them to Michael Ienna.
                    </p>
                    <p className="mb-0">
                        Any given hours that are between 3 (exclusive) and 6 (inclusive) hours account for a 30-minute break. Any given hours that are greater than 6 (exclusive) account for a 1-hour break.
                    </p>
                </div>
            </div>

            <div className="grow overflow-auto">
                <div className="table-responsive">
                    <table className="table table-sm table-hover bg-white">
                        <thead className="sticky-top bg-light" style={{ zIndex: 1 }}>
                        <tr>
                            <th className="small fw-medium text-secondary">Email</th>
                            <th className="small fw-medium text-secondary">Name</th>
                            <th className="small fw-medium text-secondary">Work</th>
                            <th className="small fw-medium text-secondary">Coaching</th>
                            <th className="small fw-medium text-secondary">Total</th>
                            {isAdmin && (
                                <th className="small fw-medium text-secondary">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {tutorHours.map((tutor, index) => (
                            <tr key={index}>
                                <td className="small text-break align-middle">{tutor.email}</td>
                                <td className="small align-middle">{tutor.name}{tutor.warnings.map((warning, i) => <div key={i} className="text-warning-emphasis small" role="status">⚠ {warning.date}: {warning.message}</div>)}</td>
                                <td className="small align-middle">{formatDuration(tutor.workMs)}</td>
                                <td className="small align-middle">{formatDuration(tutor.coachingMs)}</td>
                                <td className="small fw-semibold align-middle">
                                    {formatDuration(tutor.workMs + tutor.coachingMs)}
                                </td>
                                {isAdmin && (
                                    <td className="small align-middle">
                                        <div className="d-flex flex-column gap-2 align-items-start">
                                            <button
                                                onClick={() =>
                                                    handleGenerateTimesheet(
                                                        tutor.email,
                                                        tutor.name,
                                                        'tutor',
                                                    )
                                                }
                                                className="btn btn-sm btn-outline-success"
                                            >
                                                Generate Tutor Timesheet
                                            </button>
                                            {tutor.coachingHours > 0 && (
                                                <button
                                                    onClick={() =>
                                                        handleGenerateTimesheet(
                                                            tutor.email,
                                                            tutor.name,
                                                            'coach',
                                                        )
                                                    }
                                                    className="btn btn-sm btn-outline-secondary"
                                                >
                                                    Generate Coach Timesheet
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
