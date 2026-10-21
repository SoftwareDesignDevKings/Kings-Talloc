import React, { useState } from 'react';
import { useDashboardRequestsLoading } from '../DashboardLoadingContext';
import { Clock, ChevronDown } from '@untitledui/icons';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';
import { useRequestNotifications } from '@/contexts/RequestNotificationsContext';
import { Button } from '@/components/untitled/button';
import { TableCard } from '@/components/untitled/table-card';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import { Dialog, DialogTrigger } from '@/components/untitled/modal';
import { Popover } from '@/components/untitled/popover';
import styles from '@/styles/dashboard.module.css';
import PendingApprovalItem from './PendingApprovalItem';

const PendingApprovalsCard = ({ count, pendingRequests, onUpdate, readOnly = false }) => {
    const dataLoading = useDashboardRequestsLoading();
    const [isOpen, setIsOpen] = useState(false);
    const notifications = useRequestNotifications();
    const useGlobalRequests = notifications.available && (!readOnly || notifications.enabled);
    const displayedRequests = useGlobalRequests ? notifications.pendingRequests : pendingRequests;
    const isLoading = useGlobalRequests ? !notifications.hasData : dataLoading;
    const displayedCount = useGlobalRequests ? (notifications.hasData ? notifications.count : '…') : (dataLoading ? '…' : (count || 0));
    const { handleApprove, handleReject, handleDelete, processingIds } = useApprovalHandlers(onUpdate);
    return (
        <div id={useGlobalRequests ? 'pending-approvals' : undefined}>
            <TableCard.Root className={styles.metricCard} style={{ '--metric-delay': '150ms' }}>
                <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
                    <Button color="tertiary" size="sm" isDisabled={!useGlobalRequests && isLoading} aria-busy={isLoading} className={styles.pendingTrigger} aria-label={`Pending approvals ${displayedCount}`}>
                        <span className={styles.metricBody}>
                            <FeaturedIcon icon={Clock} color="warning" size="md" aria-hidden="true" />
                            <span className={styles.metricText}>
                                <span role="heading" aria-level={6} className={styles.metricTitle}>Pending approvals</span>
                                <span role="heading" aria-level={3} className={styles.metricValue}>{displayedCount}</span>
                            </span>
                            <ChevronDown aria-hidden="true" className={styles.pendingChevron} />
                        </span>
                    </Button>
                    <Popover data-untitled-select-popover={undefined} className={styles.pendingPopover} placement="bottom start" containerPadding={16} offset={8}>
                        <Dialog aria-label="Pending approvals" className={styles.pendingDialog}>
                            {useGlobalRequests && !notifications.ready && (
                                <div className={styles.requestState} role="status">{notifications.error || 'Loading requests…'}</div>
                            )}
                            {(!displayedRequests || displayedRequests.length === 0) && !(useGlobalRequests && !notifications.ready) ? (
                                <div className={styles.requestState}>No pending approvals</div>
                            ) : (
                                <ul className={styles.requestList}>
                                    {displayedRequests?.map(request => (
                                        <PendingApprovalItem key={request.id} request={request}
                                            onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} readOnly={readOnly}
                                            disabled={(useGlobalRequests && !notifications.ready) || processingIds.has(request.id)} />
                                    ))}
                                </ul>
                            )}
                        </Dialog>
                    </Popover>
                </DialogTrigger>
            </TableCard.Root>
            {useGlobalRequests && notifications.error && (
                <div className={styles.requestError} role="status">
                    {notifications.error}{' '}
                    <Button color="link-gray" size="sm" onClick={notifications.retry}>Retry</Button>
                </div>
            )}
        </div>
    );
};
export default PendingApprovalsCard;
