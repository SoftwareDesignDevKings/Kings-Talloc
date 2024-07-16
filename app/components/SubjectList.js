import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import SubjectFormModal from './SubjectFormModal';
import ConfirmationModal from './ConfirmationModal';

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subjectsList);
      setLoading(false);
    };

    fetchSubjects();
  }, []);

  const handleAddSubject = async (subject) => {
    const docRef = await addDoc(collection(db, 'subjects'), subject);
    setSubjects([...subjects, { id: docRef.id, ...subject }]);
  };

  const handleEditSubject = async (subject) => {
    const subjectRef = doc(db, 'subjects', currentSubject.id);
    await updateDoc(subjectRef, subject);
    setSubjects(subjects.map(sub => (sub.id === currentSubject.id ? { ...sub, ...subject } : sub)));
    setCurrentSubject(null);
  };

  const handleDeleteSubject = async () => {
    if (subjectToDelete) {
      await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
      setSubjects(subjects.filter(subject => subject.id !== subjectToDelete.id));
      setSubjectToDelete(null);
      setShowConfirmationModal(false);
    }
  };

  const openAddModal = () => {
    setCurrentSubject(null);
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setCurrentSubject(subject);
    setShowModal(true);
  };

  const openDeleteModal = (subject) => {
    setSubjectToDelete(subject);
    setShowConfirmationModal(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Manage Subjects</h2>
      <button
        onClick={openAddModal}
        className="mb-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Subject
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Subject Name</th>
              <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(subject => (
              <tr key={subject.id} className="border-b border-gray-200">
                <td className="py-2 px-4 text-sm text-gray-900">{subject.name}</td>
                <td className="py-2 px-4 text-sm text-gray-900">
                  <button
                    onClick={() => openEditModal(subject)}
                    className="mr-2 px-2 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(subject)}
                    className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SubjectFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        subject={currentSubject}
        handleSubmit={currentSubject ? handleEditSubject : handleAddSubject}
      />
      <ConfirmationModal
        showConfirmationModal={showConfirmationModal}
        setShowConfirmationModal={setShowConfirmationModal}
        entity={subjectToDelete}
        entityName="Subject"
        handleConfirmAction={handleDeleteSubject}
        actionType="deleteSubject"
      />
    </div>
  );
};

export default SubjectList;
