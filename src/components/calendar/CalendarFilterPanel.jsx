import React from 'react';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from '@/components/icons';

const CalendarFilterPanel = ({
  uiState,
  userRole,
  eventsData,
  filterState,
  filteredTutors,
  uniqueTutors
}) => {
  const filterPanelStyle = {
    width: uiState.isFilterPanelOpen ? '16rem' : '0',
    position: 'relative',
    backgroundColor: '#ffffff',
    color: '#000000'
  };

  const collapseButtonStyle = {
    width: '2.5rem',
    height: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: '-2.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    cursor: 'pointer'
  };

  return (
    <div
      className="tw-bg-gray-100 tw-border-l tw-border-gray-300 tw-flex tw-flex-col tw-items-start tw-transition-all tw-duration-300"
      style={filterPanelStyle}
    >
      <div
        className="tw-bg-indigo-500 tw-text-white tw-rounded-l-md tw-shadow-md hover:tw-bg-indigo-600 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-indigo-400 tw-transition-all tw-duration-200"
        style={collapseButtonStyle}
        onClick={() => uiState.setIsFilterPanelOpen(!uiState.isFilterPanelOpen)}
      >
        {uiState.isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
      </div>
      {uiState.isFilterPanelOpen && (
        <div className="tw-flex tw-flex-col tw-items-start tw-w-full tw-p-4">
          <h3 className="tw-mb-4 tw-text-xl tw-font-semibold tw-text-gray-700">Filters</h3>

          {userRole === 'student' && (
            <>
              <Select
                name="subjects"
                options={eventsData.subjects.map(subject => ({ value: subject.id, label: subject.name }))}
                value={filterState.filters.subject ? { value: filterState.filters.subject.id, label: filterState.filters.subject.name } : null}
                onChange={(option) => filterState.filterActions.setSelectedSubject(eventsData.subjects.find(subject => subject.id === option.value))}
                className="tw-w-full tw-mb-4"
                classNamePrefix="select"
                placeholder="Select a subject"
              />
              <Select
                isMulti
                name="tutors"
                options={filteredTutors}
                value={filterState.filters.tutors}
                onChange={filterState.filterActions.setSelectedTutors}
                className="tw-w-full tw-mb-4"
                classNamePrefix="select"
                placeholder="Select tutors to view availabilities"
                isDisabled={!filterState.filters.subject}
              />
            </>
          )}

          {(userRole === 'tutor' || userRole === 'teacher') && (
            <>
              <Select
                isMulti
                name="tutors"
                options={uniqueTutors}
                value={filterState.filters.tutors}
                onChange={filterState.filterActions.handleTutorFilterChange}
                className="tw-w-full tw-mb-4"
                classNamePrefix="select"
                placeholder="Select tutors"
              />
              {userRole === 'teacher' && uiState.showInitials && (
                <Select
                  name="availabilityWorkType"
                  options={[
                    { value: 'tutoring', label: 'Tutoring' },
                    { value: 'work', label: 'Coaching' },
                    { value: 'tutoringOrWork', label: 'Tutoring or Coaching' }
                  ]}
                  value={filterState.filters.availabilityWorkType ? {
                    value: filterState.filters.availabilityWorkType,
                    label: filterState.filters.availabilityWorkType === 'tutoring' ? 'Tutoring' : filterState.filters.availabilityWorkType === 'work' ? 'Coaching' : 'Tutoring or Coaching'
                  } : null}
                  onChange={(option) => filterState.filterActions.setSelectedAvailabilityWorkType(option?.value || null)}
                  className="tw-w-full tw-mb-4"
                  classNamePrefix="select"
                  placeholder="Filter availabilities"
                  isClearable
                />
              )}
            </>
          )}

          <div className="tw-mb-4">
            <label className="tw-flex tw-items-center">
              <input
                type="checkbox"
                checked={uiState.showEvents}
                onChange={(e) => uiState.setShowEvents(e.target.checked)}
              />
              <span className="tw-ml-2">Show Events</span>
            </label>
          </div>

          {userRole === 'teacher' && (
            <>
              <div className="tw-mb-4 tw-ml-6">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.showTutoringEvents}
                    onChange={(e) => filterState.filterActions.setShowTutoringEvents(e.target.checked)}
                  />
                  <span className="tw-ml-2">Show Tutoring Events</span>
                </label>
              </div>
              <div className="tw-mb-4 tw-ml-6">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.showCoachingEvents}
                    onChange={(e) => filterState.filterActions.setShowCoachingEvents(e.target.checked)}
                  />
                  <span className="tw-ml-2">Show Coaching Events</span>
                </label>
              </div>
            </>
          )}

          <div className="tw-mb-4">
            <label className="tw-flex tw-items-center">
              <input
                type="checkbox"
                checked={uiState.showInitials}
                onChange={(e) => uiState.setShowInitials(e.target.checked)}
              />
              <span className="tw-ml-2">Show Tutor Availabilities</span>
            </label>
          </div>

          {userRole === 'tutor' && (
            <div className="tw-mb-4">
              <label className="tw-flex tw-items-center">
                <input
                  type="checkbox"
                  checked={filterState.filters.visibility.hideOwnAvailabilities}
                  onChange={(e) => filterState.filterActions.setHideOwnAvailabilities(e.target.checked)}
                />
                <span className="tw-ml-2">Hide My Own Availabilities</span>
              </label>
            </div>
          )}

          {(userRole === 'tutor' || userRole === 'teacher') && (
            <div className="tw-mb-4">
              <label className="tw-flex tw-items-center">
                <input
                  type="checkbox"
                  checked={filterState.filters.visibility.hideDeniedStudentEvents}
                  onChange={(e) => filterState.filterActions.setHideDeniedStudentEvents(e.target.checked)}
                />
                <span className="tw-ml-2">Hide Denied Student Events</span>
              </label>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default CalendarFilterPanel;