"use client";

import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Bootstrap-based BaseModal component that provides a consistent modal interface
 * for all modals in the application. Replaces the old custom modal system.
 */
const BaseModal = ({
  show = false,
  onHide,
  title,
  children,
  onSubmit,
  submitText = "Submit",
  submitVariant = "primary",
  cancelText = "Cancel",
  showFooter = true,
  size = "lg", // xs, sm, lg, xl
  centered = true,
  backdrop = "static",
  keyboard = true,
  showCloseButton = true,
  customFooter = null,
  headerContent = null,
  bodyClassName = "",
  modalClassName = "",
  formId = "base-modal-form",
  disabled = false,
  loading = false,
  deleteButton = null, // { text: "Delete", onClick: () => {}, variant: "danger" }
  ...modalProps
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit && !disabled && !loading) {
      onSubmit(e);
    }
  };

  const getSubmitButtonText = () => {
    if (loading) return "Loading...";
    return submitText;
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size={size}
      centered={centered}
      backdrop={backdrop}
      keyboard={keyboard}
      className={modalClassName}
      {...modalProps}
    >
      {/* Header */}
      <Modal.Header closeButton={showCloseButton}>
        {title && (
          <Modal.Title
            className="w-100 text-center fw-bold"
            style={{
              marginLeft: showCloseButton ? '32px' : '0',
              marginRight: showCloseButton ? '32px' : '0',
              fontSize: '1.5rem'
            }}
          >
            {title}
          </Modal.Title>
        )}
        {headerContent}
      </Modal.Header>

      {/* Body */}
      <Modal.Body className={bodyClassName}>
        {onSubmit ? (
          <Form id={formId} onSubmit={handleSubmit}>
            {children}
          </Form>
        ) : (
          children
        )}
      </Modal.Body>

      {/* Footer */}
      {showFooter && (
        <Modal.Footer>
          {customFooter ? (
            customFooter
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onHide}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <div className="d-flex gap-2">
                {deleteButton && (
                  <Button
                    variant={deleteButton.variant || "danger"}
                    onClick={deleteButton.onClick}
                    disabled={disabled || loading}
                  >
                    {deleteButton.text || "Delete"}
                  </Button>
                )}
                {onSubmit && (
                  <Button
                    variant={submitVariant}
                    type="submit"
                    form={formId}
                    disabled={disabled || loading}
                  >
                    {getSubmitButtonText()}
                  </Button>
                )}
              </div>
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default BaseModal;