"use client";

import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Clean, simple BaseModal component
 */
const BaseModal = ({
  show = false,
  onHide,
  title,
  children,

  // Form props
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",

  // Button props
  deleteButton,
  customFooter,

  // Modal props
  size = "lg",
  loading = false,
  disabled = false,

  // Layout props
  showFooter = true,
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
      centered={true}
      backdrop="static"
      keyboard={true}
      {...modalProps}
    >
      {/* Header */}
      <Modal.Header closeButton>
        {title && (
          <Modal.Title
            className="w-100 text-center fw-bold"
            style={{
              marginLeft: '32px',
              marginRight: '32px',
              fontSize: '1.5rem'
            }}
          >
            {title}
          </Modal.Title>
        )}
      </Modal.Header>

      {/* Body */}
      <Modal.Body>
        {onSubmit ? (
          <Form onSubmit={handleSubmit}>
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
                    variant="primary"
                    type="submit"
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