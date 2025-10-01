"use client";

import React, { useEffect } from 'react';
import { useModal } from './ModalManager';

const BaseModal = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Submit",
  submitButtonClass = "tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500",
  cancelText = "Cancel",
  showFooter = true,
  maxWidth = "tw-max-w-md",
  modalId
}) => {
  const { openModal, closeModal, getZIndex, isModalOpen } = useModal();

  useEffect(() => {
    if (isOpen && modalId) {
      openModal(modalId);
    } else if (!isOpen && modalId) {
      closeModal(modalId);
    }
  }, [isOpen, modalId, openModal, closeModal]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen(modalId)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, modalId, isModalOpen]);

  if (!isOpen) return null;

  const zIndexes = getZIndex(modalId);
  const backdropStyle = { zIndex: zIndexes.backdrop };
  const contentStyle = { zIndex: zIndexes.content };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50"
      style={backdropStyle}
      onClick={handleBackdropClick}
    >
      <div
        className={`tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full ${maxWidth} tw-p-6 tw-max-h-[90vh] tw-overflow-y-auto`}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="tw-text-2xl tw-font-bold tw-text-center tw-mb-4">{title}</h2>
        )}

        <form onSubmit={handleSubmit} className="tw-space-y-4">
          <div className="tw-space-y-4">
            {children}
          </div>

          {showFooter && (
            <div className="tw-flex tw-justify-between tw-pt-4">
              <button
                type="button"
                onClick={onClose}
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
              >
                {cancelText}
              </button>
              <button
                type="submit"
                className={submitButtonClass}
              >
                {submitText}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default BaseModal;