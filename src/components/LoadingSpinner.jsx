import styles from './LoadingSpinner.module.css';

// Delay appearance only: quick loads never flash, and readiness never waits on a timer.
const LoadingSpinner = ({ className = '', size = 'md', text = '' }) => (
    <div className={`${styles.container} ${className}`} role="status" aria-label="Loading" data-loading-indicator>
        <span className={`${styles.spinner} ${styles[size] || styles.md}`} aria-hidden="true" />
        {text && <span>{text}</span>}
    </div>
);

export default LoadingSpinner;
