import React from 'react';

const StudentFormModal = ({
  showStudentModal,
  setShowStudentModal,
  selectedClass,
  studentsToAdd,
  setStudentsToAdd,
  handleAddStudents,
}) => {
  return (
    showStudentModal && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
          <h2 className="text-2xl font-bold text-center">Add Students to {selectedClass.name}</h2>
          <form onSubmit={handleAddStudents} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Student Emails</label>
              <textarea
                value={studentsToAdd}
                onChange={(e) => setStudentsToAdd(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows="4"
                placeholder="Enter emails separated by commas"
                required
              />
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Students
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default StudentFormModal;
