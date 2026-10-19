import LoadingSpinner from './LoadingSpinner';
import styles from './LoadingSpinner.module.css';

const LoadingPage = ({ withWhiteBackground = true }) => (
    <div className={`${styles.gate} ${withWhiteBackground ? '' : styles.transparent}`} data-startup-loading>
        <LoadingSpinner />
    </div>
);

export default LoadingPage;
