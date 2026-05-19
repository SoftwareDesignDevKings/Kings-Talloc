/**
 * Calendar colour constants — must stay in sync with calendarUI.js.
 * Used by CalendarLegend, WelcomeModal, and CalendarHowToModal.
 *
 * Design system:
 *   - Soft tinted backgrounds (50–100 range) keep the calendar calm and scannable.
 *   - Saturated left border acts as the status accent — the eye picks up status
 *     from the border colour, not from a screaming fill.
 *   - Dark text (700–900 range) on every chip for AA+ contrast.
 *   - Hue choices map to intuitive semantics: blue=confirmed, green=done,
 *     amber=waiting, red=problem, slate=neutral, violet=coaching.
 */
export const CALENDAR_COLOURS = {
    availabilityHeatmap: { bg: 'rgba(134, 239, 172, 0.45)', border: '#16a34a' },
    availabilityBlock:   { bg: '#86efac',                  border: '#14532d', text: '#0f172a', borderStyle: 'dotted' },
    confirmed:           { bg: '#dbeafe',                  border: '#2563eb', text: '#0f172a' },
    coaching:            { bg: '#e0f2fe',                  border: '#38bdf8', text: '#0f172a' },
    pending:             { bg: '#fef3c7',                  border: '#d97706', text: '#0f172a' },
    denied:              { bg: '#fee2e2',                  border: '#dc2626', text: '#0f172a' },
    completed:           { bg: '#dcfce7',                  border: '#16a34a', text: '#0f172a' },
    coachingCompleted:   { bg: '#ccfbf1',                  border: '#0d9488', text: '#0f172a' },
    notAttended:         { bg: '#fafaf9',                  border: '#57534e', text: '#0f172a' },
    declined:            { bg: '#f1f5f9',                  border: '#64748b', text: '#0f172a' },
};
