'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from '@/components/icons';

/**
 * Simple calendar legend showing color meanings for students
 */
const CalendarLegend = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ fontSize: '0.85rem' }}>
            {/* Header - always visible */}
            <div 
                className="d-flex justify-content-between align-items-center py-2 text-muted" 
                style={{ cursor: 'pointer' }} 
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="fw-bold small text-uppercase" style={{ letterSpacing: '0.05em' }}>Calendar Legend</div>
                <button
                    className="btn btn-sm p-0 border-0 text-muted"
                    style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </button>
            </div>

            {/* Content appears below when open - drop-down behavior */}
            {isOpen && (
                <div className="d-flex flex-column gap-2 pb-2">
                    <div className="d-flex align-items-center gap-2">
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'rgba(144, 238, 144, 0.5)',
                            border: '1px solid green',
                            borderRadius: '2px',
                            flexShrink: 0
                        }}></div>
                        <small className="text-muted fw-medium">Availabilities</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'lightblue',
                            border: '1px solid blue',
                            borderRadius: '2px',
                            flexShrink: 0
                        }}></div>
                        <small className="text-muted fw-medium">Confirmed</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'orange',
                            border: '1px solid darkorange',
                            borderRadius: '2px',
                            flexShrink: 0
                        }}></div>
                        <small className="text-muted fw-medium">Pending</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'red',
                            border: '1px solid darkred',
                            borderRadius: '2px',
                            flexShrink: 0
                        }}></div>
                        <small className="text-muted fw-medium">Denied</small>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarLegend;
