'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firestore/firestoreClient.js';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import SubjectModal from './modals/SubjectModal.jsx';
import AddTutorsModal from './modals/AddTutorsModal.jsx';
import SubjectRow from './SubjectRow.jsx';
import useAlert from '@/hooks/useAlert';
import t from '@/styles/manageTable.module.css';

const SubjectList = () => {
    const { addAlert } = useAlert();
    const [subjects, setSubjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentSubject, setCurrentSubject] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showTutorModal, setShowTutorModal] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [tutorsToAdd, setTutorsToAdd] = useState('');
    const [expandedSubjects, setExpandedSubjects] = useState(new Set());
    const [filteredSubjects, setFilteredSubjects] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            const querySnapshot = await getDocs(collection(db, 'subjects'));
            const subjectsList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setSubjects(subjectsList);
            setFilteredSubjects(subjectsList);
        };

        fetchSubjects();
    }, []);

    useEffect(() => {
        const results = subjects.filter((subject) =>
            subject.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredSubjects(results);
    }, [searchTerm, subjects]);

    const handleAddSubject = async (subject) => {
        if (isEditing) {
            const subjectRef = doc(db, 'subjects', currentSubject.id);
            await updateDoc(subjectRef, subject);
            setSubjects(
                subjects.map((sub) =>
                    sub.id === currentSubject.id ? { ...sub, ...subject } : sub,
                ),
            );
            setIsEditing(false);
            addAlert('success', 'Subject updated successfully');
        } else {
            const docRef = await addDoc(collection(db, 'subjects'), subject);
            setSubjects([...subjects, { id: docRef.id, ...subject }]);
            addAlert('success', 'Subject added successfully');
        }
        setShowModal(false);
    };

    const handleEditSubject = (subject) => {
        setCurrentSubject(subject);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDeleteSubject = async (subjectToDelete) => {
        if (subjectToDelete) {
            await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
            setSubjects(subjects.filter((subject) => subject.id !== subjectToDelete.id));
            if (expandedSubject === subjectToDelete.id) setExpandedSubject(null);
        }
    };

    const handleAddTutors = async (emails) => {
        const newTutors = await Promise.all(
            emails.map(async (email) => {
                const userRef = doc(db, 'users', email);
                const userDoc = await getDoc(userRef);
                if (!userDoc.exists()) {
                    await setDoc(userRef, { email, role: 'tutor' }, { merge: true });
                    return { email, name: '' };
                } else {
                    const userData = userDoc.data();
                    return { email, name: userData.name || '' };
                }
            }),
        );
        const updatedTutors = [...(selectedSubject.tutors || []), ...newTutors];
        const subjectRef = doc(db, 'subjects', selectedSubject.id);
        await updateDoc(subjectRef, { tutors: updatedTutors });
        setSubjects(
            subjects.map((sub) =>
                sub.id === selectedSubject.id ? { ...sub, tutors: updatedTutors } : sub,
            ),
        );
        setShowTutorModal(false);
        setTutorsToAdd('');
        addAlert('success', 'Tutors added successfully');
    };

    const handleRemoveTutor = async (tutor, subject) => {
        const updatedTutors = subject.tutors.filter((t) => t.email !== tutor.email);
        const subjectRef = doc(db, 'subjects', subject.id);
        await updateDoc(subjectRef, { tutors: updatedTutors });
        setSubjects(
            subjects.map((sub) =>
                sub.id === subject.id ? { ...sub, tutors: updatedTutors } : sub,
            ),
        );
        addAlert('success', 'Tutor removed successfully');
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
        handleDeleteSubject(subject);
    };

    const openAddTutorModal = (subject) => {
        setSelectedSubject(subject);
        setShowTutorModal(true);
    };

    const handleExpandSubject = (subject) => {
        setExpandedSubjects((prev) => {
            const s = new Set(prev);
            s.has(subject.id) ? s.delete(subject.id) : s.add(subject.id);
            return s;
        });
    };

    return (
        <div className={t.container}>
            <h2 className="h4 mb-3 fw-bold text-tks-secondary">Manage Subjects</h2>

            <div className={t.headerActions}>
                <div className={t.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search by subject name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="btn btn-outline-primary btn-sm text-nowrap"
                >
                    Add Subject
                </button>
            </div>

            <div className={t.tableWrap}>
                <table className={`table table-hover mb-0 ${t.table}`} style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th scope="col">Subject Name</th>
                            <th scope="col" style={{ width: '48%' }} className={t.actionCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubjects.map((subject) => (
                            <SubjectRow
                                key={subject.id}
                                subject={subject}
                                handleOpenTutorModal={openAddTutorModal}
                                confirmDeleteSubject={openDeleteModal}
                                handleExpandSubject={handleExpandSubject}
                                expandedSubjects={expandedSubjects}
                                confirmRemoveTutor={handleRemoveTutor}
                                handleEditSubject={openEditModal}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
};

export default SubjectList;
