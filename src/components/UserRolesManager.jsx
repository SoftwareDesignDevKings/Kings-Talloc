'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import useAlert from '@/hooks/useAlert';
import styles from '@/styles/userRoles.module.css';
import t from '@/styles/manageTable.module.css';

const getRolePriority = (user) => {
    const all = [user.defaultRole || user.role, ...(user.userRoles || [])];
    if (all.includes('admin'))   return 1;
    if (all.includes('teacher')) return 2;
    if (all.some(r => r === 'tutor' || r === 'coach')) return 3;
    return 4;
};

const sortUsers = (list) => [...list].sort((a, b) => getRolePriority(a) - getRolePriority(b));

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

    // Extra roles available per defaultRole.
    // Teacher and tutor/coach are mutually exclusive — selecting one hides the other.
    const EXTRA_ROLES_BY_DEFAULT = {
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

            const sortedUsers = sortUsers(usersList);
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
            const modalInstance = new window.bootstrap.Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: true,
                focus: true,
            });
            modalInstance.show();

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
                role,
                defaultRole: role,
                userRoles
            }, { merge: true });

            addAlert('success', `Role of ${role} assigned to ${email}`);

            if (modalRef.current && typeof window !== 'undefined' && window.bootstrap) {
                const modalInstance = window.bootstrap.Modal.getInstance(modalRef.current);
                if (modalInstance) {
                    modalInstance.hide();
                }
            } else {
                setShowModal(false);
                setEmail('');
                setName('');
                setRole('student');
                setUserRoles([]);
                setIsEditing(false);
            }

            const querySnapshot = await getDocs(collection(db, 'users'));
            const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const sortedUsers = sortUsers(usersList);
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
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail }),
            });
            if (!res.ok) {
                const { message } = await res.json();
                throw new Error(message);
            }
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
        setRole(user.defaultRole || user.role);
        setUserRoles(user.userRoles || []);
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
            const base64Data = await fileToBase64(file);
            const fileSizeKB = (file.size / 1024).toFixed(2);

            const timestamp = new Date().toISOString();
            const timesheetData = {
                tutorEmail: userEmail,
                tutorName: userName,
                fileData: base64Data,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: timestamp,
                uploadedBy: 'teacher',
            };

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
        <div className={t.container}>
            <h2 className="h4 mb-3 fw-bold text-tks-secondary">
                Manage User Roles
            </h2>

            <div className={t.headerActions}>
                <div className={t.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                    />
                </div>
                <button
                    onClick={() => {
                        setShowModal(true);
                        setIsEditing(false);
                        setEmail('');
                        setName('');
                        setRole('student');
                        setUserRoles([]);
                    }}
                    className="btn btn-outline-primary btn-sm"
                >
                    Add User Role
                </button>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
                <a
                    href="/api/download-template?type=tutor"
                    download="Tutor_Timesheet_Template.docx"
                    className="btn btn-outline-secondary btn-sm rounded-pill"
                >
                    Tutor Template
                </a>
            </div>

            <div className={t.tableWrap}>
                <table className={`table table-hover mb-0 ${t.table}`} style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th scope="col">User</th>
                            <th scope="col" style={{ width: '360px' }}>Roles</th>
                            <th scope="col" style={{ width: '180px' }} className={t.actionCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="fw-bold">{user.name}</div>
                                    <div className="text-muted small">{user.email}</div>
                                </td>
                                <td>
                                    <span className={`${styles.roleBadge} ${styles.roleBadgePrimary}`}>
                                        {(user.defaultRole || user.role).toUpperCase()}
                                    </span>
                                    {user.userRoles && user.userRoles.map(r => (
                                        <span key={r} className={styles.roleBadge}>
                                            {r.toUpperCase()}
                                        </span>
                                    ))}
                                </td>
                                <td className={t.actionCol}>
                                    <div className={t.actionGroup}>
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
                                                    className={`btn btn-sm mb-0 ${styles.uploadLabel} ${
                                                        uploadingTimesheets[user.email]
                                                            ? 'btn-secondary disabled'
                                                            : 'btn-outline-success'
                                                    }`}
                                                >
                                                    {uploadingTimesheets[user.email] ? '...' : 'Upload'}
                                                </label>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="btn btn-sm btn-outline-primary"
                                            aria-label="Edit user"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.email)}
                                            className="btn btn-sm btn-outline-danger"
                                            aria-label="Delete user"
                                        >
                                            Delete
                                        </button>
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
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header border-bottom-0 pb-0">
                                <h5 className="modal-title fw-bold" id="userRoleModalLabel">
                                    {isEditing ? 'Edit User' : 'Add New User'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Close"
                                ></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body pt-4">
                                    <div className={styles.modalSection}>
                                        <div className="mb-3">
                                            <label htmlFor="userEmail" className="form-label small fw-bold text-muted">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                id="userEmail"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={isEditing}
                                            />
                                        </div>
                                        <div className="mb-0">
                                            <label htmlFor="userName" className="form-label small fw-bold text-muted">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="userName"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.modalSection}>
                                        <label htmlFor="userRole" className="form-label small fw-bold text-muted">
                                            Default Access Role
                                        </label>
                                        <select
                                            className="form-select"
                                            id="userRole"
                                            value={role}
                                            onChange={(e) => {
                                                const newDefault = e.target.value;
                                                setRole(newDefault);
                                                const allowed = EXTRA_ROLES_BY_DEFAULT[newDefault] ?? [];
                                                setUserRoles(prev => prev.filter(r => allowed.includes(r)));
                                            }}
                                        >
                                            <option value="student">Student</option>
                                            <option value="tutor">Tutor</option>
                                            <option value="coach">Coach</option>
                                            <option value="teacher">Teacher</option>
                                        </select>
                                    </div>

                                    {extraRoleOptions.length > 0 && (
                                        <div>
                                            <label className="form-label small fw-bold text-muted mb-0">
                                                Additional Privileges
                                            </label>
                                            <div className={styles.rolesGrid}>
                                                {extraRoleOptions.map((roleOption) => {
                                                    const isSelected = userRoles.includes(roleOption);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={roleOption}
                                                            className={`badge rounded-pill ${styles.selectableBadge} ${isSelected ? styles.selectableBadgeSelected : 'bg-light text-dark'}`}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setUserRoles(userRoles.filter(r => r !== roleOption));
                                                                } else {
                                                                    setUserRoles([...userRoles, roleOption]);
                                                                }
                                                            }}
                                                        >
                                                            {roleOption.toUpperCase()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top-0 pt-0">
                                    <button
                                        type="button"
                                        className="btn btn-link text-muted text-decoration-none"
                                        data-bs-dismiss="modal"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-outline-primary px-4">
                                        {isEditing ? 'Save Changes' : 'Create User'}
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
