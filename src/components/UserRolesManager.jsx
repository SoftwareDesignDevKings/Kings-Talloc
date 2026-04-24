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
    const [role, setRole] = useState('student'); // This maps to defaultRole in Firestore
    const [userRoles, setUserRoles] = useState([]); // Additional roles array
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingTimesheets, setUploadingTimesheets] = useState({});
    const { addAlert } = useAlert();
    const modalRef = useRef(null);

    // Extra roles available per defaultRole
    const EXTRA_ROLES_BY_DEFAULT = {
        admin:   [],
        teacher: ['admin'],
        tutor:   ['coach', 'admin'],
        coach:   ['tutor', 'admin'],
        student: [],
    };

    const extraRoleOptions = EXTRA_ROLES_BY_DEFAULT[role] ?? [];

    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            const sortedUsers = usersList.sort((a, b) => {
                const roleOrder = { admin: 1, teacher: 2, tutor: 3, coach: 4, student: 5 };
                const aRole = a.defaultRole || a.role;
                const bRole = b.defaultRole || b.role;
                return (roleOrder[aRole] || 6) - (roleOrder[bRole] || 6);
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
                user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.defaultRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.userRoles?.some(r => r.toLowerCase().includes(searchTerm.toLowerCase())),
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
                setUserRoles([]);
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
            addAlert('error', 'Please enter a valid email address.');
            return;
        }

        try {
            const userRef = doc(db, 'users', email);

            // Check if user already exists (only when adding new user, not editing)
            if (!isEditing) {
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    addAlert('error', 'A user with this email already exists.');
                    return;
                }
            }

            await setDoc(userRef, {
                email,
                name,
                role, // Keep for backward compatibility
                defaultRole: role,
                userRoles
            }, { merge: true });

            addAlert('success', `Role of ${role} assigned to ${email}`);

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
                setUserRoles([]);
                setIsEditing(false);
            }

            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const sortedUsers = usersList.sort((a, b) => {
                const roleOrder = { admin: 1, teacher: 2, tutor: 3, coach: 4, student: 5 };
                const aRole = a.defaultRole || a.role;
                const bRole = b.defaultRole || b.role;
                return (roleOrder[aRole] || 6) - (roleOrder[bRole] || 6);
            });
            setUsers(sortedUsers);
            setFilteredUsers(sortedUsers);
        } catch (error) {
            console.error('Error adding/updating user:', error);
            if (error.code === 'permission-denied') {
                addAlert('error', 'Permission denied. You do not have access to modify user roles.');
            } else {
                addAlert('error', `Error: ${error.message || 'Failed to save user role. Please try again.'}`);
            }
        }
    };

    const handleDelete = async (userEmail) => {
        try {
            await deleteDoc(doc(db, 'users', userEmail));
            const updatedUsers = users.filter((user) => user.email !== userEmail);
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            addAlert('success', `User ${userEmail} deleted successfully.`);
        } catch (error) {
            console.error('Error deleting user:', error);
            addAlert('error', 'Error deleting user. Please try again.');
        }
    };

    const handleEdit = (user) => {
        setEmail(user.email);
        setName(user.name);
        setRole(user.defaultRole || user.role); // Use defaultRole if available, fallback to role
        setUserRoles(user.userRoles || []); // Load existing userRoles or empty array
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

            addAlert('success', `Timesheet uploaded successfully for ${userName} (${fileSizeKB}KB)`);
        } catch (error) {
            console.error('Error uploading timesheet:', error);
            addAlert('error', 'Error uploading timesheet. Please try again.');
        } finally {
            setUploadingTimesheets((prev) => ({ ...prev, [userEmail]: false }));
        }
    };

    return (
        <div className="p-4 bg-white rounded shadow h-100">
            <h2 className="h4 mb-4 fw-bold text-tks-secondary">
                Manage User Roles
            </h2>
            <div className="d-flex gap-2 mb-3">
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
                        setUserRoles([]);
                    }}
                    className="btn btn-primary text-nowrap"
                >
                    Add User Role
                </button>
            </div>
            <hr className="my-3" />
            <div className="d-flex flex-wrap gap-2 mb-4">
                <a
                    href="/api/download-template?type=tutor"
                    download="Tutor_Timesheet_Template.docx"
                    className="btn btn-outline-secondary btn-sm"
                >
                    Tutor Timesheet Template
                </a>
            </div>
            <div className="table-responsive" style={{ height: 'calc(100% - 8rem)', overflowY: 'auto' }}>
                <table className="table table-hover table-text-sm">
                    <thead className="sticky-top bg-light">
                        <tr>
                            <th scope="col">Email</th>
                            <th scope="col">Name</th>
                            <th scope="col">Default Role</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>{user.email}</td>
                                <td>{user.name}</td>
                                <td>
                                    <div>{(user.defaultRole || user.role).toUpperCase()}</div>
                                    {user.userRoles && user.userRoles.length > 0 && (
                                        <small className="text-muted">
                                            {user.userRoles.map(r => r.toUpperCase()).join(', ')}
                                        </small>
                                    )}
                                </td>
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
                                        {((user.defaultRole || user.role) === 'tutor' || user.userRoles?.includes('tutor')) && (
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
                                            Default Role
                                        </label>
                                        <select
                                            className="form-select"
                                            id="userRole"
                                            value={role}
                                            onChange={(e) => {
                                                const newDefault = e.target.value;
                                                setRole(newDefault);
                                                // strip any userRoles that aren't valid for the new defaultRole
                                                const allowed = EXTRA_ROLES_BY_DEFAULT[newDefault] ?? [];
                                                setUserRoles(prev => prev.filter(r => allowed.includes(r)));
                                            }}
                                            aria-label="Select default role"
                                        >
                                            <option value="student">Student</option>
                                            <option value="tutor">Tutor</option>
                                            <option value="coach">Coach</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Additional Roles</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {extraRoleOptions.length === 0 ? (
                                                <small className="text-muted fst-italic">No additional roles for this default role</small>
                                            ) : (
                                                extraRoleOptions.map((roleOption) => {
                                                    const isSelected = userRoles.includes(roleOption);
                                                    return (
                                                        <button
                                                            key={roleOption}
                                                            type="button"
                                                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setUserRoles(userRoles.filter(r => r !== roleOption));
                                                                } else {
                                                                    setUserRoles([...userRoles, roleOption]);
                                                                }
                                                            }}
                                                        >
                                                            {roleOption}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        {extraRoleOptions.length > 0 && (
                                            <small className="text-muted">Click to toggle additional roles</small>
                                        )}
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
