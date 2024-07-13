import React from 'react';

const ConfirmationModal = ({
  showConfirmationModal,
  setShowConfirmationModal,
  userToRemove,
  handleRemoveUser,
  isClassDeletion = false
}) => {
  return (
    showConfirmationModal && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
          <h2 className="text-2xl font-bold text-center">
            {isClassDeletion ? 'Confirm Delete Class' : 'Confirm Remove User'}
          </h2>
          <p className="text-sm text-gray-700">
            {isClassDeletion
              ? `Are you sure you want to delete the class?`
              : `Are you sure you want to remove ${userToRemove?.name || userToRemove?.email}?`}
          </p>
          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowConfirmationModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemoveUser}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {isClassDeletion ? 'Delete' : 'Remove'}
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default ConfirmationModal;
