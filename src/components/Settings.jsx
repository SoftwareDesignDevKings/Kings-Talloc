import React from 'react';
import { FiX } from '@/components/icons';

const Settings = ({
    isOpen,
    onClose,
    calendarStartTime,
    calendarEndTime,
    setCalendarStartTime,
    setCalendarEndTime,
}) => {
    if (!isOpen) return null;

    const handleStartTimeChange = (e) => setCalendarStartTime(e.target.value);
    const handleEndTimeChange = (e) => setCalendarEndTime(e.target.value);

    return (
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-black bg-opacity-50"
            style={{ zIndex: 1050 }}
        >
            <div className="bg-white p-4 rounded-3 shadow-lg" style={{ width: '33.333333%'}}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fs-5 fw-bold">Settings</h2>
                    <button onClick={onClose} className="btn btn-light p-1 rounded">
                        <FiX size={24} className="text-secondary" />
                    </button>
                </div>
                <div>
                    <div className="mb-3">
                        <label className="d-block text-muted fw-medium">
                            Calendar Start Time
                        </label>
                        <input
                            type="time"
                            value={calendarStartTime}
                            onChange={handleStartTimeChange}
                            className="form-control mt-1"
                        />
                    </div>
                    <div>
                        <label className="d-block text-muted fw-medium">
                            Calendar End Time
                        </label>
                        <input
                            type="time"
                            value={calendarEndTime}
                            onChange={handleEndTimeChange}
                            className="form-control mt-1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
