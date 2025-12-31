'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from '@/components/icons';

/**
 * Simple calendar legend showing color meanings for students
 */
const CalendarLegend = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white rounded shadow-sm border" style={{ fontSize: '0.85rem' }}>
            {/* Content appears above when open - drop-up behavior */}
            {isOpen && (
                <div className="d-flex flex-column gap-1 p-2 pb-0">
                <div className="d-flex align-items-center gap-2">
                    <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'rgba(144, 238, 144, 0.5)',
                        border: '1px solid green',
                        borderRadius: '2px',
                        flexShrink: 0
                    }}></div>
                    <small>Availabilities</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'lightblue',
                        border: '1px solid blue',
                        borderRadius: '2px',
                        flexShrink: 0
                    }}></div>
                    <small>Confirmed</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'orange',
                        border: '1px solid darkorange',
                        borderRadius: '2px',
                        flexShrink: 0
                    }}></div>
                    <small>Pending</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'red',
                        border: '1px solid darkred',
                        borderRadius: '2px',
                        flexShrink: 0
                    }}></div>
                    <small>Denied</small>
                </div>
                </div>
            )}

            {/* Header at the bottom - always visible */}
            <div className="d-flex justify-content-between align-items-center p-2" style={{ cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
                <div className="fw-bold small">Calendar Legend</div>
                <button
                    className="btn btn-sm p-0 border-0"
                    style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    {isOpen ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
                </button>
            </div>
        </div>
    );
};

export default CalendarLegend;
