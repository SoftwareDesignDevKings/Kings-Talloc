"use client";

import React, { useState, useEffect } from "react";
import { db } from "@firebase/db";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import ClassRow from "./ClassRow.jsx";
import ClassFormModal from "./modals/ClassFormModal.jsx";
import StudentFormModal from "./modals/StudentFormModal.jsx";
import ConfirmationModal from "./modals/ConfirmationModal.jsx";

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [className, setClassName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const [studentsToAdd, setStudentsToAdd] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);

  const fetchClasses = async () => {
    const querySnapshot = await getDocs(collection(db, "classes"));
    const classesList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setClasses(classesList);
    setFilteredClasses(classesList);
  };

  const fetchSubjects = async () => {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    const subjectsList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));
    setSubjects(subjectsList);
  };

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    const results = classes.filter((cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClasses(results);
  }, [searchTerm, classes]);

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!selectedSubject) {
      setSuccess("Please select a subject.");
      return;
    }
    if (isEditing) {
      const classRef = doc(db, "classes", selectedClass.id);
      await updateDoc(classRef, {
        name: className,
        subject: selectedSubject.id,
      });
      setClasses(
        classes.map((cls) =>
          cls.id === selectedClass.id
            ? { ...cls, name: className, subject: selectedSubject.id }
            : cls
        )
      );
      setIsEditing(false);
    } else {
      await addDoc(collection(db, "classes"), {
        name: className,
        subject: selectedSubject.id,
      });
    }
    setClassName("");
    setSelectedSubject(null);
    setShowModal(false);
    setSuccess(isEditing ? "Class edited successfully" : "Class added successfully");
    fetchClasses();
  };

  const handleEditClass = (cls) => {
    setSelectedClass(cls);
    setClassName(cls.name);
    setSelectedSubject(subjects.find((subject) => subject.id === cls.subject));
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClass = async () => {
    if (classToDelete) {
      await deleteDoc(doc(db, "classes", classToDelete.id));
      setClasses(classes.filter((cls) => cls.id !== classToDelete.id));
      setSuccess("Class deleted successfully");
      setClassToDelete(null);
      setShowConfirmationModal(false);
    }
  };

  const handleAddStudents = async (e) => {
    e.preventDefault();
    const emails = studentsToAdd.split(",").map((email) => email.trim());
    const newStudents = await Promise.all(
      emails.map(async (email) => {
        const userRef = doc(db, "users", email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, { email, role: "student" }, { merge: true });
          return { email, name: "" };
        } else {
          const userData = userDoc.data();
          return { email, name: userData.name || "" };
        }
      })
    );
    const updatedStudents = [...(selectedClass.students || []), ...newStudents];
    const classRef = doc(db, "classes", selectedClass.id);
    await updateDoc(classRef, { students: updatedStudents });
    setSelectedClass((prev) => ({ ...prev, students: updatedStudents }));
    setStudentsToAdd("");
    setShowStudentModal(false);
    setSuccess("Students added successfully");
    fetchClasses();
  };

  const handleRemoveStudent = async () => {
    const updatedStudents = selectedClass.students.filter(
      (s) => s.email !== studentToRemove.email
    );
    const classRef = doc(db, "classes", selectedClass.id);
    await updateDoc(classRef, { students: updatedStudents });
    setSelectedClass((prev) => ({ ...prev, students: updatedStudents }));
    setShowConfirmationModal(false);
    setStudentToRemove(null);
    setSuccess("Student removed successfully");
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
    setConfirmationAction("removeStudent");
    setShowConfirmationModal(true);
  };

  const confirmDeleteClass = (cls) => {
    setClassToDelete(cls);
    setConfirmationAction("deleteClass");
    setShowConfirmationModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmationAction === "deleteClass") {
      handleDeleteClass();
    } else if (confirmationAction === "removeStudent") {
      handleRemoveStudent();
    }
  };

  return (
    <div className="tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
      <h2 className="tw-text-2xl tw-font-bold tw-mb-4 tw-text-indigo-600">Manage Classes</h2>
      <div className="tw-flex tw-mb-4">
        <input
          type="text"
          placeholder="Search by class name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="tw-p-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
          style={{ flex: 1 }}
        />
        <button
          onClick={() => {
            setSelectedClass(null);
            setIsEditing(false);
            setShowModal(true);
          }}
          className="tw-ml-4 tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
          style={{ height: "2.5rem", width: "auto" }}
        >
          Add Class
        </button>
      </div>

      <div className="tw-overflow-x-auto">
        <table className="tw-min-w-full tw-bg-white">
          <thead>
            <tr>
              <th className="tw-py-2 tw-px-4 tw-bg-gray-200 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                Class Name
              </th>
              <th className="tw-py-2 tw-px-4 tw-bg-gray-200 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                Subject
              </th>
              <th className="tw-py-2 tw-px-4 tw-bg-gray-200 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClasses.map((cls) => (
              <ClassRow
                key={cls.id}
                cls={cls}
                subjects={subjects}
                handleOpenStudentModal={handleOpenStudentModal}
                confirmDeleteClass={confirmDeleteClass}
                handleExpandClass={handleExpandClass}
                expandedClass={expandedClass}
                confirmRemoveStudent={confirmRemoveStudent}
                handleEditClass={handleEditClass}
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
        subjects={subjects}
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        isEditing={isEditing}
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
        entity={
          confirmationAction === "deleteClass" ? classToDelete : studentToRemove
        }
        entityName={
          confirmationAction === "deleteClass"
            ? "Class"
            : studentToRemove
            ? studentToRemove.name || studentToRemove.email
            : "Student"
        }
        handleConfirmAction={handleConfirmAction}
        actionType={confirmationAction}
      />
      {success && <p className="tw-text-sm tw-text-green-600 tw-mt-4">{success}</p>}
    </div>
  );
};

export default ClassList;
