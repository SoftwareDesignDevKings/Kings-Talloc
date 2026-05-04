export const getStaleEnrollmentIdsForDeletion = ({ existingEnrollmentIds, seenEnrollmentIds, syncType }) => {
    if (syncType !== 'full') return [];
    const seen = new Set(seenEnrollmentIds);
    return existingEnrollmentIds.filter((id) => !seen.has(id));
};
