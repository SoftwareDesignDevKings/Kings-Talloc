'use client';

import React, { useEffect, useRef } from 'react';

/**
 * BaseModal component - uses Bootstrap 5 Modal JS API with animations
 */
const BaseModal = ({
    show = false,
    onHide,
    title,
    children,

    // Form props
    onSubmit,
    submitText = 'Submit',
    cancelText = 'Cancel',

    // Button props
    deleteButton,
    customFooter,

    // Modal props
    size = 'lg',
    loading = false,
    disabled = false,

    // Layout props
    showFooter = true,
    noValidate = false,
}) => {
    const modalRef = useRef(null);
    const bsModalRef = useRef(null);
    const isClosing = useRef(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (onSubmit && !disabled && !loading) {
            // Execute callback first
            const result = await onSubmit(e);

            // Only close if callback succeeded (returned true or nothing)
            if (result !== false) {
                isClosing.current = true;
                if (bsModalRef.current) {
                    bsModalRef.current.hide();
                }
            }
        }
    };

    const handleDeleteClick = async () => {
        if (deleteButton?.onClick) {
            // Execute callback first
            const result = await deleteButton.onClick();

            // Only close if callback succeeded (returned true or nothing)
            if (result !== false) {
                isClosing.current = true;
                if (bsModalRef.current) {
                    bsModalRef.current.hide();
                }
            }
        }
    };

    const getSubmitButtonText = () => {
        if (loading) return 'Loading...';
        return submitText;
    };

    // Initialize Bootstrap Modal and handle show/hide with animations
    useEffect(() => {
        if (!modalRef.current) return;

        // Initialize Bootstrap Modal instance if not already done
        if (!bsModalRef.current) {
            // Wait for Bootstrap to be available
            if (typeof window !== 'undefined' && window.bootstrap) {
                bsModalRef.current = new window.bootstrap.Modal(modalRef.current, {
                    backdrop: true,
                    keyboard: true,
                    focus: true
                });

                // Listen for Bootstrap modal events
                modalRef.current.addEventListener('hidden.bs.modal', () => {
                    isClosing.current = false; // Reset closing flag
                    if (onHide) onHide();
                });

                // Reset closing flag when modal successfully opens (prevents race condition)
                modalRef.current.addEventListener('shown.bs.modal', () => {
                    isClosing.current = false;
                });
            }
        }

        // Show modal with animation when show becomes true (but not if we're in the middle of closing)
        if (bsModalRef.current && show && !isClosing.current) {
            bsModalRef.current.show();
        }
    }, [show, onHide]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (bsModalRef.current) {
                bsModalRef.current.dispose();
            }
        };
    }, []);

    const sizeClass =
        size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

    return (
        <div
            ref={modalRef}
            className="modal fade"
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className={`modal-dialog modal-dialog-centered ${sizeClass}`}>
                <div className="modal-content">
                    {/* Header */}
                    <div className="modal-header">
                        {title && (
                            <h5 className="modal-title w-100 text-center fw-bold">{title}</h5>
                        )}
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>

                    {/* Body */}
                    {onSubmit ? (
                        <form onSubmit={handleSubmit} id="modal-form" noValidate={noValidate}>
                            <div className="modal-body">{children}</div>

                            {/* Footer */}
                            {showFooter && (
                                <div className="modal-footer">
                                    {customFooter ? (
                                        customFooter
                                    ) : (
                                        <div className="d-flex gap-2">
                                            {deleteButton && (
                                                <button
                                                    type="button"
                                                    className={`btn btn-outline-${deleteButton.variant || 'danger'}`}
                                                    onClick={handleDeleteClick}
                                                    disabled={disabled || loading}
                                                >
                                                    {deleteButton.text || 'Delete'}
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={disabled || loading}
                                            >
                                                {getSubmitButtonText()}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    ) : (
                        <>
                            <div className="modal-body">{children}</div>

                            {showFooter && customFooter && (
                                <div className="modal-footer">
                                    {customFooter}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BaseModal;
