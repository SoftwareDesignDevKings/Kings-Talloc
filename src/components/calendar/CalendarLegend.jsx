'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from '@/components/icons';
import { CALENDAR_COLORS } from '@/constants/calendarColors';

const LEGEND_ITEMS = [
    { label: 'Availabilities', ...CALENDAR_COLORS.available },
    { label: 'Confirmed',      ...CALENDAR_COLORS.confirmed },
    { label: 'Pending',        ...CALENDAR_COLORS.pending },
    { label: 'Denied',         ...CALENDAR_COLORS.denied },
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

const CalendarLegend = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="text-xs">
            <div
                className="d-flex justify-content-between align-items-center py-2 text-muted"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="fw-bold small text-uppercase" style={{ letterSpacing: '0.05em' }}>
                    Calendar Legend
                </div>
                <button
                    className="btn btn-sm p-0 border-0 text-muted d-flex align-items-center justify-content-center"
                    style={{ width: '20px', height: '20px' }}
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    aria-label={isOpen ? 'Collapse legend' : 'Expand legend'}
                >
                    {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
            </div>

            {isOpen && (
                <div className="d-flex flex-column gap-2 pb-2">
                    {LEGEND_ITEMS.map(({ label, bg, border }) => (
                        <div key={label} className="d-flex align-items-center gap-2">
                            <Swatch bg={bg} border={border} />
                            <small className="text-muted fw-medium">{label}</small>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarLegend;
