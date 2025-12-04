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
        <div className="tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg tw-h-full">
            <h2 className="tw-text-2xl tw-font-bold tw-mb-4 tw-text-indigo-600">
                Manage User Roles
            </h2>
            <div className="tw-flex tw-mb-4">
                <input
                    type="text"
                    placeholder="Search by name, email, or role"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="tw-p-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
                    style={{ flex: 1 }}
                />
                <button
                    onClick={() => {
                        setShowModal(true);
                        setIsEditing(false);
                        setEmail('');
                        setName('');
                        setRole('student');
                    }}
                    className="tw-ml-4 tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
                    style={{ height: '2.5rem', width: 'auto' }}
                >
                    Add User Role
                </button>
            </div>
            {
                <div
                    className="tw-overflow-x-auto"
                    style={{ height: 'calc(100% - 5rem)', overflowY: 'auto' }}
                >
                    <table className="tw-min-w-full tw-bg-white">
                        <thead className="tw-sticky tw-top-0 tw-bg-gray-200 tw-z-10">
                            <tr>
                                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                                    Email
                                </th>
                                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                                    Name
                                </th>
                                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                                    Role
                                </th>
                                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="tw-border-b tw-border-gray-200">
                                    <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                                        {user.email}
                                    </td>
                                    <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                                        {user.name}
                                    </td>
                                    <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                                        {user.role.toUpperCase()}
                                    </td>
                                    <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                                        <div className="tw-flex tw-items-center tw-gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.email)}
                                                className="tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
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
                                                        className="tw-hidden"
                                                        id={`timesheet-upload-${user.email}`}
                                                        disabled={uploadingTimesheets[user.email]}
                                                    />
                                                    <label
                                                        htmlFor={`timesheet-upload-${user.email}`}
                                                        className={`tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-rounded tw-cursor-pointer tw-text-center ${
                                                            uploadingTimesheets[user.email]
                                                                ? 'tw-bg-gray-400 tw-cursor-not-allowed'
                                                                : 'tw-bg-green-600 hover:tw-bg-green-700'
                                                        }`}
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
            }
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
