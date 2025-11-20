import React from 'react';

/**
 * Reusable loading spinner component used across the dashboard
 * @param {string} className - Additional CSS classes for the container
 * @param {string} size - Spinner size: 'sm' (12), 'md' (16), 'lg' (20), default (16)
 * @param {string} text - Loading text to display below spinner
 */
const LoadingSpinner = ({ className = '', size = 'md', text = 'Loading...' }) => {
    const sizeClasses = {
        sm: 'tw-w-12 tw-h-12',
        md: 'tw-w-16 tw-h-16',
        lg: 'tw-w-20 tw-h-20',
    };

    const spinnerSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div
            className={`tw-flex tw-items-center tw-justify-center tw-h-full tw-w-full ${className}`}
        >
            <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
                <div className={`tw-relative ${spinnerSize}`}>
                    <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-purple-200 tw-rounded-full"></div>
                    <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-transparent tw-border-t-purple-600 tw-rounded-full tw-animate-spin"></div>
                </div>
                {text && <div className="tw-text-gray-700 tw-text-base tw-font-medium">{text}</div>}
            </div>
        </div>
    );
};

export default LoadingSpinner;
