'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, InfoCircle, XClose } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import styles from '@/styles/alerts.module.css';

const variants = {
    error: { color: 'error', icon: AlertCircle },
    warning: { color: 'warning', icon: AlertTriangle },
    info: { color: 'brand', icon: InfoCircle },
    success: { color: 'success', icon: CheckCircle },
};
const DISMISS_DELAY = 5000;
const EXIT_DURATION = 150;

const AlertBox = ({ message, type, onClose, dismissRequested = false }) => {
    const [isClosing, setIsClosing] = useState(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const timers = useRef({ auto: null, exit: null });
    const interaction = useRef({ hovered: false, focused: false, closing: false });
    const config = variants[type?.toLowerCase()];

    const dismiss = useCallback(() => {
        if (interaction.current.closing) return;
        interaction.current.closing = true;
        clearTimeout(timers.current.auto);
        setIsClosing(true);
        timers.current.exit = setTimeout(() => onCloseRef.current?.(), EXIT_DURATION);
    }, []);
    const restartDelay = useCallback(() => {
        clearTimeout(timers.current.auto);
        const { hovered, focused, closing } = interaction.current;
        if (!hovered && !focused && !closing) {
            timers.current.auto = setTimeout(dismiss, DISMISS_DELAY);
        }
    }, [dismiss]);

    useEffect(() => {
        if (!config) return;
        restartDelay();
        const pending = timers.current;
        return () => { clearTimeout(pending.auto); clearTimeout(pending.exit); };
    }, [config, restartDelay]);
    useEffect(() => { if (dismissRequested) dismiss(); }, [dismissRequested, dismiss]);

    if (!type) throw new Error("AlertBox: 'type' prop is required (ERROR, SUCCESS, or INFO)");
    if (!message) throw new Error("AlertBox: 'message' prop is required");
    if (!config) return null;

    return (
        <div
            className={`${styles.alert} uui:shadow-lg`}
            data-untitled-alert
            data-closing={isClosing || undefined}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            onMouseEnter={() => { interaction.current.hovered = true; restartDelay(); }}
            onMouseLeave={() => { interaction.current.hovered = false; restartDelay(); }}
            onFocus={() => { interaction.current.focused = true; restartDelay(); }}
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    interaction.current.focused = false;
                    restartDelay();
                }
            }}
        >
            <FeaturedIcon size="sm" theme="light" color={config.color} icon={config.icon} aria-hidden="true" />
            <span className={styles.message}>{message}</span>
            <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close"
                className={styles.close} onClick={dismiss} />
        </div>
    );
};

export default AlertBox;
