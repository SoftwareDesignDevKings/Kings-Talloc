'use client';

import BaseModal from './BaseModal.jsx';
import { AppLogout } from '@/lib/security/clientAuth';

const ReLoginModal = ({ show, onHide }) => {
    const handleSignOut = async () => {
        await AppLogout();
    };

    return (
        <BaseModal
            show={show}
            onHide={onHide}
            title="Microsoft Session Expired"
            size="sm"
            showFooter={false}
        >
            <p className="text-muted mb-4">
                Your Microsoft session has expired.<br />
                Please sign in again to send emails — your account will be reconnected automatically.
            </p>
            <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-outline-secondary" onClick={onHide}>
                    Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSignOut}>
                    Sign in again
                </button>
            </div>
        </BaseModal>
    );
};

export default ReLoginModal;
