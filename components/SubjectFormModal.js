import React, { useState, useEffect } from 'react';

const SubjectFormModal = ({ showModal, setShowModal, subject, handleSubmit }) => {
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    if (subject) {
      setSubjectName(subject.name);
    } else {
      setSubjectName('');
    }
  }, [subject]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ name: subjectName });
    setShowModal(false);
  };

  return (
    showModal && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
          <h2 className="text-2xl font-bold text-center">{subject ? 'Edit Subject' : 'Add Subject'}</h2>
          <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
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
                {subject ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default SubjectFormModal;
