'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DatePicker } from '@/components/untitled/date-picker';
import { CSVLink } from 'react-csv';
import { Download01, InfoCircle } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { TableCard } from '@/components/untitled/table-card';
import styles from '@/styles/tutorHours.module.css';
import useAlert from '@/hooks/useAlert';
import useAuthSession from '@/hooks/useAuthSession';
import { ownEventsFilter } from '@/lib/patterns/calendarStrategy';
import { calculateHours, decimalHours, formatDuration } from '@/lib/scheduling/hours';
import { formatDisplayDate } from '@/utils/displayDate';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { fetchCacheTutors } from '@/firestore/firestoreFetch';

const getMonday = (d) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// Names come from the cached tutor directory rather than reading every user;
// other staff fall back to the name saved on the shift.
const buildUserNameMap = (tutors) => {
    const namesByEmail = new Map();

    tutors.forEach((tutor) => {
        const email = (tutor.email || '').toLowerCase();
        if (email && tutor.name) {
            namesByEmail.set(email, tutor.name);
        }
    });

    return namesByEmail;
};

const HoursCell = ({ label, children, className }) => (
    <td className={className}><span aria-hidden="true" className={styles.compactLabel}>{label}</span>{children}</td>
);

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
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [datePending, setDatePending] = useState({ start: false, end: false });
    const [generating, setGenerating] = useState(new Set());
    const requestRef = useRef(0);
    const csvRef = useRef(null);
    const rangeError = datePending.start || datePending.end
        ? 'Enter a valid date (DD/MM/YYYY), or choose one from the calendar.'
        : !startDate || !endDate ? 'Choose both a start date and an end date.'
            : startDate > endDate ? 'End date must be on or after the start date.' : '';

    const fetchTutorHours = useCallback(async () => {
        const request = ++requestRef.current;
        if (rangeError || !userEmail) {
            setTutorHours([]);
            setLoading(false);
            setLoadError('');
            return;
        }
        setLoading(true);
        setLoadError('');
        try {
            let accessFilter = [];

            // Tutors/Coaches: only see their own shifts
            // Admins: see all shifts (no filter)
            if (!isAdmin) {
                accessFilter = ownEventsFilter(userEmail).map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue));
            }

            // Query 1: Non-recurring shifts in the date range
            const nonRecurringQuery = query(
                collection(db, 'shifts'),
                // Use the deployed emailsList/start index; overnight shifts are outside scope.
                where('start', '>=', startDate),
                where('start', '<=', endDate),
                ...accessFilter
            );

            // Query 2: ALL recurring shifts (no date filter)
            const recurringQuery = query(
                collection(db, 'shifts'),
                where('recurring', 'in', ['weekly', 'fortnightly']),
                ...accessFilter
            );

            const [nonRecurringSnapshot, recurringSnapshot, tutors] = await Promise.all([
                getDocs(nonRecurringQuery),
                getDocs(recurringQuery),
                fetchCacheTutors().catch(() => []),
            ]);
            const userNamesByEmail = buildUserNameMap(tutors);

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

            if (request === requestRef.current) setTutorHours(tutorHoursArray);
        } catch {
            if (request === requestRef.current) {
                setTutorHours([]);
                setLoadError('Could not load hours. Please try again.');
            }
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [startDate, endDate, userEmail, isAdmin, rangeError]);

    // Wait for the date pickers to settle so picking a start then an end date
    // reads the shifts once rather than for each intermediate range.
    useEffect(() => {
        const timer = setTimeout(fetchTutorHours, 400);
        return () => { clearTimeout(timer); requestRef.current++; };
    }, [fetchTutorHours]);

    const csvData = tutorHours.map((tutor) => ({
        Email: tutor.email,
        Name: tutor.name,
        'Work Hours': decimalHours(tutor.workMs),
        'Coaching Hours': decimalHours(tutor.coachingMs),
        'Total Hours': decimalHours(tutor.workMs + tutor.coachingMs),
        Details: tutor.days.map(day => `${formatDisplayDate(day.date)} ${day.category}: ${day.start.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false })}–${day.end.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false })}; paid ${formatDuration(day.paidMs)}; deduction ${formatDuration(day.deductionMs)}`).join(' | '),
        Warnings: tutor.warnings.map(warning => `${formatDisplayDate(warning.date)}: ${warning.message}`).join(' '),
    }));

    const handleGenerateTimesheet = async (tutorEmail, tutorName, roleType) => {
        if (loading || loadError || rangeError) return;
        const key = `${tutorEmail}:${roleType}`;
        setGenerating(prev => new Set(prev).add(key));
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
            const downloadUrl = URL.createObjectURL(blob);
            link.href = downloadUrl;
            link.download = `${tutorName}_${roleType}_timesheet_${formatDisplayDate(startDate)}_to_${formatDisplayDate(endDate)}.${response.headers.get('Content-Type')?.includes('zip') ? 'zip' : 'docx'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Release after the browser has begun consuming the download.
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

            const roleLabel = roleType === 'coach' ? 'Coach' : 'Tutor';
            addAlert('success', `${roleLabel} timesheet generated and downloaded successfully`);
        } catch (error) {
            console.error('Error generating timesheet:', error);
            addAlert('error', `Error: ${error.message}`);
        } finally {
            setGenerating(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
    };

    const reportReady = !loading && !loadError && !rangeError;
    const dateFields = [
        { key: 'start', label: 'Start Date', value: startDate, set: date => setStartDate(date ? getMonday(date) : null) },
        { key: 'end', label: 'End Date', value: endDate, set: date => setEndDate(date ? new Date(new Date(date).setHours(23, 59, 59, 999)) : null) },
    ];

    return (
        <section className={styles.section} aria-labelledby="tutorHoursHeading">
            <header className={styles.header}>
                <h2 id="tutorHoursHeading">Tutor Hours Summary</h2>
            </header>
            <div className={styles.filters}>
                {dateFields.map(field => <div key={field.key} className={styles.dateField}>
                    <DatePicker id={`hours-${field.key}`} label={field.label} value={field.value} onChange={field.set}
                        onDraftValidityChange={valid => setDatePending(previous => previous[field.key] === !valid ? previous : { ...previous, [field.key]: !valid })}
                        aria-describedby={rangeError ? 'hours-date-error' : undefined} isInvalid={!!rangeError} />
                </div>)}
                <Button color="secondary" size="md" iconLeading={Download01} isDisabled={!reportReady}
                    onPress={() => csvRef.current?.link?.click()} className={styles.exportButton}>Export as CSV</Button>
                <CSVLink ref={csvRef} data={csvData}
                    filename={`tutor_hours_${startDate ? formatDisplayDate(startDate) : ''}_to_${endDate ? formatDisplayDate(endDate) : ''}.csv`}
                    hidden aria-hidden="true" tabIndex={-1}>Download hours CSV</CSVLink>
            </div>
            {rangeError && <p id="hours-date-error" role="alert" className={styles.dateError}>{rangeError}</p>}
            <aside className={styles.information} aria-label="Hours and break information">
                <InfoCircle aria-hidden="true" />
                <div>
                    <p>Please check if the hours are correct by Friday. If there are any discrepancies, report them to Michael Ienna.</p>
                    <p>Shifts over 3 hours and up to 6 hours include a 30-minute break deduction. Shifts over 6 hours include a 1-hour break deduction.</p>
                </div>
            </aside>
            <TableCard.Root className={styles.tableCard}>
                <div className={styles.tableRegion} role="region" aria-label="Tutor hours table" tabIndex={0}>
                    <table className={styles.table} aria-label="Tutor hours summary">
                        <thead><tr>
                            <th scope="col">Email</th><th scope="col">Name</th><th scope="col">Work</th>
                            <th scope="col">Coaching</th><th scope="col">Total</th>
                            {isAdmin && <th scope="col" className={styles.actionHeading}>Timesheets</th>}
                        </tr></thead>
                        <tbody>
                            {!reportReady || tutorHours.length === 0 ? <tr className={styles.stateRow}><td colSpan={isAdmin ? 6 : 5}>
                                <div className={styles.tableState}>
                                    {rangeError ? <span>Choose a valid date range to view hours.</span> : loading ? <span role="status">Loading hours…</span> : loadError ? <>
                                        <span role="alert">{loadError}</span><Button color="secondary" size="sm" onPress={fetchTutorHours}>Try again</Button>
                                    </> : <span role="status">No completed hours for these dates.</span>}
                                </div>
                            </td></tr> : tutorHours.map(tutor => <tr key={tutor.email}>
                                <HoursCell label="Email">{tutor.email}</HoursCell>
                                <HoursCell label="Name" className={styles.personName}>{tutor.name}{tutor.warnings.map((warning, index) => <div key={index} role="status" className="text-warning-emphasis small">⚠ {formatDisplayDate(warning.date)}: {warning.message}</div>)}</HoursCell>
                                <HoursCell label="Work">{formatDuration(tutor.workMs)}</HoursCell>
                                <HoursCell label="Coaching">{formatDuration(tutor.coachingMs)}</HoursCell>
                                <HoursCell label="Total" className={styles.total}>{formatDuration(tutor.workMs + tutor.coachingMs)}</HoursCell>
                                {isAdmin && <HoursCell label="Timesheets"><div className={styles.rowActions}>
                                    <Button color="secondary" size="xs" iconLeading={Download01} className={styles.timesheetButton}
                                        aria-label="Generate Tutor Timesheet" title="Generate tutor timesheet"
                                        isLoading={generating.has(`${tutor.email}:tutor`)} showTextWhileLoading
                                        onPress={() => handleGenerateTimesheet(tutor.email, tutor.name, 'tutor')}>Tutor</Button>
                                    {tutor.coachingHours > 0 && <Button color="secondary" size="xs" iconLeading={Download01} className={styles.timesheetButton}
                                        aria-label="Generate Coach Timesheet" title="Generate coach timesheet"
                                        isLoading={generating.has(`${tutor.email}:coach`)} showTextWhileLoading
                                        onPress={() => handleGenerateTimesheet(tutor.email, tutor.name, 'coach')}>Coach</Button>}
                                </div></HoursCell>}
                            </tr>)}
                        </tbody>
                    </table>
                </div>
            </TableCard.Root>
        </section>
    );
};

export default TutorHoursSummary;
