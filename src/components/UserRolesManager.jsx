'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MultiSelect } from '@/components/untitled/multi-select';
import { db } from '@/firestore/firestoreClient';
import { setDoc, doc } from 'firebase/firestore';
import { fetchCacheClasses } from '@/firestore/firestoreFetch';
import useAlert from '@/hooks/useAlert';
import { AppLogout } from '@/lib/security/clientAuth';
import styles from '@/styles/userRoles.module.css';
import { Button } from '@/components/untitled/button';
import { Input } from '@/components/untitled/input';
import { UserRolesSelect } from '@/components/UserRolesSelect';
import { Toggle } from '@/components/untitled/toggle';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import { TableCard } from '@/components/untitled/table-card';
import { Badge } from '@/components/untitled/badge';
import { SearchLg, XClose, Upload01, Edit01, Trash01 } from '@untitledui/icons';
import { getRequestNotificationPreference } from '@/utils/requestNotifications';
import {
    buildTutorCoverageOptionGroups,
    flattenCoverageOptionGroups,
    hasTutorAccess,
    hydrateTutorCoverage,
    serialiseTutorCoverage,
} from '@/lib/canvas/canvasCoverage';

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
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('student'); // This maps to defaultRole in Firestore
    const [userRoles, setUserRoles] = useState([]); // Additional roles array
    const [requestNotificationsEnabled, setRequestNotificationsEnabled] = useState(null);
    const [tutorCoverage, setTutorCoverage] = useState([]);
    const [canvasCourses, setCanvasCourses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingTimesheets, setUploadingTimesheets] = useState({});
    const { addAlert } = useAlert();
    const [coveragePortal, setCoveragePortal] = useState(null);
    const [coverageMenuOpen, setCoverageMenuOpen] = useState(false);
    const [rolesMenuOpen, setRolesMenuOpen] = useState(false);
    const timesheetInputs = useRef({});

    const tutorCoverageOptionGroups = useMemo(
        () => buildTutorCoverageOptionGroups(canvasCourses),
        [canvasCourses],
    );
    const tutorCoverageOptions = useMemo(
        () => flattenCoverageOptionGroups(tutorCoverageOptionGroups),
        [tutorCoverageOptionGroups],
    );
    const userHasTutorAccess = role === 'tutor' || userRoles.includes('tutor');
    const userHasTeacherAccess = role === 'teacher' || userRoles.includes('teacher');

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        setUsersError('');
        try {
            // Served from the cached server list, which account changes refresh.
            const response = await fetch('/api/users', { cache: 'no-store' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            const sortedUsers = sortUsers(result.users);
            setUsers(sortedUsers);
            setFilteredUsers(sortedUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            setUsersError('Could not load users. Please try again.');
        } finally {
            setUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();

        // Coverage options use the same cached course list as the Classes page.
        fetchCacheClasses().then(setCanvasCourses).catch((error) => {
            console.error('Error loading Canvas coverage options:', error);
            setCanvasCourses([]);
        });
    }, [loadUsers]);

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

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!role) return;
        if (!validateEmail(email)) {
            addAlert('error', 'Please enter a valid email address.');
            return;
        }

        try {
            const coverage = userHasTutorAccess ? serialiseTutorCoverage(tutorCoverage) : [];
            const response = await fetch('/api/users', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: isEditing ? 'update' : 'create', email, name,
                    defaultRole: role, userRoles,
                    requestNotificationsEnabled: userHasTeacherAccess && (requestNotificationsEnabled ?? getRequestNotificationPreference(email)),
                    tutorCoverage: coverage }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Unable to save account.');
            if (result.warning) addAlert('warning', result.warning);
            if (result.requiresReauthentication) { await AppLogout(); return; }

            addAlert('success', `Role of ${role} assigned to ${email}`);

            handleCloseModal();

            // Show the saved account straight away instead of re-reading every user.
            const key = email.trim().toLowerCase();
            const saved = { email: email.trim(), name: name.trim(), role, defaultRole: role, userRoles: [...new Set(userRoles)],
                requestNotificationsEnabled: userHasTeacherAccess && (requestNotificationsEnabled ?? getRequestNotificationPreference(email)),
                tutorCoverage: coverage, tutorCoverageKeys: coverage.map(item => item.key) };
            setUsers(previous => {
                const existing = previous.find(user => (user.email || user.id || '').toLowerCase() === key);
                const others = previous.filter(user => user !== existing);
                return sortUsers([...others, { ...existing, ...saved, id: existing?.id || key, email: existing?.email || saved.email }]);
            });
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
        if (!window.confirm(`Delete the app account for ${userEmail}? This removes their app profile and access settings. This cannot be undone.`)) return;
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
            const result = await res.json();
            if (result.warning) addAlert('warning', result.warning);
            if (result.requiresReauthentication) { await AppLogout(); return; }
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
        setRequestNotificationsEnabled(getRequestNotificationPreference(user.email, user));
        setTutorCoverage(hydrateTutorCoverage(
            user.tutorCoverage || [],
            user.tutorCoverageKeys || [],
            tutorCoverageOptions,
        ));
        setIsEditing(true);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCoverageMenuOpen(false);
        setRolesMenuOpen(false);
        setEmail('');
        setName('');
        setRole('student');
        setUserRoles([]);
        setRequestNotificationsEnabled(null);
        setTutorCoverage([]);
        setIsEditing(false);
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
                tutorEmail: userEmail.toLowerCase(),
                tutorName: userName,
                fileData: base64Data,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: timestamp,
                uploadedBy: 'teacher',
            };

            // Use setDoc with email as document ID instead of addDoc
            await setDoc(doc(db, 'timesheets', userEmail.toLowerCase()), timesheetData);

            addAlert('success', `Timesheet uploaded successfully for ${userName} (${fileSizeKB}KB)`);
        } catch (error) {
            console.error('Error uploading timesheet:', error);
            addAlert('error', 'Error uploading timesheet. Please try again.');
        } finally {
            setUploadingTimesheets((prev) => ({ ...prev, [userEmail]: false }));
        }
    };

    return (
        <section className={styles.section} aria-label="Manage user roles">
            <p className={styles.sectionDescription}>Manage user access and tutor timesheets.</p>

            <TableCard.Root size="sm" className={styles.tableCard}>
            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Input
                        type="text"
                        size="sm"
                        icon={SearchLg}
                        aria-label="Search users"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>
                <div className={styles.toolbarActions}>
                <Button
                    href="/api/download-template"
                    download="Timesheet_Template.docx"
                    color="secondary"
                    size="sm"
                    className={styles.templateButton}
                >Timesheet template</Button>
                <Button
                    color="primary"
                    size="sm"
                    onPress={() => {
                        setShowModal(true);
                        setIsEditing(false);
                        setEmail('');
                        setName('');
                        setRole('student');
                        setUserRoles([]);
                        setRequestNotificationsEnabled(null);
                        setTutorCoverage([]);
                    }}
                >
                    Add user role
                </Button>
                </div>
            </div>

            <div className={styles.tableScroll} role="region" aria-label="Manage users table" tabIndex={0} aria-busy={usersLoading}>
                <table className={styles.usersTable} aria-label="Manage user roles">
                    <thead>
                        <tr>
                            <th scope="col">User</th>
                            <th scope="col">Roles</th>
                            <th scope="col" className={styles.actionsHeading}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usersLoading || usersError || filteredUsers.length === 0 ? (
                            <tr className={styles.stateRow}><td colSpan={3}>
                                <div className={styles.tableState} role={usersError ? 'alert' : 'status'}>
                                    {usersLoading ? 'Loading users…' : usersError || (users.length ? 'No matching users' : 'No users yet')}
                                    {!usersLoading && usersError && <Button color="secondary" size="sm" onPress={loadUsers}>Try again</Button>}
                                    {!usersLoading && !usersError && users.length > 0 && <Button color="secondary" size="sm" onPress={() => setSearchTerm('')}>Clear search</Button>}
                                </div>
                            </td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td className={styles.userCell}>
                                    <div className={styles.userName}>{user.name || user.email}</div>
                                    <div className={styles.userEmail}>{user.email}</div>
                                </td>
                                <td className={styles.rolesCell}>
                                    <span className={styles.compactLabel} aria-hidden="true">Roles</span>
                                    <div className={styles.roleBadges}>
                                        <Badge color="brand" size="sm">
                                            {(user.defaultRole || user.role).toUpperCase()}
                                        </Badge>
                                        {user.userRoles && user.userRoles.map(r => (
                                            <Badge key={r} color="gray" size="sm">
                                                {r.toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className={styles.actionsCell}>
                                    <span className={styles.compactLabel} aria-hidden="true">Actions</span>
                                    <div className={styles.rowActions}>
                                        {hasTutorAccess(user) && (
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
                                                    ref={element => { timesheetInputs.current[user.email] = element; }}
                                                    disabled={uploadingTimesheets[user.email]}
                                                />
                                                <Button
                                                    type="button"
                                                    color="tertiary"
                                                    size="xs"
                                                    iconLeading={Upload01}
                                                    className={styles.rowAction}
                                                    aria-label="Upload"
                                                    title="Upload timesheet"
                                                    isLoading={!!uploadingTimesheets[user.email]}
                                                    isDisabled={!!uploadingTimesheets[user.email]}
                                                    onPress={() => timesheetInputs.current[user.email]?.click()}
                                                />
                                            </>
                                        )}
                                        <Button
                                            onPress={() => handleEdit(user)}
                                            color="tertiary"
                                            size="xs"
                                            iconLeading={Edit01}
                                            className={styles.rowAction}
                                            aria-label="Edit user"
                                            title="Edit user"
                                        />
                                        <Button
                                            onPress={() => handleDelete(user.email)}
                                            color="tertiary-destructive"
                                            size="xs"
                                            iconLeading={Trash01}
                                            className={styles.rowAction}
                                            aria-label="Delete user"
                                            title="Delete user"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.tableSummary}>
                {!usersLoading && !usersError && `${filteredUsers.length} of ${users.length} users`}
            </div>
            </TableCard.Root>

            {showModal && (
                <ModalOverlay
                    isOpen={showModal}
                    isDismissable={false}
                    isKeyboardDismissDisabled={coverageMenuOpen || rolesMenuOpen}
                    onOpenChange={open => { if (!open) handleCloseModal(); }}
                    className={styles.userOverlay}
                >
                    <Modal className={styles.userModal}>
                        <Dialog ref={setCoveragePortal} aria-labelledby="userRoleModalLabel" className={styles.modalDialog}>
                            <div className={`modal-header border-bottom-0 ${styles.modalHeader}`}>
                                <h5 className="modal-title fw-bold" id="userRoleModalLabel">
                                    {isEditing ? 'Edit user' : 'Add new user'}
                                </h5>
                                <Button
                                    type="button"
                                    color="tertiary"
                                    size="sm"
                                    iconLeading={<XClose data-icon aria-hidden="true" />}
                                    className="ms-auto"
                                    onPress={handleCloseModal}
                                    aria-label="Close"
                                />
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                <div className="modal-body pt-4">
                                    <div className={styles.modalSection}>
                                        <div className="mb-3">
                                            <Input
                                                label="Email address"
                                                hideRequiredIndicator
                                                type="email"
                                                size="md"
                                                id="userEmail"
                                                value={email}
                                                onChange={setEmail}
                                                isRequired
                                                isDisabled={isEditing}
                                                validationBehavior="native"
                                            />
                                        </div>
                                        <div className="mb-0">
                                            <Input
                                                label="Full name"
                                                hideRequiredIndicator
                                                type="text"
                                                size="md"
                                                id="userName"
                                                value={name}
                                                onChange={setName}
                                                isRequired
                                                validationBehavior="native"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.modalSection}>
                                        <label htmlFor="userRole" className={styles.sectionLabel}>Roles</label>
                                        <UserRolesSelect
                                            role={role} userRoles={userRoles}
                                            portalContainer={coveragePortal}
                                            isOpen={rolesMenuOpen} onOpenChange={setRolesMenuOpen}
                                            onChange={({ role: nextRole, userRoles: nextUserRoles }) => {
                                                setRole(nextRole);
                                                setUserRoles(nextUserRoles);
                                                if (nextRole !== 'tutor' && !nextUserRoles.includes('tutor')) {
                                                    setTutorCoverage([]);
                                                }
                                            }}
                                        />
                                    </div>

                                    {userHasTeacherAccess && (
                                        <div className={styles.modalSection}>
                                                <Toggle
                                                    id="requestNotificationsEnabled"
                                                    className={styles.notificationToggle}
                                                    label="Tutoring request notifications"
                                                    isSelected={requestNotificationsEnabled ?? getRequestNotificationPreference(email)}
                                                    onChange={setRequestNotificationsEnabled}
                                                    aria-describedby="requestNotificationsHelp"
                                                />
                                            <div id="requestNotificationsHelp" className={styles.fieldHint}>
                                                Show new requests in this teacher’s browser tab while they’re away, including when using their admin view.
                                            </div>
                                        </div>
                                    )}
                                    {userHasTutorAccess && (
                                        <div className={styles.modalSection}>
                                            <label htmlFor="tutorCoverage" className={styles.sectionLabel}>
                                                Tutor class coverage
                                            </label>
                                            <MultiSelect
                                                id="tutorCoverage" aria-label="Tutor class coverage" placeholder="Select..."
                                                items={tutorCoverageOptions} groups={tutorCoverageOptionGroups}
                                                selectedItems={tutorCoverage} onSelectionChange={setTutorCoverage}
                                                isMulti isClearable shouldFlip={false} portalContainer={coveragePortal}
                                                isOpen={coverageMenuOpen} onOpenChange={setCoverageMenuOpen}
                                                emptyMessage={query => query ? 'No matching Canvas courses' : 'No Canvas courses synced'}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-top-0 pt-0">
                                    <Button
                                        type="button"
                                        color="secondary"
                                        size="md"
                                        onPress={handleCloseModal}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" color="primary" size="md" isDisabled={!role}>
                                        {isEditing ? 'Save changes' : 'Create user'}
                                    </Button>
                                </div>
                            </form>
                        </Dialog>
                    </Modal>
                </ModalOverlay>
            )}
        </section>
    );
};

export default UserRolesManager;
