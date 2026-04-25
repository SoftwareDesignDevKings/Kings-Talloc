'use client';

import React from 'react';
import { CALENDAR_COLOURS } from '@/constants/calendarColours';

const LEGEND_ITEMS = [
    { label: 'Availabilities', ...CALENDAR_COLOURS.available },
    { label: 'Confirmed',      ...CALENDAR_COLOURS.confirmed },
    { label: 'Pending',        ...CALENDAR_COLOURS.pending },
    { label: 'Denied',         ...CALENDAR_COLOURS.denied },
];

const Swatch = ({ bg, border }) => (
    <div
        className="shrink-0"
        style={{
            width: '12px',
            height: '12px',
            backgroundColor: bg,
            border: `1px solid ${border}`,
            borderRadius: '2px',
        }}
    />
);

const CalendarLegend = () => (
    <div className="text-xs">
        <div className="py-2 text-muted">
            <div className="fw-bold small text-uppercase" style={{ letterSpacing: '0.05em' }}>
                Calendar Legend
            </div>
        </div>
        <div className="d-flex flex-column gap-2 pb-2">
            {LEGEND_ITEMS.map(({ label, bg, border }) => (
                <div key={label} className="d-flex align-items-center gap-2">
                    <Swatch bg={bg} border={border} />
                    <small className="text-muted fw-medium">{label}</small>
                </div>
            ))}
        </div>
    </div>
);

export default CalendarLegend;
