import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';
import LoadingPage from './LoadingPage';

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
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Manage User Roles</h2>
      <div className="flex mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or role"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          style={{ flex: 1 }}
        />
        <button
          onClick={() => {
            setShowModal(true);
            setIsEditing(false);
            setEmail('');
            setRole('student');
          }}
          className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          style={{ height: '2.5rem', width: 'auto' }}
        >
          Add User Role
        </button>
      </div>
      {loading ? (
        <LoadingPage withBackground={false} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="py-2 px-4 bg-gray-200 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200">
                  <td className="py-2 px-4 text-sm text-gray-900">{user.email}</td>
                  <td className="py-2 px-4 text-sm text-gray-900">
                    {user.name ? (
                      user.name
                    ) : (
                      <span className="text-red-500 italic">User hasn&apos;t logged in yet</span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-900">{user.role}</td>
                  <td className="py-2 px-4 text-sm text-gray-900">
                    <button
                      onClick={() => handleEdit(user)}
                      className="mr-2 px-2 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(user)}
                      className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
            <h2 className="text-2xl font-bold text-center">{isEditing ? 'Edit User Role' : 'Add User Role'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
      {success && <p className="text-sm text-green-600 mt-4">{success}</p>}
    </div>
  );
};

export default UserRolesManager;
