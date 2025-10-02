import React from 'react';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CalendarFilterPanel = ({
  uiState,
  userRole,
  eventsData,
  filterState,
  filteredTutors,
  uniqueTutors
}) => {
  return (
    <div className={`filter-panel ${uiState.isFilterPanelOpen ? 'open' : 'collapsed'}`}>
      <div className="collapse-button" onClick={() => uiState.setIsFilterPanelOpen(!uiState.isFilterPanelOpen)}>
        {uiState.isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
      </div>
      {uiState.isFilterPanelOpen && (
        <div className="filter-content">
          <h3 className="filter-title">Filters</h3>

          {userRole === 'student' && (
            <>
              <Select
                name="subjects"
                options={eventsData.subjects.map(subject => ({ value: subject.id, label: subject.name }))}
                value={filterState.filters.subject ? { value: filterState.filters.subject.id, label: filterState.filters.subject.name } : null}
                onChange={(option) => filterState.filterActions.setSelectedSubject(eventsData.subjects.find(subject => subject.id === option.value))}
                className="basic-select"
                classNamePrefix="select"
                placeholder="Select a subject"
              />
              <Select
                isMulti
                name="tutors"
                options={filteredTutors}
                value={filterState.filters.tutors}
                onChange={filterState.filterActions.setSelectedTutors}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select tutors to view availabilities"
                isDisabled={!filterState.filters.subject}
              />
            </>
          )}

          {(userRole === 'tutor' || userRole === 'teacher') && (
            <Select
              isMulti
              name="tutors"
              options={uniqueTutors}
              value={filterState.filters.tutors}
              onChange={filterState.filterActions.handleTutorFilterChange}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select tutors"
            />
          )}

          <div className="checkbox-group">
            <label className="tw-flex tw-items-center">
              <input
                type="checkbox"
                checked={uiState.showEvents}
                onChange={(e) => uiState.setShowEvents(e.target.checked)}
              />
              <span className="tw-ml-2">Show Events</span>
            </label>
          </div>

          <div className="checkbox-group">
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
            <div className="checkbox-group">
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
            <div className="checkbox-group">
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

          {userRole === 'teacher' && (
            <div>
              <div className="checkbox-group">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.hideTutoringAvailabilites}
                    onChange={(e) => filterState.filterActions.setHideTutoringAvailabilites(e.target.checked)}
                  />
                  <span className="tw-ml-2">Hide Tutoring Availabilities</span>
                </label>
              </div>
              <div className="checkbox-group">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.hideWorkAvailabilities}
                    onChange={(e) => filterState.filterActions.setHideWorkAvailabilities(e.target.checked)}
                  />
                  <span className="tw-ml-2">Hide Work Availabilities</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarFilterPanel;