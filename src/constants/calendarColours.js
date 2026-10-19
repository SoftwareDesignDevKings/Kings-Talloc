/**
 * Shared calendar palettes used by event rendering and all colour guides.
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
export const getAvailabilityHeatColor = (count, capacity) =>
    `rgba(144, 238, 144, ${Math.min(1, Math.max(0, count / Math.max(1, capacity)))})`;

export const CALENDAR_COLOURS = {
    availabilityHeatmap: { bg: getAvailabilityHeatColor(0.55, 1), border: '#00572e' },
    availabilityBlock:   { bg: '#daf7e3',                  border: '#00572e', text: '#1a1d23', borderStyle: 'dotted' },
    confirmed:           { bg: '#cce0ff',                  border: '#0044cc', text: '#1a1d23' },
    coaching:            { bg: '#e2b4ee',                  border: '#833794', text: '#1a1d23' },
    pending:             { bg: '#f9d280',                  border: '#ac6900', text: '#1a1d23' },
    denied:              { bg: '#ffb0b0',                  border: '#ba0022', text: '#1a1d23' },
    completed:           { bg: '#7daeff',                  border: '#002bb4', text: '#1a1d23' },
    coachingCompleted:   { bg: '#bf7dcf',                  border: '#6f0f82', text: '#1a1d23' },
    notAttended:         { bg: '#eccdbf',                  border: '#8f5a41', text: '#1a1d23' },
    declined:            { bg: '#e8e9ec',                  border: '#6b7280', text: '#1a1d23' },
};

export const getCalendarPaletteStyle = ({ bg, border, text = 'black', borderStyle = 'solid' }) => {
    const patterned = borderStyle === 'dashed' || borderStyle === 'dotted';
    return {
        backgroundColor: bg, color: text,
        border: patterned ? `2px ${borderStyle} ${border}` : `1px solid ${border}33`,
        borderLeft: patterned ? `2px ${borderStyle} ${border}` : `4px solid ${border}`,
        borderRadius: '4px', boxShadow: patterned ? 'none' : 'var(--uui-shadow-xs)', fontWeight: 500,
    };
};
