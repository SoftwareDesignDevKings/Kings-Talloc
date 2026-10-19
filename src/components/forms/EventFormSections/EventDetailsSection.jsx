import React, { useCallback, useState, useEffect, useContext, useMemo } from 'react';
import { CalendarDateTime } from '@internationalized/date';
import { MdEventNote, SiMicrosoftTeams } from '@/components/icons';
import { Button } from '@/components/untitled/button';
import { InputBase } from '@/components/untitled/input';
import { DateTimePicker } from '@/components/untitled/date-time-picker';
import { TextAreaBase } from '@/components/untitled/textarea';
import { Label } from '@/components/untitled/label';
import { EventSection, EventFormUIContext } from './EventFormUI';
import styles from '@/styles/staffEventForm.module.css';

const pickerValue = raw => {
    const date = new Date(raw);
    return raw && !Number.isNaN(date.getTime())
        ? new CalendarDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()) : null;
};

const EventDetailsSection = ({ newEvent, setNewEvent, handleInputChange, readOnly, isEditing = false }) => {
    const { busy, portalContainer, setMenuOpen, dateTimeValidity } = useContext(EventFormUIContext);
    const disabled = readOnly || busy;
    const startValue = useMemo(() => pickerValue(newEvent.start), [newEvent.start]);
    const endValue = useMemo(() => pickerValue(newEvent.end), [newEvent.end]);
    const [initialOccurenceNum, setInitialOccurenceNum] = useState(newEvent.occurenceNum);

    // Capture the occurenceNum once when it first arrives from the parent (async hydration)
    // so typing a new value doesn't collapse the input back to static text
    useEffect(() => {
        if (newEvent.occurenceNum && !initialOccurenceNum) {
            setInitialOccurenceNum(newEvent.occurenceNum);
        }
    }, [newEvent.occurenceNum, initialOccurenceNum]);

    const handleOccurenceNumChange = useCallback((e) => {
        // Store raw string while typing so "10" isn't truncated to "1"
        setNewEvent((prev) => ({ ...prev, occurenceNum: e.target.value }));
    }, [setNewEvent]);

    const handleOccurenceNumBlur = useCallback((e) => {
        const value = parseInt(e.target.value, 10) || 0;
        setNewEvent((prev) => ({ ...prev, occurenceNum: value }));
    }, [setNewEvent]);

    const handleTeamsMeetingToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            createTeamsMeeting: !prev.createTeamsMeeting,
        }));
    }, [setNewEvent]);

    const handleWeeklyRecurringToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            recurring: prev.recurring === 'weekly' ? null : 'weekly',
        }));
    }, [setNewEvent]);

    const handleFortnightlyRecurringToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            recurring: prev.recurring === 'fortnightly' ? null : 'fortnightly',
        }));
    }, [setNewEvent]);

    return <EventSection id="eventDetails" title="General Information" defaultExpanded={!(newEvent.createdByStudent && newEvent.approvalStatus === 'pending')} icon={MdEventNote}
        trailing={newEvent.createTeamsMeeting && <SiMicrosoftTeams size={18} title="Teams Meeting Enabled" />}>
        <div className={styles.fields}>
            <div className={styles.field}>
                <Label htmlFor="title" isRequired={false}>Event Title</Label>
                <InputBase type="text" name="title" id="title" placeholder="e.g. Weekly Math Tutoring" value={newEvent.title || ''}
                    onChange={handleInputChange} isDisabled={disabled} disabled={disabled} aria-label="Event title" aria-required="true" />
            </div>
            <div className={styles.field}>
                <Label htmlFor="description" isRequired={false}>Description (Optional)</Label>
                <TextAreaBase rows={2} name="description" id="description" placeholder="Add any notes or context..." value={newEvent.description || ''}
                    onChange={handleInputChange} disabled={disabled} aria-label="Event description" />
            </div>
            <div className={styles.grid}>
                {['start', 'end'].map(name => {
                    return <DateTimePicker key={name} name={name} label={name === 'start' ? 'Start Time' : 'End Time'} value={name === 'start' ? startValue : endValue}
                        isDisabled={disabled} portalContainer={portalContainer} onOpenChange={setMenuOpen}
                        onDraftValidityChange={complete => { if (dateTimeValidity) dateTimeValidity.current[name] = complete; }}
                        onChange={next => setNewEvent(prev => ({ ...prev, [name]: next ? next.toString() : '' }))} />;
                })}
            </div>
            <div className={styles.actions}>
                {!readOnly && <Button size="sm" color={newEvent.createTeamsMeeting ? 'secondary-destructive' : 'secondary'} isDisabled={busy}
                    onClick={handleTeamsMeetingToggle} aria-pressed={!!newEvent.createTeamsMeeting}
                    aria-label={`${newEvent.createTeamsMeeting ? 'Remove' : 'Add'} online Teams meeting`}>
                    <SiMicrosoftTeams size={20} aria-hidden="true" />{newEvent.createTeamsMeeting ? 'Remove Teams Meeting' : 'Add Teams Meeting'}
                </Button>}
                {newEvent.teamsJoinUrl && <Button size="sm" color="secondary" href={newEvent.teamsJoinUrl} target="_blank" rel="noopener noreferrer"><SiMicrosoftTeams size={18} />Join Now</Button>}
                {!readOnly && <div className={styles.recurrence}>
                    <span id="recurring-label">Recurrence:</span>
                    <div className={styles.buttonGroup} role="group" aria-labelledby="recurring-label">
                        <Button size="sm" color="secondary" onClick={handleWeeklyRecurringToggle} isDisabled={isEditing || busy} aria-pressed={newEvent.recurring === 'weekly'}>Weekly</Button>
                        <Button size="sm" color="secondary" onClick={handleFortnightlyRecurringToggle} isDisabled={isEditing || busy} aria-pressed={newEvent.recurring === 'fortnightly'}>Fortnightly</Button>
                    </div>
                </div>}
            </div>
            {!!newEvent.recurring && !newEvent.isRecurringInstance && !readOnly && <div className={styles.occurrences}>
                {isEditing && initialOccurenceNum ? <span><strong>Active Occurrences:</strong> {newEvent.eventExceptions?.length ? newEvent.occurenceNum - newEvent.eventExceptions.length : newEvent.occurenceNum}</span> : <>
                    <Label htmlFor="occurenceNum" isRequired={false}>Occurrences *</Label>
                    <InputBase type="number" name="occurenceNum" id="occurenceNum" value={newEvent.occurenceNum || ''}
                        onChange={handleOccurenceNumChange} onBlur={handleOccurenceNumBlur} min="2" placeholder="Min 2" isDisabled={busy} disabled={busy} />
                </>}
            </div>}
        </div>
    </EventSection>;
};
export default React.memo(EventDetailsSection);
