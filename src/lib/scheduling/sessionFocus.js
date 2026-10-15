// Keep existing stored preference values compatible with older requests.
export const SESSION_FOCUS_OPTIONS = [
    { value: 'Homework (Prep)', label: 'Homework (Prep)' },
    { value: 'Assignments', label: 'Assignment' },
    { value: 'Exam Help', label: 'Exam preparation' },
    { value: 'General', label: 'General help' },
];
export const SESSION_TOPICS_MAX_LENGTH = 2000;
export const isValidSessionFocus = value => SESSION_FOCUS_OPTIONS.some(option => option.value === value);
export const sessionFocusLabel = value => SESSION_FOCUS_OPTIONS.find(option => option.value === value)?.label
    || (typeof value === 'string' && value.trim()) || 'Focus not provided';
