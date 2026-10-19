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
    submitVariant = 'outline-primary',
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
    const desiredShowRef = useRef(show);
    const hidingForProp = useRef(false);
    const onHideRef = useRef(onHide);
    const suppressOnHiddenRef = useRef(suppressOnHidden);

    useEffect(() => {
        desiredShowRef.current = show;
        onHideRef.current = onHide;
        suppressOnHiddenRef.current = suppressOnHidden;
    }, [onHide, suppressOnHidden, show]);

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
        if (!modalRef.current || typeof window === 'undefined') return;

        const modalElement = modalRef.current;
        let phase = 'hidden';
        const handleShowing = () => { phase = 'showing'; };
        const handleHiding = () => { phase = 'hiding'; };
        const handleHidden = () => {
            phase = 'hidden';
            isClosing.current = false;
            // Bootstrap ignores show() during its hide animation. A quick Cancel
            // in a confirmation must restore the editor once that animation ends.
            const reopen = hidingForProp.current && desiredShowRef.current;
            hidingForProp.current = false;
            if (reopen) {
                bsModalRef.current?.show();
                return;
            }
            if (!suppressOnHiddenRef.current) {
                onHideRef.current?.();
            }
        };
        const handleShown = () => {
            phase = 'shown';
            isClosing.current = false;
            // Likewise, retry a hide requested while the modal was opening.
            if (!desiredShowRef.current) {
                hidingForProp.current = true;
                bsModalRef.current?.hide();
            } else {
                hidingForProp.current = false;
            }
        };

        const initialise = () => {
            if (bsModalRef.current || !window.bootstrap) return;
            bsModalRef.current = new window.bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
            document.removeEventListener('load', initialise, true);
            // The async Bootstrap script may finish after the opening effect ran.
            if (desiredShowRef.current && !isClosing.current) bsModalRef.current.show();
        };

        modalElement.addEventListener('show.bs.modal', handleShowing);
        modalElement.addEventListener('hide.bs.modal', handleHiding);
        modalElement.addEventListener('hidden.bs.modal', handleHidden);
        modalElement.addEventListener('shown.bs.modal', handleShown);
        // Resource load events do not bubble. Capture the CDN script's load after
        // it installs window.bootstrap, then stop listening once initialized.
        document.addEventListener('load', initialise, true);
        // StrictMode replays effect setup/cleanup before this task runs. Starting
        // an animated show in the first setup leaves callbacks on a disposed modal.
        const initialiseTimer = setTimeout(initialise, 0);

        return () => {
            clearTimeout(initialiseTimer);
            document.removeEventListener('load', initialise, true);
            modalElement.removeEventListener('show.bs.modal', handleShowing);
            modalElement.removeEventListener('hide.bs.modal', handleHiding);
            modalElement.removeEventListener('hidden.bs.modal', handleHidden);
            modalElement.removeEventListener('shown.bs.modal', handleShown);
            const instance = bsModalRef.current;
            bsModalRef.current = null;
            if (!instance) return;
            const detached = !modalElement.isConnected;
            const dispose = () => {
                instance.dispose();
                // Bootstrap may append a detached element to finish showing it.
                if (detached) modalElement.remove();
            };
            const hideThenDispose = () => {
                modalElement.addEventListener('hidden.bs.modal', dispose, { once: true });
                instance.hide();
            };
            // Bootstrap's queued transition callbacks still need their instance.
            // Let an opening/hiding transition finish before releasing it.
            if (phase === 'showing') {
                modalElement.addEventListener('shown.bs.modal', hideThenDispose, { once: true });
            } else if (phase === 'shown') {
                hideThenDispose();
            } else if (phase === 'hiding') {
                modalElement.addEventListener('hidden.bs.modal', dispose, { once: true });
            } else {
                dispose();
            }
        };
    }, []);

    // Show or hide modal based on show prop
    useEffect(() => {
        if (bsModalRef.current && show && !isClosing.current) {
            bsModalRef.current.show();
        } else if (bsModalRef.current && !show) {
            if (modalRef.current?.classList.contains('show')) hidingForProp.current = true;
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
                            disabled={disabled || loading}
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
                                                className={`btn btn-${submitVariant}`}
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
