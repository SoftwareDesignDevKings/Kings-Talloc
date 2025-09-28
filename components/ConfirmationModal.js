import React from 'react';

const ConfirmationModal = ({
  showConfirmationModal,
  setShowConfirmationModal,
  handleConfirmAction,
  entityName,
  actionType
}) => {
  let message = '';

  switch (actionType) {
    case 'deleteUser':
      message = 'Are you sure you want to delete this user?';
      break;
    case 'deleteClass':
      message = 'Are you sure you want to delete this class?';
      break;
    case 'removeStudent':
      message = 'Are you sure you want to remove this student?';
      break;
    case 'deleteSubject':
      message = 'Are you sure you want to delete this subject?';
      break;
    case 'deleteEvent':
      message = 'Are you sure you want to delete this event?';
      break;
    default:
      message = 'Are you sure you want to perform this action?';
  }

  return (
    showConfirmationModal && (
      <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
        <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
          <h2 className="tw-text-2xl tw-font-bold tw-text-center">Confirm Action</h2>
          <p className="tw-text-sm tw-text-gray-700 tw-mt-4">{message}</p>
          <div className="tw-flex tw-justify-between tw-mt-4">
            <button
              type="button"
              onClick={() => setShowConfirmationModal(false)}
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default ConfirmationModal;
