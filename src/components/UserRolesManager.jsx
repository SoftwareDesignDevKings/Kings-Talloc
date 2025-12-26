'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import useAlert from '@/hooks/useAlert';

const UserRolesManager = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('student');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingTimesheets, setUploadingTimesheets] = useState({});
    const { setAlertMessage, setAlertType } = useAlert();
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            const sortedUsers = usersList.sort((a, b) => {
                const roleOrder = { teacher: 1, tutor: 2, student: 3 };
                return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
            });

            setUsers(sortedUsers);
            setFilteredUsers(sortedUsers);
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        const results = users.filter(
            (user) =>
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role?.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        setFilteredUsers(results);
    }, [searchTerm, users]);

    useEffect(() => {
        if (showModal && modalRef.current && typeof window !== 'undefined' && window.bootstrap) {
            // Initialize Bootstrap modal with accessibility features
            const modalInstance = new window.bootstrap.Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: true,
                focus: true,
            });
            modalInstance.show();

            // Handle modal close event
            const handleModalHidden = () => {
                setShowModal(false);
                setEmail('');
                setName('');
                setRole('student');
                setIsEditing(false);
            };

            modalRef.current.addEventListener('hidden.bs.modal', handleModalHidden);

            return () => {
                modalInstance.hide();
                // eslint-disable-next-line react-hooks/exhaustive-deps
                modalRef.current?.removeEventListener('hidden.bs.modal', handleModalHidden);
            };
        }
    }, [showModal]);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setAlertMessage('Please enter a valid email address.');
            setAlertType('error');
            return;
        }

        try {
            const userRef = doc(db, 'users', email);

            // Check if user already exists (only when adding new user, not editing)
            if (!isEditing) {
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    setAlertMessage('A user with this email already exists.');
                    setAlertType('error');
                    return;
                }
            }

            await setDoc(userRef, { email, name, role }, { merge: true });

            setAlertMessage(`Role of ${role} assigned to ${email}`);
            setAlertType('success');

            // Close modal using Bootstrap API
            if (modalRef.current && typeof window !== 'undefined' && window.bootstrap) {
                const modalInstance = window.bootstrap.Modal.getInstance(modalRef.current);
                if (modalInstance) {
                    modalInstance.hide();
                }
            } else {
                // Fallback if Bootstrap not loaded
                setShowModal(false);
                setEmail('');
                setName('');
                setRole('student');
                setIsEditing(false);
            }

            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const sortedUsers = usersList.sort((a, b) => {
                const roleOrder = { teacher: 1, tutor: 2, student: 3 };
                return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
            });
            setUsers(sortedUsers);
            setFilteredUsers(sortedUsers);
        } catch (error) {
            console.error('Error adding/updating user:', error);
            if (error.code === 'permission-denied') {
                setAlertMessage('Permission denied. You do not have access to modify user roles.');
                setAlertType('error');
            } else {
                setAlertMessage(
                    `Error: ${error.message || 'Failed to save user role. Please try again.'}`,
                );
                setAlertType('error');
            }
        }
    };

    const handleDelete = async (userEmail) => {
        try {
            await deleteDoc(doc(db, 'users', userEmail));
            const updatedUsers = users.filter((user) => user.email !== userEmail);
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            setAlertMessage(`User ${userEmail} deleted successfully.`);
            setAlertType('success');
        } catch (error) {
            console.error('Error deleting user:', error);
            setAlertMessage('Error deleting user. Please try again.');
            setAlertType('error');
        }
    };

    const handleEdit = (user) => {
        setEmail(user.email);
        setName(user.name);
        setRole(user.role);
        setIsEditing(true);
        setShowModal(true);
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleTimesheetUpload = async (userEmail, userName, file) => {
        if (!file) return;

        setUploadingTimesheets((prev) => ({ ...prev, [userEmail]: true }));

        try {
            // Convert file to base64
            const base64Data = await fileToBase64(file);
            const fileSizeKB = (file.size / 1024).toFixed(2);

            // Save timesheet data with base64 encoded file to Firestore
            // Use email as document ID for easy lookup
            const timestamp = new Date().toISOString();
            const timesheetData = {
                tutorEmail: userEmail,
                tutorName: userName,
                fileData: base64Data, // Store base64 encoded file
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: timestamp,
                uploadedBy: 'teacher',
            };

            // Use setDoc with email as document ID instead of addDoc
            await setDoc(doc(db, 'timesheets', userEmail), timesheetData);

            setAlertMessage(`Timesheet uploaded successfully for ${userName} (${fileSizeKB}KB)`);
            setAlertType('success');
        } catch (error) {
            console.error('Error uploading timesheet:', error);
            setAlertMessage('Error uploading timesheet. Please try again.');
            setAlertType('error');
        } finally {
            setUploadingTimesheets((prev) => ({ ...prev, [userEmail]: false }));
        }
    };

    return (
        <div className="p-4 bg-white rounded shadow h-100">
            <h2 className="h4 mb-4 fw-bold text-tks-secondary">
                Manage User Roles
            </h2>
            <div className="d-flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Search by name, email, or role"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control"
                />
                <button
                    onClick={() => {
                        setShowModal(true);
                        setIsEditing(false);
                        setEmail('');
                        setName('');
                        setRole('student');
                    }}
                    className="btn btn-primary text-nowrap"
                >
                    Add User Role
                </button>
            </div>
            <div className="table-responsive" style={{ height: 'calc(100% - 8rem)', overflowY: 'auto' }}>
                <table className="table table-hover table-text-sm">
                    <thead className="sticky-top bg-light">
                        <tr>
                            <th scope="col">Email</th>
                            <th scope="col">Name</th>
                            <th scope="col">Role</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>{user.email}</td>
                                <td>{user.name}</td>
                                <td>{user.role.toUpperCase()}</td>
                                <td>
                                    <div className="d-flex gap-2 align-items-center">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="btn btn-sm btn-primary"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.email)}
                                            className="btn btn-sm btn-danger"
                                        >
                                            Delete
                                        </button>
                                        {user.role === 'tutor' && (
                                            <>
                                                <input
                                                    type="file"
                                                    accept=".docx,.pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleTimesheetUpload(
                                                                user.email,
                                                                user.name,
                                                                file,
                                                            );
                                                        }
                                                    }}
                                                    className="d-none"
                                                    id={`timesheet-upload-${user.email}`}
                                                    disabled={uploadingTimesheets[user.email]}
                                                />
                                                <label
                                                    htmlFor={`timesheet-upload-${user.email}`}
                                                    className={`btn btn-sm mb-0 ${
                                                        uploadingTimesheets[user.email]
                                                            ? 'btn-secondary disabled'
                                                            : 'btn-success'
                                                    }`}
                                                    style={{ cursor: uploadingTimesheets[user.email] ? 'not-allowed' : 'pointer' }}
                                                >
                                                    {uploadingTimesheets[user.email]
                                                        ? 'Uploading...'
                                                        : 'Upload Timesheet'}
                                                </label>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div
                    className="modal fade"
                    ref={modalRef}
                    tabIndex="-1"
                    aria-labelledby="userRoleModalLabel"
                    data-bs-backdrop="static"
                    data-bs-keyboard="true"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="userRoleModalLabel">
                                    {isEditing ? 'Edit User Role' : 'Add User Role'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Close"
                                ></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label htmlFor="userEmail" className="form-label">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="userEmail"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            aria-required="true"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="userName"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            aria-required="true"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="userRole" className="form-label">
                                            Role
                                        </label>
                                        <select
                                            className="form-select"
                                            id="userRole"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            aria-label="Select user role"
                                        >
                                            <option value="student">Student</option>
                                            <option value="tutor">Tutor</option>
                                            <option value="teacher">Teacher</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        data-bs-dismiss="modal"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {isEditing ? 'Save Changes' : 'Add Role'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserRolesManager;
