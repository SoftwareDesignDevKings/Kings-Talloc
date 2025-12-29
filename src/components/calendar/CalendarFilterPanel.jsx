import React from 'react';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from '@/components/icons';
import styles from '@/styles/filterPanel.module.css';
import { useState } from 'react';
import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useCalendarData } from '@/providers/CalendarDataProvider';

const CalendarFilterPanel = ({ calendarStrategy, device, userRole }) => {
    const { calendarFilters, calendarScope } = calendarStrategy;
    const [isOpen, setIsOpen] = useState(device !== 'mobile');

    // Get filter state and actions from CalendarUIProvider
    const { tutors, subjects } = useCalendarData();
    const { filters, visibility, actions } = useCalendarUI();

    // load subject options for students
    const subjectOptions = subjects?.map((subject) => ({
        value: subject.id,
        label: subject.name,
        tutors: subject.tutors,
    })) || [];

    // load tutor options for the select. for students: filter tutors by selected subject
    const tutorOptions = (() => {
        if (userRole === 'student' && filters.filterBySubject) {
            const selectedSubject = subjects?.find(s => s.id === filters.filterBySubject.value);
            return selectedSubject?.tutors?.map((tutor) => ({
                value: tutor.email,
                label: tutor.name || tutor.email,
            })) || [];
        }
        return tutors?.map((tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        })) || [];
    })();

    // prepare work type options for availabilities
    const availabilityWorkTypeOptions = [
        { value: 'work', label: 'Work' },
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'tutoringOrWork', label: 'Tutoring or Work' },
    ];

    // dandle subject change - clear tutor filter when subject changes
    const handleSubjectChange = (newSubject) => {
        actions.setFilterBySubject(newSubject);
        actions.setFilterByTutor(null);
    };

    return (
        <div
            className={`${styles.filterPanelContainer} ${
                isOpen ? styles.open : styles.closed
            }`}
        >
            <button
                className={styles.toggleButton}
                onClick={() => setIsOpen((v) => !v)}
            >
                {isOpen ? <FiChevronRight /> : <FiChevronLeft />}
            </button>

            {isOpen && (
                <div className={styles.filterContent}>
                    <h3 className={styles.filterTitle}>Filters</h3>

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
                                isDisabled={userRole === 'student' && !filters.filterBySubject}
                            />
                        </div>
                    )}

                    {calendarFilters.canFilterByAvailabilityType && (
                        <div className="mb-3">
                            <Select
                                placeholder="Filter availabilities"
                                classNamePrefix="select"
                                isClearable
                                options={availabilityWorkTypeOptions}
                                value={filters.filterAvailabilityByWorkType}
                                onChange={actions.setFilterAvailabilityByWorkType}
                            />
                        </div>
                    )}

                    {/* ───── Visibility / scope toggles ───── */}

                    {(calendarScope.canToggleTutoringShifts ||
                        calendarScope.canToggleCoachingShifts) && (
                        <>
                            <div className="mb-3">
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={visibility.showAllEvents}
                                        onChange={(e) => actions.setShowAllEvents(e.target.checked)}
                                    />
                                    <span>Show Events</span>
                                </label>
                            </div>

                            {calendarScope.canToggleTutoringShifts && (
                                <div className={`${styles.checkboxIndented} mb-3`}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.showTutoringEvents}
                                            onChange={(e) => actions.setShowTutoringEvents(e.target.checked)}
                                        />
                                        <span>{userRole === 'student' ? 'Show Tutoring Event' : 'Show Tutoring Shifts'}</span>
                                    </label>
                                </div>
                            )}

                            {calendarScope.canToggleCoachingShifts && (
                                <div className={`${styles.checkboxIndented} mb-3`}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={visibility.showCoachingEvents}
                                            onChange={(e) => actions.setShowCoachingEvents(e.target.checked)}
                                        />
                                        <span>{userRole === 'student' ? 'Show Coaching Event' : 'Show Coaching Shifts'}</span>
                                    </label>
                                </div>
                            )}
                        </>
                    )}

                    {calendarScope.canToggleTutorAvailabilities && (
                        <div className="mb-3">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={visibility.showTutorInitials}
                                    onChange={(e) => actions.setShowTutorInitials(e.target.checked)}
                                />
                                <span>Show Tutor Availabilities</span>
                            </label>
                        </div>
                    )}

                    {calendarScope.canToggleDeniedStudentRequests && (
                        <div className="mb-3">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={visibility.hideDeniedStudentRequests}
                                    onChange={(e) => actions.setHideDeniedStudentRequests(e.target.checked)}
                                />
                                <span>Hide Denied Student Events</span>
                            </label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default CalendarFilterPanel