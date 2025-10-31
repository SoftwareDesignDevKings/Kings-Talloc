import { useEffect, useRef } from 'react';

/**
 * Accessible delete confirmation modal using Bootstrap classes
 */
export default function DeleteConfirmationModal({ show, onClose, onDelete, itemName }) {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (show) {
      // Focus the cancel button when modal opens
      cancelButtonRef.current?.focus();

      // Trap focus within modal
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-labelledby="deleteModalTitle"
        aria-describedby="deleteModalDescription"
        aria-modal="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="deleteModalTitle">
                Confirm Delete
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <p id="deleteModalDescription">
                Are you sure you want to delete 
                <b> {itemName}?</b>
              </p>
              <p>This action cannot be undone.</p>
            </div>

            <div className="modal-footer">
              <button
                ref={cancelButtonRef}
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
