import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import ClassRow from './ClassRow';
import ClassFormModal from './ClassFormModal';
import StudentFormModal from './StudentFormModal';
import ConfirmationModal from './ConfirmationModal';

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [className, setClassName] = useState('');
  const [success, setSuccess] = useState('');
  const [studentsToAdd, setStudentsToAdd] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesList);
      setFilteredClasses(classesList);
      setLoading(false);
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const results = classes.filter(cls =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClasses(results);
  }, [searchTerm, classes]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'classes'), { name: className });
    setClassName('');
    setShowModal(false);
    setSuccess('Class added successfully');
    fetchClasses();
  };

  const handleDeleteClass = async () => {
    if (classToDelete) {
      await deleteDoc(doc(db, 'classes', classToDelete.id));
      setClasses(classes.filter(cls => cls.id !== classToDelete.id));
      setSuccess('Class deleted successfully');
      setClassToDelete(null);
      setShowConfirmationModal(false);
    }
  };

  const handleAddStudents = async (e) => {
    e.preventDefault();
    const emails = studentsToAdd.split(',').map(email => email.trim());
    const newStudents = await Promise.all(
      emails.map(async email => {
        const userRef = doc(db, 'users', email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, { email, role: 'student' }, { merge: true });
          return { email, name: '' };
        } else {
          const userData = userDoc.data();
          return { email, name: userData.name || '' };
        }
      })
    );
    const updatedStudents = [...(selectedClass.students || []), ...newStudents];
    const classRef = doc(db, 'classes', selectedClass.id);
    await updateDoc(classRef, { students: updatedStudents });
    setSelectedClass(prevClass => ({ ...prevClass, students: updatedStudents }));
    setStudentsToAdd('');
    setShowStudentModal(false);
    setSuccess('Students added successfully');
    fetchClasses();
  };

  const handleRemoveStudent = async () => {
    const updatedStudents = selectedClass.students.filter(s => s.email !== studentToRemove.email);
    const classRef = doc(db, 'classes', selectedClass.id);
    await updateDoc(classRef, { students: updatedStudents });
    setSelectedClass(prevClass => ({ ...prevClass, students: updatedStudents }));
    setShowConfirmationModal(false);
    setStudentToRemove(null);
    setSuccess('Student removed successfully');
    fetchClasses();
  };

  const handleOpenStudentModal = (cls) => {
    setSelectedClass(cls);
    setShowStudentModal(true);
  };

  const handleExpandClass = (cls) => {
    setExpandedClass(expandedClass === cls.id ? null : cls.id);
  };

  const confirmRemoveStudent = (student, cls) => {
    setSelectedClass(cls);
    setStudentToRemove(student);
    setConfirmationAction('removeStudent');
    setShowConfirmationModal(true);
  };

  const confirmDeleteClass = (cls) => {
    setClassToDelete(cls);
    setConfirmationAction('deleteClass');
    setShowConfirmationModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmationAction === 'deleteClass') {
      handleDeleteClass();
    } else if (confirmationAction === 'removeStudent') {
      handleRemoveStudent();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Manage Classes</h2>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by class name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          style={{ flex: 1 }}
        />
        <button
          onClick={() => setShowModal(true)}
          className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          style={{ height: '2.5rem', width: 'auto' }}
        >
          Add Class
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Class Name</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map(cls => (
              <ClassRow
                key={cls.id}
                cls={cls}
                handleOpenStudentModal={handleOpenStudentModal}
                confirmDeleteClass={confirmDeleteClass}
                handleExpandClass={handleExpandClass}
                expandedClass={expandedClass}
                confirmRemoveStudent={confirmRemoveStudent}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ClassFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        className={className}
        setClassName={setClassName}
        handleAddClass={handleAddClass}
      />
      <StudentFormModal
        showStudentModal={showStudentModal}
        setShowStudentModal={setShowStudentModal}
        selectedClass={selectedClass}
        studentsToAdd={studentsToAdd}
        setStudentsToAdd={setStudentsToAdd}
        handleAddStudents={handleAddStudents}
      />
      <ConfirmationModal
        showConfirmationModal={showConfirmationModal}
        setShowConfirmationModal={setShowConfirmationModal}
        entity={confirmationAction === 'deleteClass' ? classToDelete : studentToRemove}
        entityName={confirmationAction === 'deleteClass' ? 'Class' : studentToRemove ? studentToRemove.name || studentToRemove.email : 'Student'}
        handleConfirmAction={handleConfirmAction}
        actionType={confirmationAction}
      />
      {success && <p className="text-sm text-green-600 mt-4">{success}</p>}
    </div>
  );
};

export default ClassList;
