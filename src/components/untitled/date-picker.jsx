// Date-only composition using the shared Untitled Input, Calendar and React Aria
// DatePicker/Popover. Keep the application's existing DD/MM/YYYY text editing.
'use client';
import './styles/generated.css';
import { useEffect, useRef, useState } from 'react';
import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
import { Calendar as CalendarIcon } from '@untitledui/icons';
import { DatePicker as AriaDatePicker, Dialog, Popover, I18nProvider } from 'react-aria-components';
import { Calendar } from './calendar';
import { InputBase } from './input';
import { Label } from './label';
import { Button } from './button';
import shared from '@/styles/dateTimePicker.module.css';
import styles from './date-picker.module.css';

const calendarDate = date => date ? new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) : null;
const dateText = date => date ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).padStart(4, '0')}` : '';
const parseDate = text => {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
    if (!match) return null;
    const [, day, month, year] = match.map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new CalendarDate(year, month, day);
    // CalendarDate constrains overflow; reject impossible typed dates instead.
    return date.day === day ? date.toDate(getLocalTimeZone()) : null;
};

// Restore text-field focus after the exiting overlay has actually unmounted.
// Keep focus on another control when the user dismisses by clicking outside.
function ReturnInputFocus({ inputRef, openRef, restoreRef }) {
    useEffect(() => () => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const input = inputRef.current;
            if (openRef.current || !restoreRef.current || !input?.isConnected) return;
            restoreRef.current = false;
            input.focus();
        }));
    }, [inputRef, openRef, restoreRef]);
    return null;
}

export function DatePicker({ id, label, value, onChange, onDraftValidityChange, isInvalid, 'aria-describedby': describedBy }) {
    const [draft, setDraft] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const popupRef = useRef(null);
    const openRef = useRef(isOpen);
    const restoreRef = useRef(false);
    openRef.current = isOpen;
    const cancelDraft = () => { setDraft(null); onDraftValidityChange?.(true); };
    const choose = date => {
        restoreRef.current = true;
        cancelDraft();
        onChange(date ? date.toDate(getLocalTimeZone()) : null);
        setIsOpen(false);
    };
    const commitDraft = () => {
        if (draft === null) return;
        const date = parseDate(draft);
        if (date) { cancelDraft(); onChange(date); }
    };
    return <I18nProvider locale="en-AU">
        <AriaDatePicker value={draft === null ? calendarDate(value) : null} onChange={choose}
            isOpen={isOpen} onOpenChange={setIsOpen}
            granularity="day" validationBehavior="aria" className={shared.field} data-untitled-control data-date-picker={id}>
            <Label htmlFor={id} isRequired={false} onClick={() => setIsOpen(true)}>{label}</Label>
            <div className={styles.control}>
                <InputBase ref={inputRef} id={id} size="md" aria-label={label} aria-haspopup="dialog"
                    aria-expanded={isOpen} aria-describedby={describedBy} aria-invalid={isInvalid || undefined}
                    inputClassName={styles.input} placeholder="DD/MM/YYYY" autoComplete="off" value={draft ?? dateText(value)}
                    onClick={() => setIsOpen(true)}
                    onChange={event => {
                        const text = event.target.value;
                        setDraft(text || null);
                        onDraftValidityChange?.(!text);
                        if (!text) onChange(null);
                    }}
                    onBlur={commitDraft}
                    onKeyDown={event => {
                        if (event.key === 'Enter') { event.preventDefault(); commitDraft(); setIsOpen(false); }
                        if (event.key === 'Escape') { event.preventDefault(); restoreRef.current = isOpen; cancelDraft(); setIsOpen(false); }
                        // Native text editing owns the horizontal arrow keys.
                        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) event.stopPropagation();
                        if (event.key === 'ArrowDown') {
                            event.preventDefault(); event.stopPropagation();
                            if (!isOpen) setIsOpen(true);
                            else popupRef.current?.querySelector('[data-untitled-calendar-cell][data-selected], [data-untitled-calendar-cell][tabindex="0"]')?.focus();
                        }
                    }} />
                <Button size="sm" color="tertiary" iconLeading={CalendarIcon} aria-label="Choose date" className={styles.trigger} />
            </div>
            <Popover isNonModal ref={popupRef} placement="bottom start" offset={8} containerPadding={8} data-untitled-control
                className={`${shared.popover} ${styles.popover}`}>
                <Dialog aria-label={`${label} picker`} className={shared.dialog}>
                    <ReturnInputFocus inputRef={inputRef} openRef={openRef} restoreRef={restoreRef} />
                    <div onKeyDownCapture={event => {
                        if (event.key === 'Escape') { restoreRef.current = true; cancelDraft(); }
                    }}>
                        <Calendar aria-label={`${label} calendar`} className={shared.calendar} defaultFocusedValue={calendarDate(value) || undefined} />
                    </div>
                </Dialog>
            </Popover>
        </AriaDatePicker>
    </I18nProvider>;
}
