import { formatDisplayDateTime } from '@/utils/displayDate';
const revive = event => ({ ...event, ...(event?.start && { start: new Date(event.start) }), ...(event?.end && { end: new Date(event.end) }) });

export const schedulingMutation = async (input) => {
    const payload = { operationId: crypto.randomUUID(), ...input };
    const send = async () => {
        const response = await fetch('/api/scheduling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok) {
            if (result.canSkip && !payload.allowSkipConflicts && window.confirm(`These dates conflict:\n${result.conflictingDates.map(date => formatDisplayDateTime(date)).join('\n')}\n\nCreate only the dates without a clash?`)) {
                payload.allowSkipConflicts = true;
                return send();
            }
            throw new Error(result.message || 'Could not save this change. Refresh and retry.');
        }
        window.dispatchEvent(new Event('talloc:schedule-changed'));
        return { ...result, eventData: result.eventData ? revive(result.eventData) : undefined };
    };
    // Reuse the operation ID if the response was lost after a successful commit.
    try { return await send(); } catch (error) {
        if (error instanceof TypeError && navigator.onLine) return send();
        throw error;
    }
};
