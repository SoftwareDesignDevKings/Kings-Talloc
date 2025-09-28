import React from 'react';
import moment from 'moment';

const calculateGreenIntensity = (numTutors, maxTutors) => {
  const intensity = Math.min(1, numTutors / maxTutors);
  const baseGreen = { r: 144, g: 238, b: 144 };
  return `rgba(${baseGreen.r}, ${baseGreen.g}, ${baseGreen.b}, ${intensity})`;
};

const CustomTimeSlotWrapper = ({ children, value, applicableAvailabilities, selectedTutors, currentWeekStart, currentWeekEnd }) => {
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

  const uniqueTutors = [...new Set(availableTutors)].sort();

  const tutorsWithAvailabilitiesThisWeek = filteredAvailabilities.filter(availability =>
    moment(availability.start).isBetween(currentWeekStart, currentWeekEnd, null, '[)')
  ).map(availability => availability.tutor);

  const uniqueTutorsThisWeek = [...new Set(tutorsWithAvailabilitiesThisWeek)];
  const maxTutors = uniqueTutorsThisWeek.length || 1;

  const backgroundColor = availableTutors.length > 0 ? calculateGreenIntensity(availableTutors.length, maxTutors) : 'transparent';

  return (
    <div className="custom-time-slot-wrapper" style={{ '--custom-slot-bg': backgroundColor }}>
      {children}
      <div className="custom-slot-text">
        <div className="text-line">{uniqueTutors.join(' ')}</div>
      </div>
    </div>
  );
};

export default CustomTimeSlotWrapper;
