import React from 'react';
import moment from 'moment';

const CustomTimeSlotWrapper = ({ children, value, applicableAvailabilities, selectedTutors }) => {
  const date = moment(value);
  const slotStart = date.clone();
  const slotEnd = date.clone().add(30, 'minutes');

  const filteredAvailabilities = selectedTutors.length > 0
    ? applicableAvailabilities.filter(availability => selectedTutors.some(tutor => tutor.value === availability.tutor))
    : applicableAvailabilities;

  const availableTutorsFirstHalf = filteredAvailabilities.filter(
    availability => moment(slotStart).isBetween(availability.start, availability.end, undefined, '[)')
  ).map(availability => availability.tutor.substring(0, 2).toUpperCase());

  const availableTutorsSecondHalf = filteredAvailabilities.filter(
    availability => moment(slotEnd).subtract(1, 'second').isBetween(availability.start, availability.end, undefined, '[)')
  ).map(availability => availability.tutor.substring(0, 2).toUpperCase());

  // Remove duplicates and sort
  const uniqueFirstHalf = [...new Set(availableTutorsFirstHalf)].sort();
  const uniqueSecondHalf = [...new Set(availableTutorsSecondHalf)].sort();

  return (
    <div className="custom-time-slot-wrapper">
      {children}
      <div className="custom-slot-text">
        <div className="text-line">{uniqueFirstHalf.join(' ')}</div>
        <div className="text-line">{uniqueSecondHalf.join(' ')}</div>
      </div>
    </div>
  );
};

export default CustomTimeSlotWrapper;