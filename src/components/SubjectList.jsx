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
    query,
    where,
    documentId,
    writeBatch,
} from 'firebase/firestore';
import SubjectModal from './modals/SubjectModal.jsx';
import AddTutorsModal from './modals/AddTutorsModal.jsx';
import SubjectRow from './SubjectRow.jsx';

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

    const handleDeleteSubject = async (subjectToDelete) => {
        if (subjectToDelete) {
            await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
            setSubjects(subjects.filter((subject) => subject.id !== subjectToDelete.id));
        }
    };

    const handleAddTutors = async (emails) => {
        const uniqueEmails = [
            ...new Set(emails.map((email) => email.trim()).filter((email) => email !== '')),
        ];
        if (uniqueEmails.length === 0) return;
        if (uniqueEmails.length > 499) {
            addAlert('error', 'Too many tutors at once — please add 499 or fewer at a time.');
            return;
        }

        const batch = writeBatch(db);
        const usersCollection = collection(db, 'users');
        const existingUsersMap = new Map();

        // fetch existing users in chunks of 30 (Firestore 'in' query limit) 
        const chunks = [];
        for (let i = 0; i < uniqueEmails.length; i += 30) {
            chunks.push(uniqueEmails.slice(i, i + 30));
        }

        // Promise.all to ensure they fire in parallel
        const snapshots = await Promise.all(
            chunks.map((chunk) => {
                const q = query(usersCollection, where(documentId(), 'in', chunk));
                return getDocs(q);
            }),
        );

        snapshots.forEach((querySnapshot) => {
            querySnapshot.forEach((docSnap) => {
                existingUsersMap.set(docSnap.id, docSnap.data());
            });
        });

        const newTutors = uniqueEmails.map((email) => {
            if (existingUsersMap.has(email)) {
                const userData = existingUsersMap.get(email);
                return { email, name: userData.name || '' };
            } else {
                const userRef = doc(db, 'users', email);
                batch.set(userRef, { email, role: 'tutor', defaultRole: 'tutor'}, { merge: true });
                return { email, name: '' };
            }
        });

        const updatedTutors = [...(selectedSubject.tutors || []), ...newTutors];
        const subjectRef = doc(db, 'subjects', selectedSubject.id);
        batch.update(subjectRef, { tutors: updatedTutors });

        try {
            await batch.commit();
        } catch (err) {
            console.error('Failed to add tutors:', err);
            addAlert('error', 'Failed to save tutors. Please try again.');
            return;
        }

        setSubjects(
            subjects.map((sub) =>
                sub.id === selectedSubject.id ? { ...sub, tutors: updatedTutors } : sub,
            ),
        );
        setShowTutorModal(false);
        setTutorsToAdd('');
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
        setExpandedSubject(expandedSubject === subject.id ? null : subject.id);
    };

    return (
        <div className="p-4 bg-white rounded shadow h-100 d-flex flex-column">
            <h2 className="h4 mb-4 fw-bold text-tks-secondary">Manage Subjects</h2>
            <div className="d-flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Search by subject name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control"
                />
                <button
                    onClick={openAddModal}
                    className="btn btn-outline-primary btn-sm text-nowrap"
                >
                    {isEditing ? 'Edit Subject' : 'Add Subject'}
                </button>
            </div>

            <div className="table-responsive flex-fill" style={{ overflowY: 'auto' }}>
                <table className="table table-hover table-text-sm">
                    <thead className="sticky-top bg-light">
                        <tr>
                            <th scope="col">Subject Name</th>
                            <th scope="col">Actions</th>
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
                                expandedSubject={expandedSubject}
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
