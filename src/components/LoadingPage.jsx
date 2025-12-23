import React, { useEffect, useState } from 'react';

const LoadingPage = ({ withBackground = true }) => {
    const [dotCount, setDotCount] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setDotCount((prevCount) => {
                const newCount = prevCount >= 4 ? 1 : prevCount + 1;
                return newCount;
            });
        }, 500);

        return () => {
            clearInterval(interval);
        };
    }, []);

    const dots = '.'.repeat(dotCount);
    const backgroundClass = withBackground
        ? 'gradient-background'
        : 'bg-white';
    
    const spinnerColorClass = withBackground ? 'text-light' : 'text-tks-primary';
    const textColorClass = withBackground ? 'text-white' : 'text-secondary';

    return (
        <div className={`d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100 ${backgroundClass}`}>
            <div className="d-flex flex-column align-items-center gap-3">
                <div 
                    className={`spinner-border ${spinnerColorClass}`} 
                    style={{ width: '4rem', height: '4rem' }} 
                    role="status"
                >
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span
                    className={`fs-5 fw-medium ${textColorClass}`}
                >
                    Loading{dots}
                </span>
            </div>
        </div>
    );
};

export default LoadingPage;
