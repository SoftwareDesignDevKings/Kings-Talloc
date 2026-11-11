'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/untitled/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import spinnerStyles from '@/components/LoadingSpinner.module.css';

const RETRY_SECONDS = 5;

// The middleware rewrites rate-limited page requests here. This page used to be missing, so a
// limited navigation showed a blank or "page could not be found" screen; now it retries itself.
export default function TooManyRequestsPage() {
    const [secondsLeft, setSecondsLeft] = useState(RETRY_SECONDS);

    useEffect(() => {
        if (secondsLeft <= 0) {
            window.location.reload();
            return undefined;
        }
        const timer = window.setTimeout(() => setSecondsLeft(seconds => seconds - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [secondsLeft]);

    return (
        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center gap-3 p-4" role="status">
            <LoadingSpinner className={spinnerStyles.inline} />
            <h2 className="h5 fw-bold mb-0">Talloc is busy</h2>
            <p className="text-muted mb-0">Lots of people are using it right now. Trying again in {Math.max(secondsLeft, 0)}s…</p>
            <Button size="sm" color="secondary" onClick={() => window.location.reload()}>Try now</Button>
        </div>
    );
}
