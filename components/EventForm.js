import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select, { components } from 'react-select';
import { db } from '../app/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';
import { createTeamsMeeting } from '../mail/mail';

const EventForm = ({
  isEditing,
  newEvent,
  setNewEvent,
  handleInputChange,
  handleSubmit,
  handleDelete,
  setShowModal,
  handleStaffChange,
  handleStudentChange,
  handleClassChange
}) => {
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
  const [error, setError] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      const staffList = await Promise.all(querySnapshot.docs.map(async docSnap => {
        const tutorData = docSnap.data();
        const availabilityQuery = query(
          collection(db, 'availabilities'),
          where('tutor', '==', docSnap.id)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        let availabilityStatus = 'unavailable';

        if (!availabilitySnapshot.empty) {
          const available = availabilitySnapshot.docs.some(availabilityDoc => {
            const availabilityData = availabilityDoc.data();
            const availabilityStart = availabilityData.start.toDate();
            const availabilityEnd = availabilityData.end.toDate();
            const eventStart = new Date(newEvent.start);
            const eventEnd = new Date(newEvent.end);

            return eventStart >= availabilityStart && eventEnd <= availabilityEnd;
          });

          if (available) {
            availabilityStatus = availabilitySnapshot.docs[0].data().locationType || 'onsite';
          }
        }

        return {
          value: docSnap.id,
          label: tutorData.name || tutorData.email,
          status: availabilityStatus
        };
      }));

      setStaffOptions(staffList);
    };

    const fetchClasses = async () => {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name,
      }));
      setClassOptions(classList);
    };

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name || docSnap.data().email,
      }));
      setStudentOptions(studentList);
    };

    fetchStaff();
    fetchClasses();
    fetchStudents();
  }, [newEvent.start, newEvent.end]);

  const handleStaffSelectChange = (selectedOptions) => {
    setSelectedStaff(selectedOptions);
    handleStaffChange(selectedOptions);
  };

  const handleClassSelectChange = (selectedOptions) => {
    setSelectedClasses(selectedOptions);
    handleClassChange(selectedOptions);
  };

  const handleStudentSelectChange = (selectedOptions) => {
    setSelectedStudents(selectedOptions);
    handleStudentChange(selectedOptions);
  };

  const handleMinStudentsChange = (e) => {
    setNewEvent({ ...newEvent, minStudents: parseInt(e.target.value, 10) });
  };

  const handleApprovalChange = async (selectedOption) => {
    const approvalStatus = selectedOption.value;
    const eventDoc = doc(db, 'events', newEvent.id);
    await updateDoc(eventDoc, { approvalStatus });
    setNewEvent({ ...newEvent, approvalStatus });

    if (approvalStatus === "approved") {
      const subject = newEvent.title;
      const description = newEvent.description || "";
      const startTime = new Date(newEvent.start).toISOString();
      const endTime = new Date(newEvent.end).toISOString();
      const attendeesEmailArr = [...newEvent.students, ...newEvent.staff].map(p => p.value)
      
      await createTeamsMeeting(newEvent, subject, description, startTime, endTime, attendeesEmailArr)
    }
  };

  const validateDates = () => {
    const start = moment(newEvent.start);
    const end = moment(newEvent.end);
    if (end.isSameOrBefore(start)) {
      setError('End date must be after the start date.');
      return false;
    }
    setError('');
    return true;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      handleSubmit(e);
    }
  };

  const confirmDelete = () => {
    setShowConfirmationModal(true);
  };

  const handleConfirmDelete = () => {
    handleDelete();
    setShowConfirmationModal(false);
    setShowModal(false);
  };

  const approvalOptions = [
    { value: 'approved', label: 'Approve' },
    { value: 'denied', label: 'Deny' },
  ];

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'onsite':
        return '🏫';
      case 'remote':
        return '💻';
      case 'unavailable':
        return '❌';
      default:
        return '❔';
    }
  };

  const customOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.Option>
    );
  };

  const customSingleValue = (props) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.SingleValue>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 z-60">
        <h2 className="text-2xl font-bold text-center">
          {isEditing ? 'Edit Event' : 'Add New Event'}
        </h2>

        <form onSubmit={onSubmit} className="mt-4">
          {error && <div className="text-red-500">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  value={newEvent.title}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  id="description"
                  value={newEvent.description}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  name="start"
                  id="start"
                  value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  name="end"
                  id="end"
                  value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="staff" className="block text-sm font-medium text-gray-700">Assign Tutor</label>
                <Select
                  isMulti
                  name="tutor"
                  options={staffOptions}
                  value={selectedStaff}
                  onChange={handleStaffSelectChange}
                  classNamePrefix="select"
                  components={{ Option: customOption, SingleValue: customSingleValue }}
                />
              </div>

              <div>
                <label htmlFor="classes" className="block text-sm font-medium text-gray-700">Assign Classes</label>
                <Select
                  isMulti
                  name="classes"
                  options={classOptions}
                  value={selectedClasses}
                  onChange={handleClassSelectChange}
                  classNamePrefix="select"
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <div>
                <label htmlFor="students" className="block text-sm font-medium text-gray-700">Assign Students</label>
                <Select
                  isMulti
                  name="students"
                  options={studentOptions}
                  value={selectedStudents}
                  onChange={handleStudentSelectChange}
                  classNamePrefix="select"
                />
              </div>

              <div>
                <label htmlFor="minStudents" className="block text-sm font-medium text-gray-700">Minimum Students Required</label>
                <input
                  type="number"
                  name="minStudents"
                  id="minStudents"
                  value={newEvent.minStudents || 0}
                  onChange={handleMinStudentsChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              {newEvent.minStudents > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student Responses</label>
                  {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {newEvent.studentResponses.map((response, index) => (
                        <li key={index}>
                          {response.email}: {response.response ? 'Accepted' : 'Declined'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No students have responded yet.</p>
                  )}
                </div>
              )}

              {newEvent.createdByStudent && (
                <div>
                  <label htmlFor="approvalStatus" className="block text-sm font-medium text-gray-700">Approval Status</label>
                  <Select
                    name="approvalStatus"
                    options={approvalOptions}
                    onChange={handleApprovalChange}
                    classNamePrefix="select"
                    defaultValue={
                      newEvent.approvalStatus === 'approved'
                        ? { value: 'approved', label: 'Approve' }
                        : newEvent.approvalStatus === 'denied'
                        ? { value: 'denied', label: 'Deny' }
                        : null
                    }
                  />
                </div>
              )}

              <div>
                <label htmlFor="workStatus" className="block text-sm font-medium text-gray-700">Work Status</label>
                <Select
                  name="workStatus"
                  options={workStatusOptions}
                  onChange={(selectedOption) =>
                    setNewEvent({ ...newEvent, workStatus: selectedOption.value })
                  }
                  classNamePrefix="select"
                  defaultValue={workStatusOptions.find(
                    option => option.value === (newEvent.workStatus || 'notCompleted')
                  )}
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-between mt-6">
            {/* Left side: Cancel */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>

            {/* Right side: Delete + Save */}
            <div className="flex space-x-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                {isEditing ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmationModal
        showConfirmationModal={showConfirmationModal}
        setShowConfirmationModal={setShowConfirmationModal}
        handleConfirmAction={handleConfirmDelete}
        entityName="Event"
        actionType="deleteEvent"
      />
    </div>
  );
};

export default EventForm;
