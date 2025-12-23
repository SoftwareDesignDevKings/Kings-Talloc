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

    // Get filter state and actions from CalendarControlProvider
    const { tutors, subjects } = useCalendarData();
    const { filters, visibility, actions } = useCalendarUI();

    // Prepare subject options for students
    const subjectOptions = subjects?.map((subject) => ({
        value: subject.id,
        label: subject.name,
        tutors: subject.tutors,
    })) || [];

    // Prepare tutor options for the select
    // For students: filter tutors by selected subject
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

    // Prepare work type options for availabilities
    const availabilityWorkTypeOptions = [
        { value: 'work', label: 'Work' },
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'tutoringOrWork', label: 'Tutoring or Work' },
    ];

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
                                onChange={actions.setFilterBySubject}
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
// const CalendarFilterPanel = ({
//     uiState,
//     userRole,
//     eventsData,
//     filterState,
//     filteredTutors,
//     uniqueTutors,
// }) => {
//     const filterPanelStyle = {
//         width: uiState.isFilterPanelOpen ? '16rem' : '0',
//         position: 'relative',
//         backgroundColor: '#ffffff',
//         color: '#000000',
//     };

//     return (
//         <div
//             className={styles.filterPanelContainer}
//             style={filterPanelStyle}
//         >
//             <button
//                 className={styles.toggleButton}
//                 onClick={() => uiState.setIsFilterPanelOpen(!uiState.isFilterPanelOpen)}
//             >
//                 {uiState.isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
//             </button>
//             {uiState.isFilterPanelOpen && (
//                 <div className={styles.filterContent}>
//                     <h3 className={styles.filterTitle}>
//                         Filters
//                     </h3>

//                     {userRole === 'student' && (
//                         <>
//                             <Select
//                                 name="subjects"
//                                 options={eventsData.subjects.map((subject) => ({
//                                     value: subject.id,
//                                     label: subject.name,
//                                 }))}
//                                 value={
//                                     filterState.filters.subject
//                                         ? {
//                                               value: filterState.filters.subject.id,
//                                               label: filterState.filters.subject.name,
//                                           }
//                                         : null
//                                 }
//                                 onChange={(option) =>
//                                     filterState.filterActions.setSelectedSubject(
//                                         eventsData.subjects.find(
//                                             (subject) => subject.id === option.value,
//                                         ),
//                                     )
//                                 }
//                                 className="w-100 mb-3"
//                                 classNamePrefix="select"
//                                 placeholder="Select a subject"
//                             />
//                             <Select
//                                 isMulti
//                                 name="tutors"
//                                 options={filteredTutors}
//                                 value={filterState.filters.tutors}
//                                 onChange={filterState.filterActions.setSelectedTutors}
//                                 className="w-100 mb-3"
//                                 classNamePrefix="select"
//                                 placeholder="Select tutors to view availabilities"
//                                 isDisabled={!filterState.filters.subject}
//                             />
//                         </>
//                     )}

//                     {(userRole === 'tutor' || userRole === 'teacher') && (
//                         <>
//                             <Select
//                                 isMulti
//                                 name="tutors"
//                                 options={uniqueTutors}
//                                 value={filterState.filters.tutors}
//                                 onChange={filterState.filterActions.handleTutorFilterChange}
//                                 className="w-100 mb-3"
//                                 classNamePrefix="select"
//                                 placeholder="Select tutors"
//                             />
//                             {userRole === 'teacher' && uiState.showInitials && (
//                                 <Select
//                                     name="availabilityWorkType"
//                                     options={[
//                                         { value: 'work', label: 'Work' },
//                                         { value: 'tutoring', label: 'Tutoring' },
//                                         { value: 'coaching', label: 'Coaching' },
//                                         { value: 'tutoringOrWork', label: 'Tutoring or Coaching' },
//                                     ]}
//                                     value={
//                                         filterState.filters.availabilityWorkType
//                                             ? {
//                                                   value: filterState.filters.availabilityWorkType,
//                                                   label:
//                                                       filterState.filters.availabilityWorkType === 'tutoring'
//                                                           ? 'Tutoring'
//                                                           : filterState.filters.availabilityWorkType === 'coaching'
//                                                             ? 'Coaching'
//                                                             : filterState.filters.availabilityWorkType === 'work'
//                                                               ? 'Work'
//                                                               : 'Tutoring or Coaching',
//                                               }
//                                             : null
//                                     }
//                                     onChange={(option) =>
//                                         filterState.filterActions.setSelectedAvailabilityWorkType(
//                                             option?.value || null,
//                                         )
//                                     }
//                                     className="w-100 mb-3"
//                                     classNamePrefix="select"
//                                     placeholder="Filter availabilities"
//                                     isClearable
//                                 />
//                             )}
//                         </>
//                     )}

//                     <div className="mb-3">
//                         <label className={styles.checkboxLabel}>
//                             <input
//                                 type="checkbox"
//                                 checked={uiState.showEvents}
//                                 onChange={(e) => uiState.setShowEvents(e.target.checked)}
//                             />
//                             <span>Show Events</span>
//                         </label>
//                     </div>

//                     {userRole === 'teacher' && (
//                         <>
//                             <div className={`mb-3 ${styles.checkboxIndented}`}>
//                                 <label className={styles.checkboxLabel}>
//                                     <input
//                                         type="checkbox"
//                                         checked={filterState.filters.visibility.showTutoringEvents}
//                                         onChange={(e) =>
//                                             filterState.filterActions.setShowTutoringEvents(
//                                                 e.target.checked,
//                                             )
//                                         }
//                                     />
//                                     <span>Show Tutoring Events</span>
//                                 </label>
//                             </div>
//                             <div className={`mb-3 ${styles.checkboxIndented}`}>
//                                 <label className={styles.checkboxLabel}>
//                                     <input
//                                         type="checkbox"
//                                         checked={filterState.filters.visibility.showCoachingEvents}
//                                         onChange={(e) =>
//                                             filterState.filterActions.setShowCoachingEvents(
//                                                 e.target.checked,
//                                             )
//                                         }
//                                     />
//                                     <span>Show Coaching Events</span>
//                                 </label>
//                             </div>
//                         </>
//                     )}

//                     <div className="mb-3">
//                         <label className={styles.checkboxLabel}>
//                             <input
//                                 type="checkbox"
//                                 checked={uiState.showInitials}
//                                 onChange={(e) => uiState.setShowInitials(e.target.checked)}
//                             />
//                             <span>Show Tutor Availabilities</span>
//                         </label>
//                     </div>

//                     {userRole === 'tutor' && (
//                         <div className="mb-3">
//                             <label className={styles.checkboxLabel}>
//                                 <input
//                                     type="checkbox"
//                                     checked={filterState.filters.visibility.hideOwnAvailabilities}
//                                     onChange={(e) =>
//                                         filterState.filterActions.setHideOwnAvailabilities(
//                                             e.target.checked,
//                                         )
//                                     }
//                                 />
//                                 <span>Hide My Own Availabilities</span>
//                             </label>
//                         </div>
//                     )}

//                     {(userRole === 'tutor' || userRole === 'teacher') && (
//                         <div className="mb-3">
//                             <label className={styles.checkboxLabel}>
//                                 <input
//                                     type="checkbox"
//                                     checked={filterState.filters.visibility.hideDeniedStudentEvents}
//                                     onChange={(e) =>
//                                         filterState.filterActions.setHideDeniedStudentEvents(
//                                             e.target.checked,
//                                         )
//                                     }
//                                 />
//                                 <span>Hide Denied Student Events</span>
//                             </label>
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default CalendarFilterPanel;
