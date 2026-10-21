'use client';

import DashboardDialog from '@/components/dashboard/DashboardDialog';
import { Button } from '@/components/untitled/button';
import styles from '@/styles/dashboard.module.css';
import { AppLogout } from '@/lib/security/clientAuth';

const ReLoginModal = ({ show, onHide }) => {
    const handleSignOut = async () => {
        await AppLogout();
    };

    return (
        <DashboardDialog
            show={show}
            onHide={onHide}
            title="Microsoft session expired"
            size="sm"
            showFooter={false}
        >
            <p className={styles.reauthText}>
                Your Microsoft session has expired.<br />
                Please sign in again to send emails — your account will be reconnected automatically.
            </p>
            <div className={styles.reauthActions}>
                <Button size="md" color="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button size="md" color="primary" onClick={handleSignOut}>
                    Sign in again
                </Button>
            </div>
        </DashboardDialog>
    );
};

export default ReLoginModal;
