import React, { useRef, useEffect } from 'react';

const BaseStatsCard = ({ icon: Icon, iconBgColor, title, value, subtitle, delay = 0 }) => {
    const cardRef = useRef(null);

    useEffect(() => {
        if (cardRef.current) {
            const timer = setTimeout(() => {
                cardRef.current.classList.add('show');
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [delay]);

    return (
        <div className="col-12 col-md-4 col-lg-3">
            <div ref={cardRef} className="card border-0 shadow-sm fade">
                <div className="card-body">
                    <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                            <div className={`${iconBgColor} bg-opacity-10 rounded p-3`}>
                                <Icon className={iconBgColor.replace('bg-', 'text-')} size={24} />
                            </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                            <h6 className="text-muted mb-1 small">{title}</h6>
                            <h3 className="mb-0 fw-bold">{value}</h3>
                            {subtitle && <small className="text-muted">{subtitle}</small>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BaseStatsCard;