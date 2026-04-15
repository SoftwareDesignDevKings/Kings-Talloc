import React from 'react';
import Select from 'react-select';
import { MdPeople, MdSchool, FaChalkboardTeacher, FaUserGraduate } from '@/components/icons';

const ParticipantsSection = ({
    selectedStaff,
    handleStaffSelectChange,
    staffOptions,
    customOption,
    customSingleValue,
    selectedClasses,
    handleClassSelectChange,
    classOptions,
    selectedStudents,
    handleStudentSelectChange,
    studentOptions,
    readOnly,
}) => {
    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className="accordion-button collapsed shadow-none"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#participants"
                    aria-expanded="false"
                    aria-controls="participants"
                >
                    <MdPeople className="me-2 text-primary" size={20} aria-hidden="true" />
                    <span className="fw-bold">Participants</span>
                </button>
            </h2>
            <div
                id="participants"
                className="accordion-collapse collapse"
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body p-4">
                    <div className="mb-4">
                        <label
                            htmlFor="staff"
                            className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1"
                        >
                            <FaChalkboardTeacher /> Assign Tutors
                        </label>
                        <Select
                            isMulti
                            name="tutor"
                            options={staffOptions}
                            value={selectedStaff}
                            onChange={handleStaffSelectChange}
                            classNamePrefix="select"
                            components={{
                                Option: customOption,
                                SingleValue: customSingleValue,
                            }}
                            isDisabled={readOnly}
                            aria-label="Assign tutors to event"
                            inputId="staff"
                        />
                    </div>

                    <div className="row g-3">
                        <div className="col-md-6">
                            <label
                                htmlFor="classes"
                                className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1"
                            >
                                <MdSchool /> Classes
                            </label>
                            <Select
                                isMulti
                                name="classes"
                                options={classOptions}
                                value={selectedClasses}
                                onChange={handleClassSelectChange}
                                classNamePrefix="select"
                                isDisabled={readOnly}
                                aria-label="Assign classes to event"
                                inputId="classes"
                            />
                        </div>

                        <div className="col-md-6">
                            <label
                                htmlFor="students"
                                className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1"
                            >
                                <FaUserGraduate /> Students
                            </label>
                            <Select
                                isMulti
                                name="students"
                                options={studentOptions}
                                value={selectedStudents}
                                onChange={handleStudentSelectChange}
                                classNamePrefix="select"
                                isDisabled={readOnly}
                                aria-label="Assign students to event"
                                inputId="students"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ParticipantsSection);
