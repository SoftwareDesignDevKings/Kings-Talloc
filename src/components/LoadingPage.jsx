import Image from 'next/image';
import LoadingSpinner from './LoadingSpinner';
import styles from './LoadingSpinner.module.css';

// Startup gate while the session and Firebase sign-in resolve. The crest shows at once so the
// installed app never opens on a blank white screen; the spinner joins it if loading drags on.
const LoadingPage = ({ withWhiteBackground = true }) => (
    <div className={`${styles.gate} ${withWhiteBackground ? '' : styles.transparent}`} data-startup-loading>
        <Image src="/logo.png" alt="" width={96} height={98} priority unoptimized className={styles.crest} />
        <LoadingSpinner className={styles.gateSpinner} />
    </div>
);

export default LoadingPage;
