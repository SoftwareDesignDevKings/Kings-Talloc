import React, { useMemo, useEffect, useState } from 'react';
import CalendarMultiSelect from './CalendarMultiSelect';
import { Button } from '@/components/untitled/button';
import { Toggle } from '@/components/untitled/toggle';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import { ChevronRight, InfoCircle, XClose } from '@untitledui/icons';
import styles from '@/styles/filterPanel.module.css';
import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useAppData } from '@/contexts/AppDataContext';
import CalendarHowToModal from '@/components/modals/CalendarHowToModal';
import CalendarLegend from './CalendarLegend.jsx';
import useAuthSession from '@/hooks/useAuthSession';
import { buildEligibleTutorOptions } from '@/lib/canvas/canvasCoverage';

const CalendarFilterPanel = () => {
    const { userRole, device } = useAuthSession();
    const { tutors, studentTutorEligibility } = useAppData();
    const { filters, visibility, actions, calendarFilters, calendarScope } = useCalendarUI();
    const [isOpen, setIsOpen] = useState(true);
    const [showHowToModal, setShowHowToModal] = useState(false);
    const isStudent = userRole === 'student';
    const isMobile = device === 'mobile';

    const tutorOptions = useMemo(() => {
        const mapTutorToOption = (tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        });

        const options = userRole === 'student'
            ? buildEligibleTutorOptions(tutors ?? [], studentTutorEligibility)
            : (tutors ?? []).map(mapTutorToOption);
        return options.sort((a, b) => a.label.localeCompare(b.label));
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

    // Leaving the phone layout closes its dialog so it doesn't reappear later.
    useEffect(() => {
        if (!isMobile) actions.setMobileFiltersOpen?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile]);

    const openHelp = () => {
        actions.setMobileFiltersOpen?.(false);
        setShowHowToModal(true);
    };

    const content = (
        <div className={styles.filterContent}>
            <div className={styles.filterHeader}>
                <h3 className={styles.filterTitle}>Filters</h3>
                <div className={styles.filterHeaderActions}>
                    {isStudent && (
                        <Button size="sm" color="tertiary" iconLeading={InfoCircle}
                            onClick={openHelp}>
                            <span title="How to use the calendar">Help</span>
                        </Button>
                    )}
                    {isMobile && (
                        <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close filters"
                            onClick={() => actions.setMobileFiltersOpen(false)} />
                    )}
                </div>
            </div>

            {/* ───── Dropdown filters ───── */}

            {calendarFilters.canFilterByTutor && (
                <div className="mb-3">
                    <CalendarMultiSelect
                        isMulti
                        placeholder="Select tutors"
                        options={tutorOptions}
                        value={filters.filterByTutor}
                        onChange={actions.setFilterByTutor}
                        isDisabled={isStudent && tutorOptions.length === 0}
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
                        {isStudent ? 'Sessions' : 'Shifts'}
                    </div>

                    {calendarScope.canToggleCoachingShifts && (
                        <Toggle className={styles.toggleRow} label="Coaching" isSelected={visibility.showCoachingEvents} onChange={actions.setShowCoachingEvents} aria-label={isStudent ? 'Show coaching sessions' : 'Show coaching shifts'} />
                    )}

                    {/* Student requests are stored as work, which students know as tutoring. */}
                    <Toggle className={styles.toggleRow} label={isStudent ? 'Tutoring' : 'Work'} isSelected={visibility.showWorkEvents} onChange={actions.setShowWorkEvents} aria-label={isStudent ? 'Show tutoring sessions' : 'Show work shifts'} />
                </div>
            )}

            {calendarScope.canToggleTutorAvailabilities && (
                <>
                    <hr className={styles.filterDivider} />
                    <div className="mb-3">
                        <div className={`${styles.filterSectionLabel} mb-1`}>Availability</div>
                        <Toggle className={styles.toggleRow} label="Show tutor availability" isSelected={visibility.showTutorInitials} onChange={actions.setShowTutorInitials} />

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
    );

    const helpModal = (
        <CalendarHowToModal
            show={showHowToModal}
            onHide={() => setShowHowToModal(false)}
            autoShow={true}
        />
    );

    if (isMobile) {
        return (
            <>
                <ModalOverlay isOpen={!!visibility.mobileFiltersOpen} isDismissable
                    onOpenChange={open => actions.setMobileFiltersOpen(open)} className={styles.mobileOverlay}>
                    <Modal className={styles.mobileModal}>
                        <Dialog aria-label="Filters" className={styles.mobileDialog}>
                            {content}
                        </Dialog>
                    </Modal>
                </ModalOverlay>
                {helpModal}
            </>
        );
    }

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
                {content}
            </div>

            {helpModal}
        </div>
    );
}

export default CalendarFilterPanel
