"use client";

import { useEffect, useRef } from 'react';

// deployment version guard checked - client component as app/layout.jsx is server component.
export default function VersionGuard() {
    const currentVersion = useRef(null);
    useEffect(() => {
        let intervalId;
        const checkVersion = async () => {
            try {
                const res = await fetch('/version.json', { cache: 'no-store' });
                if (!res.ok) {
                    console.warn('[VersionGuard] Failed to fetch version.json');
                    return;
                }

                const { build } = await res.json();

                // first run: capture the version this tab started on
                if (!currentVersion.current) {
                    currentVersion.current = build;
                    return;
                }

                // Subsequent runs: detect deploy
                if (currentVersion.current !== build) {
                    console.log('[VersionGuard] New version detected, reloading...');
                    window.location.reload();
                }
            } catch (error) {
                console.warn('[VersionGuard] Error checking version:', error);
            }
        }

        checkVersion();
        intervalId = setInterval(checkVersion, 300_000); // Check every 5 minutes

        return () => clearInterval(intervalId);
    }, []);

    return null;
}
