// DatePicker/Popover composition adapted from Untitled UI (MIT), revision 1d410cb8facde8d50869e7bbb5f3d048e2267466.
// Existing app date-time editing uses the shared segmented InputDateBase and Select for hours/minutes.
'use client';
import './styles/generated.css';
import { useContext, useEffect, useState } from 'react';
import { Time } from '@internationalized/date';
import { Calendar as CalendarIcon } from '@untitledui/icons';
import { DatePicker as AriaDatePicker, DateFieldStateContext, Dialog, Popover, I18nProvider } from 'react-aria-components';
import { Button } from './button';
import { Calendar } from './calendar';
import { InputDateBase } from './input-date';
import { Label } from './label';
import { Select } from './select';
import styles from '@/styles/dateTimePicker.module.css';

const hours = Array.from({ length: 24 }, (_, value) => ({ id: String(value), label: String(value).padStart(2, '0') }));
const minutes = Array.from({ length: 60 }, (_, value) => ({ id: String(value), label: String(value).padStart(2, '0') }));

// React Aria retains the last complete value while a segment is temporarily blank.
// Report that draft state so the event form cannot save a stale date.
function DraftValidity({ onChange }) {
    const state = useContext(DateFieldStateContext);
    const complete = state.segments.every(segment => !segment.isEditable || !segment.isPlaceholder);
    useEffect(() => { onChange?.(complete); }, [complete, onChange]);
    return null;
}

export function DateTimePicker({ name, label, value, onChange, isDisabled, portalContainer, onOpenChange, onDraftValidityChange, 'aria-label': ariaLabel }) {
    const [timePortal, setTimePortal] = useState(null);
    return <I18nProvider locale="en-AU">
        <AriaDatePicker data-untitled-control data-date-time-field={name} name={name} value={value} onChange={onChange}
            aria-label={ariaLabel || `Event ${name} time`} granularity="minute" hourCycle={24} shouldForceLeadingZeros isRequired
            validationBehavior="aria" isDisabled={isDisabled} shouldCloseOnSelect={false} onOpenChange={onOpenChange} className={styles.field}>
            {({ state }) => <>
                <Label isRequired={false}>{label}</Label>
                <InputDateBase size="sm" isDisabled={isDisabled} className={styles.dateInput}
                    segmentObserver={<DraftValidity onChange={onDraftValidityChange} />}>
                    <Button size="sm" color="tertiary" iconLeading={CalendarIcon} aria-label={`Choose ${name} date and time`} className={styles.trigger} />
                </InputDateBase>
                <Popover ref={setTimePortal} UNSAFE_portalContainer={portalContainer} placement="bottom start" offset={8} containerPadding={16}
                    data-untitled-control className={styles.popover}>
                    <Dialog aria-label={`${label} picker`} className={styles.dialog}>
                        <Calendar aria-label={`${label} calendar`} className={styles.calendar} />
                        <div className={styles.time}>
                            <Select aria-label={`${label} hour`} size="sm" selectedKey={String(state.timeValue?.hour ?? value?.hour ?? 0)}
                                onSelectionChange={key => { if (key != null) state.setTimeValue(new Time(Number(key), state.timeValue?.minute ?? value?.minute ?? 0)); }}
                                items={hours} portalContainer={timePortal}>
                                {item => <Select.Item id={item.id} label={item.label} />}
                            </Select>
                            <span aria-hidden="true">:</span>
                            <Select aria-label={`${label} minute`} size="sm" selectedKey={String(state.timeValue?.minute ?? value?.minute ?? 0)}
                                onSelectionChange={key => { if (key != null) state.setTimeValue(new Time(state.timeValue?.hour ?? value?.hour ?? 0, Number(key))); }}
                                items={minutes} portalContainer={timePortal}>
                                {item => <Select.Item id={item.id} label={item.label} />}
                            </Select>
                        </div>
                    </Dialog>
                </Popover>
            </>}
        </AriaDatePicker>
    </I18nProvider>;
}
