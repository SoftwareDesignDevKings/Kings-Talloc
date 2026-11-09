import LoadingSpinner from './LoadingSpinner';
import styles from './LoadingSpinner.module.css';

// In-app page loading: always centred in the content area, whatever the page's own wrapper height.
// `covering` paints over the previous page while a tab tap is still loading the next one.
const PageLoading = ({ covering = false }) => (
    <div className={`${styles.page} ${covering ? styles.covering : ''}`}>
        <LoadingSpinner />
    </div>
);

export default PageLoading;
