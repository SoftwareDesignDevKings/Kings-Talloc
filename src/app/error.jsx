'use client';

import { useEffect } from 'react';
import { Button } from '@/components/untitled/button';

// Without a boundary, one record the page cannot render blanks the whole app for
// everyone who can see it. Show a way back instead.
export default function AppError({ error, reset }) {
    useEffect(() => {
        console.error('Page failed to render:', error);
    }, [error]);

    return (
        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center gap-3 p-4" role="alert">
            <h2 className="h5 fw-bold mb-0">Something went wrong</h2>
            <p className="text-muted mb-0">This page could not be shown. Try again, or reload if it keeps happening.</p>
            <div className="d-flex gap-2">
                <Button size="sm" color="primary" onClick={() => reset()}>Try again</Button>
                <Button size="sm" color="secondary" onClick={() => window.location.reload()}>Reload</Button>
            </div>
        </div>
    );
}
