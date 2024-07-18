import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import SubjectFormModal from './SubjectFormModal';
import TutorFormModal from './TutorFormModal';
import ConfirmationModal from './ConfirmationModal';
import SubjectRow from './SubjectRow';
import LoadingPage from './LoadingPage';

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [tutorsToAdd, setTutorsToAdd] = useState('');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [filteredSubjects, setFilteredSubjects] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subjectsList);
      setFilteredSubjects(subjectsList);
      setLoading(false);
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const results = subjects.filter(subject =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubjects(results);
  }, [searchTerm, subjects]);

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

  const handleAddTutors = async (emails) => {
    const newTutors = await Promise.all(
      emails.map(async email => {
        const userRef = doc(db, 'users', email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, { email, role: 'tutor' }, { merge: true });
          return { email, name: '' };
        } else {
          const userData = userDoc.data();
          return { email, name: userData.name || '' };
        }
      })
    );
    const updatedTutors = [...(selectedSubject.tutors || []), ...newTutors];
    const subjectRef = doc(db, 'subjects', selectedSubject.id);
    await updateDoc(subjectRef, { tutors: updatedTutors });
    setSubjects(subjects.map(sub => (sub.id === selectedSubject.id ? { ...sub, tutors: updatedTutors } : sub)));
    setShowTutorModal(false);
    setTutorsToAdd('');
  };

  const handleRemoveTutor = async (tutor, subject) => {
    const updatedTutors = subject.tutors.filter(t => t.email !== tutor.email);
    const subjectRef = doc(db, 'subjects', subject.id);
    await updateDoc(subjectRef, { tutors: updatedTutors });
    setSubjects(subjects.map(sub => (sub.id === subject.id ? { ...sub, tutors: updatedTutors } : sub)));
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

  const openAddTutorModal = (subject) => {
    setSelectedSubject(subject);
    setShowTutorModal(true);
  };

  const handleExpandSubject = (subject) => {
    setExpandedSubject(expandedSubject === subject.id ? null : subject.id);
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Manage Subjects</h2>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by subject name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          style={{ flex: 1 }}
        />
        <button
          onClick={openAddModal}
          className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          style={{ height: '2.5rem', width: 'auto' }}
        >
          Add Subject
        </button>
      </div>
      {loading ? (
        <LoadingPage withBackground={false} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Subject Name</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map(subject => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  handleOpenTutorModal={openAddTutorModal}
                  confirmDeleteSubject={openDeleteModal}
                  handleExpandSubject={handleExpandSubject}
                  expandedSubject={expandedSubject}
                  confirmRemoveTutor={handleRemoveTutor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SubjectFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        subject={currentSubject}
        handleSubmit={currentSubject ? handleEditSubject : handleAddSubject}
      />
      <TutorFormModal
        showTutorModal={showTutorModal}
        setShowTutorModal={setShowTutorModal}
        selectedSubject={selectedSubject}
        tutorsToAdd={tutorsToAdd}
        setTutorsToAdd={setTutorsToAdd}
        handleAddTutors={handleAddTutors}
      />
      {showConfirmationModal && (
        <ConfirmationModal
          showConfirmationModal={showConfirmationModal}
          setShowConfirmationModal={setShowConfirmationModal}
          entity={subjectToDelete}
          entityName="Subject"
          handleConfirmAction={handleDeleteSubject}
          actionType="deleteSubject"
        />
      )}
    </div>
  );
};

export default SubjectList;
