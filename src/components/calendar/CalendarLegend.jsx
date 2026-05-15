'use client';

import React from 'react';
import { CALENDAR_COLOURS } from '@/constants/calendarColours';

// Per-role legend keys. Order here is the display order.
// Roles: tutor, coach, student, teacher, admin.
const LEGEND_BY_ROLE = {
    tutor:   ['availabilityBlock', 'confirmed', 'coaching', 'completed', 'coachingCompleted', 'notAttended'],
    coach:   ['availabilityBlock', 'confirmed', 'coaching', 'completed', 'coachingCompleted', 'notAttended'],
    student: ['confirmed', 'pending', 'denied', 'completed', 'notAttended'],
    teacher: ['confirmed', 'coaching', 'pending', 'denied', 'completed', 'coachingCompleted', 'notAttended'],
    admin:   ['confirmed', 'coaching', 'pending', 'denied', 'completed', 'coachingCompleted', 'notAttended'],
};

const LEGEND_LABELS = {
    availabilityHeatmap: 'Available slots',
    availabilityBlock:   'Availability block',
    confirmed:           'Confirmed',
    coaching:            'Coaching',
    pending:             'Pending',
    denied:              'Denied',
    completed:           'Completed',
    coachingCompleted:   'Coaching completed',
    notAttended:         'Did not attend',
};

const Swatch = ({ bg, border, borderStyle = 'solid' }) => {
    const isPatterned = borderStyle === 'dashed' || borderStyle === 'dotted';
    return (
        <div
            className="shrink-0"
            style={{
                width: '28px',
                height: '18px',
                backgroundColor: bg,
                border: isPatterned
                    ? `2px ${borderStyle} ${border}`
                    : `1px solid ${border}33`,
                borderLeft: isPatterned
                    ? `2px ${borderStyle} ${border}`
                    : `5px solid ${border}`,
                borderRadius: '4px',
            }}
        />
    );
};

const CalendarLegend = ({ userRole }) => {
    const keys = LEGEND_BY_ROLE[userRole] || LEGEND_BY_ROLE.admin;
    return (
        <div>
            <div className="py-2 text-muted">
                <div className="fw-bold text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                    Calendar Legend
                </div>
            </div>
            <div className="d-flex flex-column gap-2 pb-2">
                {keys.map((key) => {
                    const { bg, border, borderStyle } = CALENDAR_COLOURS[key];
                    return (
                        <div key={key} className="d-flex align-items-center gap-2">
                            <Swatch bg={bg} border={border} borderStyle={borderStyle} />
                            <span className="fw-medium" style={{ fontSize: '0.85rem', color: '#334155' }}>
                                {LEGEND_LABELS[key]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarLegend;
