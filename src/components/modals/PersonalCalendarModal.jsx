'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import BaseModal from './BaseModal';
import useAlert from '@/hooks/useAlert';

const PersonalCalendarModal = ({ show, onHide }) => {
    const [urls, setUrls] = useState(null);
    const { addAlert } = useAlert();

    useEffect(() => {
        if (!show) return;

        async function load() {
            const res = await fetch('/api/calendar');
            if (!res.ok) return;
            const json = await res.json();
            setUrls(json);
        }
        load();
    }, [show]);

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        addAlert('success', 'Copied to clipboard');
    };

    return (
        <BaseModal
            show={show}
            onHide={onHide}
            title="Sync to Personal Calendar"
            size="md"
            showFooter={false}
        >
            <>
                <div className="mb-4">
                    <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                        <Image src="/outlook.svg" width={20} height={20} alt="Outlook" />
                        Outlook
                    </h6>
                    <p className="text-muted small mb-2">
                        Use this URL to subscribe in Outlook or Apple Calendar 
                    </p>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={urls?.webcalUrl || 'Waiting...'}
                            readOnly
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => handleCopy(urls?.webcalUrl)}
                            disabled={!urls?.webcalUrl}
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div className="mb-3">
                    <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                        <Image src="/calendar.svg" width={20} height={20} alt="Google Calendar" />
                        Google Calendar
                    </h6>
                    <p className="text-muted small mb-2">
                        Use this URL to add to Google Calendar
                    </p>
                    <div className="input-group">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={urls?.httpsUrl || 'Waiting...'}
                            readOnly
                        />
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => handleCopy(urls?.httpsUrl)}
                            disabled={!urls?.httpsUrl}
                        >
                            Copy
                        </button>
                    </div>
                </div>
            </>
        </BaseModal>
    );
};

export default PersonalCalendarModal;
