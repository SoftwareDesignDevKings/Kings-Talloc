import React from 'react';
import TimeGrid from 'react-big-calendar/lib/TimeGrid';

// Phone-sized replacement for Week view: three days from the selected date.
// Follows RBC's own WorkWeek view (static range/navigate/title + TimeGrid).
const DAYS = 3;

const threeDayRange = (date, { localizer }) => {
    const start = localizer.startOf(date, 'day');
    return Array.from({ length: DAYS }, (_, i) => localizer.add(start, i, 'day'));
};

const ThreeDayView = ({ date, localizer, min, max, scrollToTime, enableAutoScroll = true, ...props }) => (
    <TimeGrid
        {...props}
        range={threeDayRange(date, { localizer })}
        eventOffset={15}
        localizer={localizer}
        min={min ?? localizer.startOf(new Date(), 'day')}
        max={max ?? localizer.endOf(new Date(), 'day')}
        scrollToTime={scrollToTime ?? localizer.startOf(new Date(), 'day')}
        enableAutoScroll={enableAutoScroll}
    />
);

ThreeDayView.range = threeDayRange;

ThreeDayView.navigate = (date, action, { localizer }) => {
    if (action === 'PREV') return localizer.add(date, -DAYS, 'day');
    if (action === 'NEXT') return localizer.add(date, DAYS, 'day');
    return date;
};

ThreeDayView.title = (date, { localizer }) => {
    const [start, , end] = threeDayRange(date, { localizer });
    return localizer.format({ start, end }, 'dayRangeHeaderFormat');
};

export default ThreeDayView;
