"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@firebase/db';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import ConfirmationModal from './modals/ConfirmationModal.jsx';

const UserRolesManager = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sortedUsers = usersList.sort((a, b) => {
        const roleOrder = { teacher: 1, tutor: 2, student: 3 };
        return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
      });

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const results = users.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
  }, [searchTerm, users]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setSuccess('');
      return;
    }
    setError('');

    const userRef = doc(db, 'users', email);
    await setDoc(userRef, { email, role }, { merge: true });

    setSuccess(`Role of ${role} assigned to ${email}`);
    setEmail('');
    setRole('student');
    setShowModal(false);
    setIsEditing(false);

    const querySnapshot = await getDocs(collection(db, 'users'));
    const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const sortedUsers = usersList.sort((a, b) => {
      const roleOrder = { teacher: 1, tutor: 2, student: 3 };
      return (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4);
    });
    setUsers(sortedUsers);
    setFilteredUsers(sortedUsers);
  };

  const handleDelete = async (userEmail) => {
    await deleteDoc(doc(db, 'users', userEmail));
    const updatedUsers = users.filter(user => user.email !== userEmail);
    setUsers(updatedUsers);
    setFilteredUsers(updatedUsers);
    setSuccess(`User ${userEmail} deleted successfully.`);
    setShowConfirmationModal(false);
  };

  const handleEdit = (user) => {
    setEmail(user.email);
    setRole(user.role);
    setIsEditing(true);
    setShowModal(true);
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowConfirmationModal(true);
  };

  return (
    <div className="tw-p-8 tw-bg-white tw-rounded-lg tw-shadow-lg tw-h-full">
      <h2 className="tw-text-2xl tw-font-bold tw-mb-4 tw-text-indigo-600">Manage User Roles</h2>
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
            setRole('student');
          }}
          className="tw-ml-4 tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
          style={{ height: '2.5rem', width: 'auto' }}
        >
          Add User Role
        </button>
      </div>
      {(
        <div className="tw-overflow-x-auto" style={{ height: 'calc(100% - 5rem)', overflowY: 'auto' }}>
          <table className="tw-min-w-full tw-bg-white">
            <thead className="tw-sticky tw-top-0 tw-bg-gray-200 tw-z-10">
              <tr>
                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Email</th>
                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Name</th>
                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Role</th>
                <th className="tw-py-2 tw-px-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="tw-border-b tw-border-gray-200">
                  <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">{user.email}</td>
                  <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                    {user.name ? (
                      user.name
                    ) : (
                      <span className="tw-text-red-500 tw-italic">User hasn&apos;t logged in yet</span>
                    )}
                  </td>
                  <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">{user.role}</td>
                  <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                    <button
                      onClick={() => handleEdit(user)}
                      className="tw-mr-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(user)}
                      className="tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
          <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
            <h2 className="tw-text-2xl tw-font-bold tw-text-center">{isEditing ? 'Edit User Role' : 'Add User Role'}</h2>
            <form onSubmit={handleSubmit} className="tw-space-y-4 tw-mt-4">
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
                  required
                />
                {error && <p className="tw-text-sm tw-text-red-600 tw-mt-1">{error}</p>}
              </div>
              <div>
                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
                >
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div className="tw-flex tw-justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
                >
                  {isEditing ? 'Save Changes' : 'Add Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        showConfirmationModal={showConfirmationModal}
        setShowConfirmationModal={setShowConfirmationModal}
        entity={userToDelete}
        entityName="User"
        handleConfirmAction={() => handleDelete(userToDelete.email)}
        actionType="deleteUser"
      />
      {success && <p className="tw-text-sm tw-text-green-600 tw-mt-4">{success}</p>}
    </div>
  );
};

export default UserRolesManager;
