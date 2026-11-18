'use client';

import { REQUEST_DELETE_WARNING } from '@/utils/destructiveActions';
import React, { useState, useEffect } from 'react';
import { StaffEventDialog } from '@/components/forms/EventFormSections/EventFormUI';
import { Button } from '@/components/untitled/button';
import { RadioGroup, RadioButton } from '@/components/untitled/radio-buttons';
import styles from '@/styles/staffEventForm.module.css';

const DeleteConfirmationModal = ({ show, onHide, onConfirm, isRecurring, isOriginal, isStudentRequest = false, loading = false }) => {
    const [deleteOption, setDeleteOption] = useState(isOriginal ? 'all' : 'this');
    useEffect(() => { if (show) setDeleteOption(isOriginal ? 'all' : 'this'); }, [show, isOriginal]);
    return <StaffEventDialog size="md" show={show} onHide={onHide} title={isRecurring ? 'Delete recurring event' : isStudentRequest ? 'Delete student request' : 'Delete event'} loading={loading}
        customFooter={<>
            <Button size="md" color="secondary" isDisabled={loading} onClick={onHide}>Cancel</Button>
            <Button size="md" color="secondary-destructive" isDisabled={loading} onClick={() => { if (!loading) onConfirm(isRecurring ? deleteOption : 'this'); }}>{loading ? 'Deleting…' : 'Delete'}</Button>
        </>}>
        {isStudentRequest && <p className={styles.warning} role="alert">{REQUEST_DELETE_WARNING}</p>}
        {isRecurring ? <div className={styles.fields}>
            <p>{isOriginal ? 'This is a recurring event. What would you like to delete?' : 'What would you like to delete?'}</p>
            <RadioGroup aria-label="Delete occurrences" name="deleteOption" value={deleteOption} onChange={setDeleteOption} isDisabled={loading}>
                {isOriginal ? <RadioButton value="all" label="All occurrences" /> : <>
                    <RadioButton value="this" label="Only this occurrence" />
                    <RadioButton value="thisAndFuture" label="This and all future occurrences" />
                </>}
            </RadioGroup>
            {!isOriginal && <div className={styles.warning} role="alert"><strong>Note:</strong> Deletes only non-modified allocated shifts into the future. All modified occurrences will need to be deleted separately.</div>}
        </div> : !isStudentRequest ? <p>Are you sure you want to permanently delete this event? This cannot be undone.</p> : null}
    </StaffEventDialog>;
};
export default DeleteConfirmationModal;
