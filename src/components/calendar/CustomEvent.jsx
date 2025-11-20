'use client';

import React, { useState } from 'react';
import { MdContentCopy } from '@/components/icons';

const CustomEvent = ({ event, userRole, onDuplicate, userEmail, currentView }) => {
    const [showDuplicate, setShowDuplicate] = useState(false);

    // Teachers can duplicate events, tutors can duplicate their own availabilities
    // But not in agenda view
    const canDuplicate =
        currentView !== 'agenda' &&
        ((userRole === 'teacher' && !event.tutor) ||
            (userRole === 'tutor' && event.tutor === userEmail));

    const handleDuplicateClick = (e) => {
        e.stopPropagation(); // Prevent event selection
        e.preventDefault(); // Prevent default behavior
        onDuplicate(event);
    };

    return (
        <div
            className="rbc-event-content"
            onMouseEnter={() => setShowDuplicate(true)}
            onMouseLeave={() => setShowDuplicate(false)}
            style={{ position: 'relative', height: '100%', width: '100%' }}
        >
            <span>{event.title}</span>

            {canDuplicate && showDuplicate && (
                <button
                    onClick={handleDuplicateClick}
                    style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '22px',
                        height: '22px',
                        padding: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                    title="Duplicate event"
                >
                    <MdContentCopy size={16} />
                </button>
            )}
        </div>
    );
};

export default CustomEvent;
