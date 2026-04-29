import React, { useMemo, useCallback, useEffect } from 'react';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight, FaInfoCircle } from '@/components/icons';
import styles from '@/styles/filterPanel.module.css';
import { useState } from 'react';
import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useAppData } from '@/contexts/AppDataContext';
import CalendarHowToModal from '@/components/modals/CalendarHowToModal';
import CalendarLegend from './CalendarLegend.jsx';
import useAuthSession from '@/hooks/useAuthSession';
import { getEnrolledSubjectIds } from '@/utils/calendarAvailability';

const CalendarFilterPanel = () => {
    const { session, userRole } = useAuthSession();
    const userEmail = session.user.email;
    const { tutors, subjects, classes } = useAppData();
    const { filters, visibility, actions, calendarFilters, calendarScope } = useCalendarUI();
    const [isOpen, setIsOpen] = useState(true);
    const [showHowToModal, setShowHowToModal] = useState(false);

    const enrolledSubjectIds = useMemo(() =>
        userRole === 'student' ? getEnrolledSubjectIds(classes, userEmail) : new Set(),
        [userRole, classes, userEmail]
    );

    const subjectOptions = useMemo(() => {
        const options = (subjects ?? []).map(subject => ({
            value: subject.id,
            label: subject.name,
            tutors: subject.tutors,
        }));
        if (userRole !== 'student' || enrolledSubjectIds.size === 0) return options;
        return options.filter(subject => enrolledSubjectIds.has(subject.value));
    }, [subjects, userRole, enrolledSubjectIds]);

    const tutorOptions = useMemo(() => {
        const mapTutorToOption = (tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        });

        if (userRole === 'student') {
            if (filters.filterBySubject) {
                const selectedSubject = (subjects ?? []).find(s => s.id === filters.filterBySubject.value);
                return selectedSubject?.tutors?.map(mapTutorToOption) ?? [];
            }
            const tutorMap = new Map();
            for (const subject of (subjects ?? [])) {
                if (!enrolledSubjectIds.has(subject.id)) continue;
                for (const tutor of subject.tutors || []) {
                    tutorMap.set(tutor.email, tutor.name || tutor.email);
                }
            }
            return [...tutorMap].map(([email, name]) => ({ value: email, label: name }));
        }

        return (tutors ?? []).map(mapTutorToOption);
    }, [userRole, filters.filterBySubject, subjects, tutors, enrolledSubjectIds]);

    // prepare work type options for availabilities
    const availabilityWorkTypeOptions = [
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'work', label: 'Work' },
    ];

    // showAllEvents is a legacy master switch; individual type toggles now own visibility.
    // Ensure it's always true so the type-level toggles are the sole gating mechanism.
    useEffect(() => {
        actions.setShowAllEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Memoise subject change handler to prevent re-renders
    const handleSubjectChange = useCallback((newSubject) => {
        actions.setFilterBySubject(newSubject);
        actions.setFilterByTutor(null);
    }, [actions]);

    return (
        <div
            className={`${styles.filterPanelContainer} ${
                isOpen ? styles.open : styles.closed
            }`}
        >
            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen((v) => !v)}
                data-bs-toggle="collapse"
                data-bs-target="#filterPanelCollapse"
                aria-expanded={isOpen}
                aria-controls="filterPanelCollapse"
            >
                {isOpen ? <FiChevronRight /> : <FiChevronLeft />}
            </button>

            <div className={`${styles.filterContent} collapse${isOpen ? ' show' : ''}`} id="filterPanelCollapse">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className={`${styles.filterTitle} mb-0`}>Filters</h3>
                        <div className="d-flex gap-2 align-items-center">
                            {userRole === 'student' && (
                                <button
                                    className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                    onClick={() => setShowHowToModal(true)}
                                    title="How to use the calendar"
                                >
                                    <FaInfoCircle size={16} />
                                    <span className="d-none d-md-inline">Help</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ───── Dropdown filters ───── */}

                    {/* Subject filter - Students only */}
                    {userRole === 'student' && (
                        <div className="mb-3">
                            <Select
                                placeholder="Select a subject"
                                classNamePrefix="select"
                                isClearable
                                options={subjectOptions}
                                value={filters.filterBySubject}
                                onChange={handleSubjectChange}
                            />
                        </div>
                    )}

                    {calendarFilters.canFilterByTutor && (
                        <div className="mb-3">
                            <Select
                                isMulti
                                placeholder={userRole === 'student' ? "Select tutors to view availabilities" : "Select tutors"}
                                classNamePrefix="select"
                                options={tutorOptions}
                                value={filters.filterByTutor}
                                onChange={actions.setFilterByTutor}
                                isDisabled={userRole === 'student' && tutorOptions.length === 0}
                            />
                        </div>
                    )}

                    {calendarFilters.canFilterByAvailabilityType && (
                        <div className="mb-3">
                            <Select
                                isMulti
                                placeholder="Filter availabilities"
                                classNamePrefix="select"
                                isClearable
                                options={availabilityWorkTypeOptions}
                                value={filters.filterAvailabilityByWorkType}
                                onChange={actions.setFilterAvailabilityByWorkType}
                            />
                        </div>
                    )}

                    {/* ───── Visibility toggles ───── */}

                    {(calendarScope.canToggleTutoringShifts ||
                        calendarScope.canToggleCoachingShifts) && (
                        <div className="mb-3">
                            <div className={`${styles.filterSectionLabel} mb-1`}>
                                {userRole === 'student' ? 'Sessions' : 'Shifts'}
                            </div>

                            {calendarScope.canToggleTutoringShifts && (
                                <label className={styles.toggleRow}>
                                    <span className={styles.toggleLabel}>Tutoring</span>
                                    <span className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.showTutoringEvents}
                                            onChange={(e) => actions.setShowTutoringEvents(e.target.checked)}
                                            aria-label="Show tutoring shifts"
                                        />
                                        <span className={styles.toggleTrack} />
                                    </span>
                                </label>
                            )}

                            {calendarScope.canToggleCoachingShifts && (
                                <label className={styles.toggleRow}>
                                    <span className={styles.toggleLabel}>Coaching</span>
                                    <span className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.showCoachingEvents}
                                            onChange={(e) => actions.setShowCoachingEvents(e.target.checked)}
                                            aria-label="Show coaching shifts"
                                        />
                                        <span className={styles.toggleTrack} />
                                    </span>
                                </label>
                            )}

                            <label className={styles.toggleRow}>
                                <span className={styles.toggleLabel}>Work</span>
                                <span className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={visibility.showWorkEvents}
                                        onChange={(e) => actions.setShowWorkEvents(e.target.checked)}
                                        aria-label="Show work shifts"
                                    />
                                    <span className={styles.toggleTrack} />
                                </span>
                            </label>
                        </div>
                    )}

                    {calendarScope.canToggleTutorAvailabilities && (
                        <>
                            <hr className={styles.filterDivider} />
                            <div className="mb-3">
                                <div className={`${styles.filterSectionLabel} mb-1`}>Availability</div>
                                <label className={styles.toggleRow}>
                                    <span className={styles.toggleLabel}>Show tutor availability</span>
                                    <span className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.showTutorInitials}
                                            onChange={(e) => actions.setShowTutorInitials(e.target.checked)}
                                            aria-label="Show tutor availabilities"
                                        />
                                        <span className={styles.toggleTrack} />
                                    </span>
                                </label>

                                {(userRole === 'tutor' || userRole === 'coach') && (
                                    <label className={`${styles.subToggleRow} ${!visibility.showTutorInitials ? 'opacity-50' : ''}`}>
                                        <span className={`${styles.toggleLabel} ${styles.toggleLabelMuted}`}>Hide my availability</span>
                                        <span className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={visibility.hideOwnAvailabilities}
                                                onChange={(e) => actions.setHideOwnAvailabilities(e.target.checked)}
                                                disabled={!visibility.showTutorInitials}
                                                aria-label="Hide my own availabilities"
                                            />
                                            <span className={styles.toggleTrack} />
                                        </span>
                                    </label>
                                )}
                            </div>
                        </>
                    )}

                    {calendarScope.canToggleDeniedStudentRequests && (
                        <>
                            <hr className={styles.filterDivider} />
                            <div className="mb-3">
                                <label className={styles.toggleRow}>
                                    <span className={styles.toggleLabel}>Hide denied requests</span>
                                    <span className={styles.toggle}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.hideDeniedStudentRequests}
                                            onChange={(e) => actions.setHideDeniedStudentRequests(e.target.checked)}
                                            aria-label="Hide denied student requests"
                                        />
                                        <span className={styles.toggleTrack} />
                                    </span>
                                </label>
                            </div>
                        </>
                    )}

                    {/* ───── Legend ───── */}
                    <div className={styles.legendSection}>
                        <CalendarLegend />
                    </div>
                </div>

            <CalendarHowToModal
                show={showHowToModal}
                onHide={() => setShowHowToModal(false)}
                autoShow={true}
            />
        </div>
    );
}

export default CalendarFilterPanel