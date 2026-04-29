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
} from 'firebase/firestore';
import ClassRow from './ClassRow.jsx';
import ClassModal from './modals/ClassModal.jsx';
import AddStudentsModal from './modals/AddStudentsModal.jsx';
import useAlert from '@/hooks/useAlert';
import t from '@/styles/manageTable.module.css';

const ClassList = () => {
    const { addAlert } = useAlert();
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [className, setClassName] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [studentsToAdd, setStudentsToAdd] = useState('');
    const [selectedClass, setSelectedClass] = useState(null);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [expandedClass, setExpandedClass] = useState(null);

    const fetchClasses = async () => {
        const querySnapshot = await getDocs(collection(db, 'classes'));
        const classesList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setClasses(classesList);
        setFilteredClasses(classesList);
    };

    const fetchSubjects = async () => {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        const subjectsList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name,
        }));
        setSubjects(subjectsList);
    };

    const fetchTeachers = async () => {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const teachersList = querySnapshot.docs
            .map((doc) => ({
                email: doc.id,
                ...doc.data(),
            }))
            .filter(
                (user) =>
                    user.defaultRole === 'teacher' ||
                    (Array.isArray(user.userRoles) && user.userRoles.includes('teacher')),
            );
        setTeachers(teachersList);
    };

    useEffect(() => {
        fetchClasses();
        fetchSubjects();
        fetchTeachers();
    }, []);

    useEffect(() => {
        const results = classes.filter((cls) =>
            cls.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredClasses(results);
    }, [searchTerm, classes]);

    const handleAddClass = async (e) => {
        e.preventDefault();
        if (!selectedSubject) {
            addAlert('error', 'Please select a subject.');
            return;
        }
        if (!selectedTeacher) {
            addAlert('error', 'Please select a teacher.');
            return;
        }

        if (isEditing) {
            const classRef = doc(db, 'classes', selectedClass.id);
            await updateDoc(classRef, {
                name: className,
                subject: selectedSubject.id,
                teacherEmail: selectedTeacher.email,
            });
            setClasses(
                classes.map((cls) =>
                    cls.id === selectedClass.id
                        ? {
                              ...cls,
                              name: className,
                              subject: selectedSubject.id,
                              teacherEmail: selectedTeacher.email,
                          }
                        : cls,
                ),
            );
            setIsEditing(false);
        } else {
            await addDoc(collection(db, 'classes'), {
                name: className,
                subject: selectedSubject.id,
                teacherEmail: selectedTeacher.email,
            });
        }
        setClassName('');
        setSelectedSubject(null);
        setSelectedTeacher(null);
        setShowModal(false);
        addAlert('success', isEditing ? 'Class edited successfully' : 'Class added successfully');
        fetchClasses();
    };

    const handleEditClass = (cls) => {
        setSelectedClass(cls);
        setClassName(cls.name);
        setSelectedSubject(subjects.find((subject) => subject.id === cls.subject));
        setSelectedTeacher(teachers.find((teacher) => teacher.email === cls.teacherEmail));
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDeleteClass = async (classToDelete) => {
        if (classToDelete) {
            await deleteDoc(doc(db, 'classes', classToDelete.id));
            setClasses(classes.filter((cls) => cls.id !== classToDelete.id));
            if (expandedClass === classToDelete.id) setExpandedClass(null);
            addAlert('success', 'Class deleted successfully');
        }
    };

    const handleAddStudents = async (e) => {
        e.preventDefault();
        const entries = studentsToAdd.split(',').map((entry) => entry.trim());

        const newStudents = await Promise.all(
            entries.map(async (entry) => {
                let email, name;
                if (entry.includes(':')) {
                    [name, email] = entry.split(':').map((s) => s.trim());
                } else {
                    email = entry;
                    name = '';
                }

                const userRef = doc(db, 'users', email);
                const userDoc = await getDoc(userRef);
                if (!userDoc.exists()) {
                    return { email, name };
                } else {
                    const userData = userDoc.data();
                    return { email, name: userData.name || name || '' };
                }
            }),
        );
        const updatedStudents = [...(selectedClass.students || []), ...newStudents];
        const classRef = doc(db, 'classes', selectedClass.id);
        await updateDoc(classRef, { students: updatedStudents });
        setSelectedClass((prev) => ({ ...prev, students: updatedStudents }));
        setStudentsToAdd('');
        setShowStudentModal(false);
        addAlert('success', 'Students added successfully');
        fetchClasses();
    };

    const handleRemoveStudent = async (classToUpdate, studentToRemove) => {
        const updatedStudents = classToUpdate.students.filter(
            (s) => s.email !== studentToRemove.email,
        );
        const classRef = doc(db, 'classes', classToUpdate.id);
        await updateDoc(classRef, { students: updatedStudents });
        addAlert('success', 'Student removed successfully');
        fetchClasses();
    };

    const handleOpenStudentModal = (cls) => {
        setSelectedClass(cls);
        setShowStudentModal(true);
    };

    const handleExpandClass = (cls) => {
        setExpandedClass(expandedClass === cls.id ? null : cls.id);
    };

    return (
        <div className={t.container}>
            <h2 className="h4 mb-3 fw-bold text-tks-secondary">Manage Classes</h2>

            <div className={t.headerActions}>
                <div className={t.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search by class name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                    />
                </div>
                <button
                    onClick={() => {
                        setSelectedClass(null);
                        setIsEditing(false);
                        setShowModal(true);
                        setSelectedSubject(null);
                        setSelectedTeacher(null);
                    }}
                    className="btn btn-outline-primary btn-sm text-nowrap"
                >
                    Add Class
                </button>
            </div>

            <div className={t.tableWrap}>
                <table className={`table table-hover mb-0 ${t.table}`}>
                    <thead>
                        <tr>
                            <th scope="col">Class Name</th>
                            <th scope="col">Subject</th>
                            <th scope="col">Teacher</th>
                            <th scope="col" className={t.actionCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClasses.map((cls) => (
                            <ClassRow
                                key={cls.id}
                                cls={cls}
                                subjects={subjects}
                                teachers={teachers}
                                handleOpenStudentModal={handleOpenStudentModal}
                                confirmDeleteClass={handleDeleteClass}
                                confirmRemoveStudent={handleRemoveStudent}
                                handleEditClass={handleEditClass}
                                expandedClass={expandedClass}
                                handleExpandClass={handleExpandClass}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <ClassModal
                showModal={showModal}
                setShowModal={setShowModal}
                className={className}
                setClassName={setClassName}
                handleAddClass={handleAddClass}
                subjects={subjects}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                teachers={teachers}
                selectedTeacher={selectedTeacher}
                setSelectedTeacher={setSelectedTeacher}
                isEditing={isEditing}
            />
            <AddStudentsModal
                showStudentModal={showStudentModal}
                setShowStudentModal={setShowStudentModal}
                selectedClass={selectedClass}
                studentsToAdd={studentsToAdd}
                setStudentsToAdd={setStudentsToAdd}
                handleAddStudents={handleAddStudents}
            />
        </div>
    );
};

export default ClassList;
