"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/firestore/clientFirestore.js';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import SubjectModal from './modals/SubjectModal.jsx';
import AddTutorsModal from './modals/AddTutorsModal.jsx';
import SubjectRow from './SubjectRow.jsx';
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx';

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [tutorsToAdd, setTutorsToAdd] = useState('');
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [showDeleteTutorModal, setShowDeleteTutorModal] = useState(false);
  const [tutorToDelete, setTutorToDelete] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(subjectsList);
      setFilteredSubjects(subjectsList);
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
    if (isEditing) {
      const subjectRef = doc(db, 'subjects', currentSubject.id);
      await updateDoc(subjectRef, subject);
      setSubjects(subjects.map(sub => (sub.id === currentSubject.id ? { ...sub, ...subject } : sub)));
      setIsEditing(false);
    } else {
      const docRef = await addDoc(collection(db, 'subjects'), subject);
      setSubjects([...subjects, { id: docRef.id, ...subject }]);
    }
    setShowModal(false);
  };

  const handleEditSubject = (subject) => {
    setCurrentSubject(subject);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteSubject = async () => {
    if (subjectToDelete) {
      await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
      setSubjects(subjects.filter(subject => subject.id !== subjectToDelete.id));
      setShowDeleteModal(false);
      setSubjectToDelete(null);
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

  const handleRemoveTutor = async () => {
    if (tutorToDelete && tutorToDelete.subject) {
      const updatedTutors = tutorToDelete.subject.tutors.filter(t => t.email !== tutorToDelete.tutor.email);
      const subjectRef = doc(db, 'subjects', tutorToDelete.subject.id);
      await updateDoc(subjectRef, { tutors: updatedTutors });
      setSubjects(subjects.map(sub => (sub.id === tutorToDelete.subject.id ? { ...sub, tutors: updatedTutors } : sub)));
      setShowDeleteTutorModal(false);
      setTutorToDelete(null);
    }
  };

  const openAddModal = () => {
    setCurrentSubject(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    handleEditSubject(subject);
  };

  const openDeleteModal = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteModal(true);
  };

  const openDeleteTutorModal = (tutor, subject) => {
    setTutorToDelete({ tutor, subject });
    setShowDeleteTutorModal(true);
  };

  const openAddTutorModal = (subject) => {
    setSelectedSubject(subject);
    setShowTutorModal(true);
  };

  const handleExpandSubject = (subject) => {
    setExpandedSubject(expandedSubject === subject.id ? null : subject.id);
  };

  return (
    <div className="tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
      <h2 className="tw-text-2xl tw-font-bold tw-mb-4 tw-text-indigo-600">Manage Subjects</h2>
      <div className="tw-flex tw-mb-4">
        <input
          type="text"
          placeholder="Search by subject name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-p-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
          style={{ flex: 1 }}
        />
        <button
          onClick={openAddModal}
          className="tw-ml-4 tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
          style={{ height: '2.5rem', width: 'auto' }}
        >
          {isEditing ? 'Edit Subject' : 'Add Subject'}
        </button>
      </div>
      {
        <div className="tw-overflow-x-auto">
          <table className="tw-min-w-full tw-bg-white">
            <thead>
              <tr>
                <th className="tw-py-2 tw-px-4 tw-bg-gray-200 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Subject Name</th>
                <th className="tw-py-2 tw-px-4 tw-bg-gray-200 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Actions</th>
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
                  confirmRemoveTutor={openDeleteTutorModal}
                  handleEditSubject={openEditModal}
                />
              ))}
            </tbody>
          </table>
        </div>
      }
      <SubjectModal
        showModal={showModal}
        setShowModal={setShowModal}
        subject={currentSubject}
        handleSubmit={handleAddSubject}
        isEditing={isEditing}
      />
      <AddTutorsModal
        showTutorModal={showTutorModal}
        setShowTutorModal={setShowTutorModal}
        selectedSubject={selectedSubject}
        tutorsToAdd={tutorsToAdd}
        setTutorsToAdd={setTutorsToAdd}
        handleAddTutors={handleAddTutors}
      />

      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSubjectToDelete(null);
        }}
        onDelete={handleDeleteSubject}
        itemName={subjectToDelete ? `subject "${subjectToDelete.name}"` : "this subject"}
      />

      <DeleteConfirmationModal
        show={showDeleteTutorModal}
        onClose={() => {
          setShowDeleteTutorModal(false);
          setTutorToDelete(null);
        }}
        onDelete={handleRemoveTutor}
        itemName={tutorToDelete ? `tutor "${tutorToDelete.tutor.name || tutorToDelete.tutor.email}"` : "this tutor"}
      />
    </div>
  );
};

export default SubjectList;
