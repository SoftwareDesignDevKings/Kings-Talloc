import React from 'react';

/**
 * Reusable loading spinner component used across the dashboard
 * @param {string} className - Additional CSS classes for the container
 * @param {string} size - Spinner size: 'sm' (3rem), 'md' (4rem), 'lg' (5rem), default (4rem)
 * @param {string} text - Loading text to display below spinner
 */
const LoadingSpinner = ({ className = '', size = 'md', text = 'Loading...' }) => {
    const sizeStyles = {
        sm: { width: '3rem', height: '3rem' },
        md: { width: '4rem', height: '4rem' },
        lg: { width: '5rem', height: '5rem' },
    };

    const spinnerStyle = sizeStyles[size] || sizeStyles.md;

    return (
        <div
            className={`d-flex align-items-center justify-content-center h-100 w-100 ${className}`}
        >
            <div className="d-flex flex-column align-items-center gap-3">
                <div
                    className="spinner-border text-tks-primary"
                    style={spinnerStyle}
                    role="status"
                >
                    <span className="visually-hidden">{text}</span>
                </div>
                {text && <div className="text-secondary fs-6 fw-medium">{text}</div>}
            </div>
        </div>
    );
};

export default LoadingSpinner;
