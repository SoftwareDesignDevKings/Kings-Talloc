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
    suppressOnHidden = false,
}) => {
    const modalRef = useRef(null);
    const bsModalRef = useRef(null);
    const isClosing = useRef(false);
    const onHideRef = useRef(onHide);
    const suppressOnHiddenRef = useRef(suppressOnHidden);

    useEffect(() => {
        onHideRef.current = onHide;
        suppressOnHiddenRef.current = suppressOnHidden;
    }, [onHide, suppressOnHidden]);

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

    // Initialize Bootstrap Modal once and keep event handlers pointed at current props.
    useEffect(() => {
        if (!modalRef.current || typeof window === 'undefined' || !window.bootstrap) return;

        const modalElement = modalRef.current;
        const handleHidden = () => {
            isClosing.current = false;
            if (!suppressOnHiddenRef.current) {
                onHideRef.current?.();
            }
        };
        const handleShown = () => {
            isClosing.current = false;
        };

        bsModalRef.current = new window.bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });

        modalElement.addEventListener('hidden.bs.modal', handleHidden);
        modalElement.addEventListener('shown.bs.modal', handleShown);

        return () => {
            modalElement.removeEventListener('hidden.bs.modal', handleHidden);
            modalElement.removeEventListener('shown.bs.modal', handleShown);
            if (bsModalRef.current) {
                bsModalRef.current.dispose();
                bsModalRef.current = null;
            }
        };
    }, []);

    // Show or hide modal based on show prop
    useEffect(() => {
        if (bsModalRef.current && show && !isClosing.current) {
            bsModalRef.current.show();
        } else if (bsModalRef.current && !show) {
            bsModalRef.current.hide();
        }
    }, [show]);

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
                                                className="btn btn-outline-primary"
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
