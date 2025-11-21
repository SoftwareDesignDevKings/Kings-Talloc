'use client';

import React, { useEffect } from 'react';

/**
 * Clean, simple BaseModal component - uses inline styles instead of Bootstrap JS
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
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSubmit && !disabled && !loading) {
            onSubmit(e);
        }
    };

    const getSubmitButtonText = () => {
        if (loading) return 'Loading...';
        return submitText;
    };

    // Handle ESC key to close modal
    useEffect(() => {
        if (!show) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onHide();
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [show, onHide]);

    if (!show) return null;

    const sizeClass =
        size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-backdrop fade show"
                onClick={onHide}
                style={{ zIndex: 1050 }}
            ></div>

            {/* Modal */}
            <div
                className="modal fade show"
                tabIndex="-1"
                style={{ display: 'block', zIndex: 1055 }}
                onClick={onHide}
            >
                <div
                    className={`modal-dialog modal-dialog-centered ${sizeClass}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        {/* Header */}
                        <div className="modal-header">
                            {title && (
                                <h5 className="modal-title w-100 text-center fw-bold">{title}</h5>
                            )}
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onHide}
                                aria-label="Close"
                            ></button>
                        </div>

                        {/* Body */}
                        {onSubmit ? (
                            <form onSubmit={handleSubmit} id="modal-form">
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
                                                        className={`btn btn-${deleteButton.variant || 'danger'}`}
                                                        onClick={deleteButton.onClick}
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
        </>
    );
};

export default BaseModal;
