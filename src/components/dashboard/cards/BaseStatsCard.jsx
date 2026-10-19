import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useDashboardLoading } from '../DashboardLoadingContext';
import { TableCard } from '@/components/untitled/table-card';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import styles from '@/styles/dashboard.module.css';

const BaseStatsCard = ({ icon, color = 'brand', title, value, subtitle, delay = 0, isLoading: loadingOverride }) => {
    const shiftsLoading = useDashboardLoading();
    const isLoading = loadingOverride ?? shiftsLoading;
    return (
    <TableCard.Root className={styles.metricCard} aria-busy={isLoading} style={{ '--metric-delay': `${delay}ms` }}>
        <div className={styles.metricBody}>
            <FeaturedIcon icon={icon} color={color} size="md" aria-hidden="true" />
            <div className={styles.metricText}>
                <h6 className={styles.metricTitle}>{title}</h6>
                <h3 className={styles.metricValue}>{isLoading ? <LoadingSkeleton width="64px" /> : value}</h3>
                {subtitle && <small className={styles.metricSubtitle}>{isLoading ? <LoadingSkeleton width="140px" /> : subtitle}</small>}
            </div>
        </div>
    </TableCard.Root>
);
};
export default BaseStatsCard;
