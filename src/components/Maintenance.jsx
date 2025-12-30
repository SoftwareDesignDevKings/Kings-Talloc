'use client';

import React from 'react';
import Image from 'next/image';



export default function Maintenance() {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 gradient-background">
            <div className="w-100 p-4 bg-white rounded-3 shadow-lg" style={{ maxWidth: '28rem' }}>
                <div className="d-flex justify-content-center">
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={275}
                        height={275}
                        className="rounded"
                    />
                </div>
                <div className="text-center mt-4">
                    {/* <div className="d-flex justify-content-center mb-3">
                        <ToolsIcon />
                    </div> */}
                    <h2 className="h2 fw-bolder text-dark">
                        Under Maintenance
                    </h2>
                    <p className="mt-3 text-muted">
                        Kings Talloc is currently undergoing required maintenance.
                    </p>
                    <p className="text-muted">
                        We&apos;ll be back shortly. Thank you for your patience.
                    </p>
                </div>
                <div className="mt-4 p-3 bg-info-subtle border border-info rounded">
                    <p className="mb-0 small text-dark text-center">
                        If you have urgent matters, directly contact the Head of Computing Studies at{' '}
                        <a
                            href="mailto:mienna@kings.edu.au"
                            className="text-primary fw-semibold text-decoration-none"
                            style={{ borderBottom: '1px solid currentColor' }}
                        >
                            mienna@kings.edu.au
                        </a>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}