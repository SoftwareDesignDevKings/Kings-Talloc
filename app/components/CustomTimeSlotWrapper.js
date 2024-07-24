import React from 'react';
import moment from 'moment';

const CustomTimeSlotWrapper = ({ children, value, applicableAvailabilities, selectedTutors }) => {
  const date = moment(value);
  const slotStart = date.clone();
  const slotEnd = date.clone().add(30, 'minutes');

  const filteredAvailabilities = selectedTutors.length > 0
    ? applicableAvailabilities.filter(availability => selectedTutors.some(tutor => tutor.value === availability.tutor))
    : applicableAvailabilities;

  const isFullyAvailable = (availability) => {
    const availStart = moment(availability.start);
    const availEnd = moment(availability.end);
    return availStart.isSameOrBefore(slotStart) && availEnd.isSameOrAfter(slotEnd);
  };

  const availableTutors = filteredAvailabilities
    .filter(isFullyAvailable)
    .map(availability => availability.tutor.substring(0, 2).toUpperCase());

  // Remove duplicates and sort
  const uniqueTutors = [...new Set(availableTutors)].sort();

  return (
    <div className="custom-time-slot-wrapper">
      {children}
      <div className="custom-slot-text">
        <div className="text-line">{uniqueTutors.join(' ')}</div>
      </div>
    </div>
  );
};

export default CustomTimeSlotWrapper;