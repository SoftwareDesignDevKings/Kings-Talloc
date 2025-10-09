import React from 'react';
import { addMinutes } from 'date-fns';

const calculateGreenIntensity = (numTutors, maxTutors) => {
  const intensity = Math.min(1, numTutors / maxTutors);
  const baseGreen = { r: 144, g: 238, b: 144 };
  return `rgba(${baseGreen.r}, ${baseGreen.g}, ${baseGreen.b}, ${intensity})`;
};

const CustomTimeSlotWrapper = ({ children, value, applicableAvailabilities, selectedTutors, currentWeekStart, currentWeekEnd }) => {
  const date = new Date(value);
  const slotStart = date;
  const slotEnd = addMinutes(date, 30);

  const filteredAvailabilities = selectedTutors.length > 0
    ? applicableAvailabilities.filter(availability => selectedTutors.some(tutor => tutor.value === availability.tutor))
    : applicableAvailabilities;

  const isFullyAvailable = (availability) => {
    const availStart = new Date(availability.start);
    const availEnd = new Date(availability.end);
    return (availStart <= slotStart || availStart.getTime() === slotStart.getTime()) &&
           (availEnd >= slotEnd || availEnd.getTime() === slotEnd.getTime());
  };

  const availableTutors = filteredAvailabilities
    .filter(isFullyAvailable)
    .map(availability => availability.tutor.substring(0, 2).toUpperCase());

  const uniqueTutors = [...new Set(availableTutors)].sort();

  const tutorsWithAvailabilitiesThisWeek = filteredAvailabilities.filter(availability => {
    const availStart = new Date(availability.start);
    return availStart >= currentWeekStart && availStart < currentWeekEnd;
  }).map(availability => availability.tutor);

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
