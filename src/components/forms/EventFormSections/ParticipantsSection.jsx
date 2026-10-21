import React from 'react';
import { MdPeople } from '@/components/icons';
import { Label } from '@/components/untitled/label';
import { EventSection, EventMultiSelect } from './EventFormUI';
import styles from '@/styles/staffEventForm.module.css';

const ParticipantsSection = ({ selectedStaff, handleStaffSelectChange, staffOptions, renderStaffOption, selectedClasses, handleClassSelectChange, classOptions, selectedStudents, handleStudentSelectChange, studentOptions, onStudentSearch, studentNoOptionsMessage, readOnly, children }) => (
    <EventSection id="participants" title="Participants" icon={MdPeople}>
        <div className={styles.fields}>
            <div className={styles.field}>
                <Label htmlFor="staff" isRequired={false}>Assign Tutors</Label>
                <EventMultiSelect isMulti name="tutor" options={staffOptions} value={selectedStaff} onChange={handleStaffSelectChange}
                    renderOption={renderStaffOption} isDisabled={readOnly} aria-label="Assign tutors to event" inputId="staff" />
            </div>
            <div className={styles.grid}>
                <div className={styles.field}>
                    <Label htmlFor="classes" isRequired={false}>Classes</Label>
                    <EventMultiSelect isMulti name="classes" options={classOptions} value={selectedClasses} onChange={handleClassSelectChange}
                        isDisabled={readOnly} aria-label="Assign classes to event" inputId="classes" />
                </div>
                <div className={styles.field}>
                    <Label htmlFor="students" isRequired={false}>Students</Label>
                    <EventMultiSelect isMulti name="students" options={studentOptions} value={selectedStudents} onChange={handleStudentSelectChange}
                        onSearchChange={onStudentSearch} noOptionsMessage={studentNoOptionsMessage}
                        isDisabled={readOnly} aria-label="Assign students to event" inputId="students" placeholder="Search students by name or email" />
                </div>
            </div>
            {children}
        </div>
    </EventSection>
);
export default React.memo(ParticipantsSection);
