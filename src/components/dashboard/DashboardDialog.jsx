'use client';
import { useId } from 'react';
import { XClose } from '@untitledui/icons';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import { Button } from '@/components/untitled/button';
import styles from '@/styles/dashboard.module.css';

const DashboardDialog = ({ show = false, onHide, title, children, size, showFooter = true, customFooter }) => {
    const titleId = useId();
    return (
        <ModalOverlay isOpen={show} isDismissable onOpenChange={open => { if (!open) onHide?.(); }} className={styles.dialogOverlay}>
            <Modal className={`${styles.dialogModal} ${size === 'lg' ? styles.large : ''}`}>
                <Dialog aria-labelledby={titleId} className={styles.dialog}>
                    <header className={styles.dialogHeader}>
                        <h5 id={titleId} className={styles.dialogTitle}>{title}</h5>
                        <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close" onClick={onHide} />
                    </header>
                    <div className={styles.dialogBody}>{children}</div>
                    {showFooter && customFooter && <footer className={styles.dialogFooter}>{customFooter}</footer>}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};
export default DashboardDialog;
