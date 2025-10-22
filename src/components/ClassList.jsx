"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/firestore/clientFirestore.js";
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
import ClassModal from "./modals/ClassModal.jsx";
import AddStudentsModal from "./modals/AddStudentsModal.jsx";

const ClassList = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [className, setClassName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const [studentsToAdd, setStudentsToAdd] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [viewStudentsClass, setViewStudentsClass] = useState(null);

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

  const handleDeleteClass = async (classToDelete) => {
    if (classToDelete) {
      await deleteDoc(doc(db, "classes", classToDelete.id));
      setClasses(classes.filter((cls) => cls.id !== classToDelete.id));
      setSuccess("Class deleted successfully");
    }
  };

  const handleAddStudents = async (e) => {
    e.preventDefault();
    const entries = studentsToAdd.split(",").map((entry) => entry.trim());

    const newStudents = await Promise.all(
      entries.map(async (entry) => {
        // Check if entry has name:email format (from CSV) or just email (manual)
        let email, name;
        if (entry.includes(':')) {
          [name, email] = entry.split(':').map(s => s.trim());
        } else {
          email = entry;
          name = "";
        }

        const userRef = doc(db, "users", email);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          // User doesn't exist - use name from CSV or empty string
          return { email, name };
        } else {
          const userData = userDoc.data();
          // Prefer name from database, fallback to CSV name, then empty
          return { email, name: userData.name || name || "" };
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

  const handleRemoveStudent = async (classToUpdate, studentToRemove) => {
    const updatedStudents = classToUpdate.students.filter(
      (s) => s.email !== studentToRemove.email
    );
    const classRef = doc(db, "classes", classToUpdate.id);
    await updateDoc(classRef, { students: updatedStudents });
    setSelectedClass((prev) => ({ ...prev, students: updatedStudents }));
    setSuccess("Student removed successfully");
    fetchClasses();
  };

  const handleOpenStudentModal = (cls) => {
    setSelectedClass(cls);
    setShowStudentModal(true);
  };

  const handleViewStudents = (cls) => {
    setViewStudentsClass(cls);
    setShowViewStudentsModal(true);
  };

  const confirmRemoveStudent = (student, cls) => {
    handleRemoveStudent(cls, student);
  };

  const confirmDeleteClass = (cls) => {
    handleDeleteClass(cls);
  };

  return (
    <div className="tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg tw-h-full tw-flex tw-flex-col">
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

      <div className="tw-overflow-x-auto tw-flex-1" style={{ overflowY: 'auto' }}>
        <table className="tw-min-w-full tw-bg-white">
          <thead className="tw-sticky tw-top-0 tw-bg-gray-200 tw-z-10">
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
                handleViewStudents={handleViewStudents}
                confirmRemoveStudent={confirmRemoveStudent}
                handleEditClass={handleEditClass}
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

      {showViewStudentsModal && viewStudentsClass && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Students in {viewStudentsClass.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewStudentsModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh' }}>
                {viewStudentsClass.students && viewStudentsClass.students.length > 0 ? (
                  <div className="list-group">
                    {viewStudentsClass.students.map((student, index) => (
                      <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{student.name || 'No name'}</strong>
                          <br />
                          <small className="text-muted">{student.email}</small>
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => {
                            confirmRemoveStudent(student, viewStudentsClass);
                            setViewStudentsClass(prev => ({
                              ...prev,
                              students: prev.students.filter(s => s.email !== student.email)
                            }));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">No students in this class yet.</p>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowViewStudentsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && <p className="tw-text-sm tw-text-green-600 tw-mt-4">{success}</p>}
    </div>
  );
};

export default ClassList;
