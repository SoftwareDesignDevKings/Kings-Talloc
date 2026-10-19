import styles from './LoadingSkeleton.module.css';

const LoadingSkeleton = ({ width = '100%', height = '1em' }) => (
    <span aria-hidden="true" className={styles.skeleton} style={{ width, height }} />
);
export default LoadingSkeleton;
