import React, { useMemo, useEffect, useState } from 'react';
import CalendarMultiSelect from './CalendarMultiSelect';
import { Button } from '@/components/untitled/button';
import { Toggle } from '@/components/untitled/toggle';
import { ChevronRight, InfoCircle } from '@untitledui/icons';
import styles from '@/styles/filterPanel.module.css';
import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useAppData } from '@/contexts/AppDataContext';
import CalendarHowToModal from '@/components/modals/CalendarHowToModal';
import CalendarLegend from './CalendarLegend.jsx';
import useAuthSession from '@/hooks/useAuthSession';
import { buildEligibleTutorOptions } from '@/lib/canvas/canvasCoverage';

const CalendarFilterPanel = () => {
    const { userRole } = useAuthSession();
    const { tutors, studentTutorEligibility } = useAppData();
    const { filters, visibility, actions, calendarFilters, calendarScope } = useCalendarUI();
    const [isOpen, setIsOpen] = useState(true);
    const [showHowToModal, setShowHowToModal] = useState(false);

    const tutorOptions = useMemo(() => {
        const mapTutorToOption = (tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        });

        return userRole === 'student'
            ? buildEligibleTutorOptions(tutors ?? [], studentTutorEligibility)
            : (tutors ?? []).map(mapTutorToOption);
    }, [tutors, userRole, studentTutorEligibility]);

    useEffect(() => {
        if (userRole !== 'student' || !filters.filterByTutor?.length) return;

        const validTutorEmails = new Set(tutorOptions.map((option) => option.value));
        const nextFilterByTutor = filters.filterByTutor.filter((option) => validTutorEmails.has(option.value));
        if (nextFilterByTutor.length !== filters.filterByTutor.length) {
            actions.setFilterByTutor(nextFilterByTutor);
        }
    }, [actions, filters.filterByTutor, tutorOptions, userRole]);

    // prepare work type options for availabilities
    const availabilityWorkTypeOptions = [
        { value: 'coaching', label: 'Coaching' },
        { value: 'work', label: 'Work' },
    ];

    // showAllEvents is a legacy master switch; individual type toggles now own visibility.
    // Ensure it's always true so the type-level toggles are the sole gating mechanism.
    useEffect(() => {
        actions.setShowAllEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className={`${styles.filterPanelContainer} ${
                isOpen ? styles.open : styles.closed
            }`}
        >
            <Button
                size="sm"
                color="secondary"
                className={styles.toggleButton}
                iconLeading={ChevronRight}
                aria-label={isOpen ? 'Collapse filters' : 'Expand filters'}
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                aria-controls="filterPanelCollapse"
            />

            <div className={styles.filterViewport} aria-hidden={!isOpen} ref={element => { element?.toggleAttribute('inert', !isOpen); }} id="filterPanelCollapse">
                <div className={styles.filterContent}>
                    <div className={styles.filterHeader}>
                        <h3 className={styles.filterTitle}>Filters</h3>
                        {userRole === 'student' && (
                            <Button size="sm" color="tertiary" iconLeading={InfoCircle}
                                onClick={() => setShowHowToModal(true)}>
                                <span title="How to use the calendar">Help</span>
                            </Button>
                        )}
                    </div>

                    {/* ───── Dropdown filters ───── */}

                    {calendarFilters.canFilterByTutor && (
                        <div className="mb-3">
                            <CalendarMultiSelect
                                isMulti
                                placeholder={userRole === 'student' ? "Select tutors to view availabilities" : "Select tutors"}
                                options={tutorOptions}
                                value={filters.filterByTutor}
                                onChange={actions.setFilterByTutor}
                                isDisabled={userRole === 'student' && tutorOptions.length === 0}
                            />
                        </div>
                    )}

                    {calendarFilters.canFilterByAvailabilityType && (
                        <div className="mb-3">
                            <CalendarMultiSelect
                                isMulti
                                placeholder="Filter availabilities"
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

                            {calendarScope.canToggleCoachingShifts && (
                                <Toggle className={styles.toggleRow} label="Coaching" isSelected={visibility.showCoachingEvents} onChange={actions.setShowCoachingEvents} aria-label="Show coaching shifts" />
                            )}

                            <Toggle className={styles.toggleRow} label="Work" isSelected={visibility.showWorkEvents} onChange={actions.setShowWorkEvents} aria-label="Show work shifts" />
                        </div>
                    )}

                    {calendarScope.canToggleTutorAvailabilities && (
                        <>
                            <hr className={styles.filterDivider} />
                            <div className="mb-3">
                                <div className={`${styles.filterSectionLabel} mb-1`}>Availability</div>
                                <Toggle className={styles.toggleRow} label="Show tutor availability" isSelected={visibility.showTutorInitials} onChange={actions.setShowTutorInitials} aria-label="Show tutor availabilities" />

                                {(userRole === 'tutor' || userRole === 'coach') && (
                                    <Toggle className={`${styles.subToggleRow} ${!visibility.showTutorInitials ? 'opacity-50' : ''}`} label="Hide my availability" isSelected={visibility.hideOwnAvailabilities} onChange={actions.setHideOwnAvailabilities} isDisabled={!visibility.showTutorInitials} aria-label="Hide my own availabilities" />
                                )}
                            </div>
                        </>
                    )}

                    {calendarScope.canToggleDeniedStudentRequests && (
                        <>
                            <hr className={styles.filterDivider} />
                            <div className="mb-3">
                                <Toggle className={styles.toggleRow} label="Hide denied requests" isSelected={visibility.hideDeniedStudentRequests} onChange={actions.setHideDeniedStudentRequests} aria-label="Hide denied student requests" />
                            </div>
                        </>
                    )}

                    {/* ───── Legend ───── */}
                    <div className={styles.legendSection}>
                        <CalendarLegend userRole={userRole} />
                    </div>
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
