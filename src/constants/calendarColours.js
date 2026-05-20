/**
 * Calendar colour constants — must stay in sync with calendarUI.js.
 * Used by CalendarLegend, WelcomeModal, and CalendarHowToModal.
 *
 * Design system ("Warm Saturated", Option 2 from Calendar Redesign v2):
 *   - HUE encodes TYPE      → indigo=tutoring, plum=coaching, amber=pending,
 *                             red=denied, warm-stone=not-attended, mint=availability.
 *   - SOLIDITY encodes STATUS → lighter wash for incomplete/active sessions,
 *                               richer fill of the same hue once completed,
 *                               so the eye can pair "tutoring" with "tutoring done"
 *                               at a glance.
 *   - TEXT is a single dark colour (#1a1d23) on every chip — consistent text
 *     reads cleanly across the saturated fills and avoids the black/white mix
 *     that earlier iterations had.
 *   - Saturated left border acts as the status accent; soft outer border
 *     (border colour at 20% alpha) gives the chip a subtle frame.
 *   - Availability is the calmest hue (mint) with a dotted border so it reads
 *     as a planning *layer*, not an action item.
 */
export const CALENDAR_COLOURS = {
    availabilityHeatmap: { bg: 'rgba(218, 247, 227, 0.55)', border: '#00572e' },
    availabilityBlock:   { bg: '#daf7e3',                  border: '#00572e', text: '#1a1d23', borderStyle: 'dotted' },
    confirmed:           { bg: '#a4ccff',                  border: '#0044cc', text: '#1a1d23' },
    coaching:            { bg: '#e8bbf3',                  border: '#833794', text: '#1a1d23' },
    pending:             { bg: '#f9d280',                  border: '#ac6900', text: '#1a1d23' },
    denied:              { bg: '#ffb0b0',                  border: '#ba0022', text: '#1a1d23' },
    completed:           { bg: '#7daeff',                  border: '#002bb4', text: '#1a1d23' },
    coachingCompleted:   { bg: '#d398e0',                  border: '#6f0f82', text: '#1a1d23' },
    notAttended:         { bg: '#eccdbf',                  border: '#8f5a41', text: '#1a1d23' },
    declined:            { bg: '#e8e9ec',                  border: '#6b7280', text: '#1a1d23' },
};
