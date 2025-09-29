import React from 'react';
import BaseModal from './BaseModal';

const ConfirmationModal = ({
  showConfirmationModal,
  setShowConfirmationModal,
  handleConfirmAction,
  entityName,
  actionType
}) => {
  const getMessageByActionType = (actionType) => {
    const messages = {
      deleteUser: 'Are you sure you want to delete this user?',
      deleteClass: 'Are you sure you want to delete this class?',
      removeStudent: 'Are you sure you want to remove this student?',
      deleteSubject: 'Are you sure you want to delete this subject?',
      deleteEvent: 'Are you sure you want to delete this event?',
      default: 'Are you sure you want to perform this action?'
    };

    return messages[actionType] || messages.default;
  };

  return (
    <BaseModal
      isOpen={showConfirmationModal}
      onClose={() => setShowConfirmationModal(false)}
      title="Confirm Action"
      onSubmit={handleConfirmAction}
      submitText="Confirm"
      submitButtonClass="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
      modalId="confirmation"
    >
      <p className="tw-text-sm tw-text-gray-700">
        {getMessageByActionType(actionType)}
      </p>
    </BaseModal>
  );
};

export default ConfirmationModal;
