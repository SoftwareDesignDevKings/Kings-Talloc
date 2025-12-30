'use client';

import React, { useState } from 'react';
import { MdContentCopy } from '@/components/icons';
import styles from '@/styles/customEvent.module.css';

const CustomEvent = ({ event, canDuplicate, onDuplicate }) => {
    const [showDuplicate, setShowDuplicate] = useState(false);

    const handleDuplicateClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onDuplicate) {
            onDuplicate(event);
        }
    };

    const handleMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
    };

    return (
        <div
            className={`rbc-event-content ${styles.eventContainer}`}
            onMouseEnter={() => setShowDuplicate(true)}
            onMouseLeave={() => setShowDuplicate(false)}
        >
            <span>{event.title}</span>

            {canDuplicate && showDuplicate && (
                <button
                    type="button"
                    onClick={handleDuplicateClick}
                    onMouseDown={handleMouseDown}
                    className={styles.duplicateButton}
                    title="Duplicate event"
                >
                    <MdContentCopy size={16} />
                </button>
            )}
        </div>
    );
};

export default CustomEvent;
