import { getInitialsFromTutor } from '@/components/calendar/CustomTimeslot.jsx';

describe('CustomTimeslot', () => {
    test('uses tutor names when available', () => {
        expect(getInitialsFromTutor('Viraj Patel', 'tutor@kings.edu.au')).toBe('VP');
    });

    test('falls back to tutor email when reference data is missing', () => {
        expect(getInitialsFromTutor('', 'tutor@kings.edu.au')).toBe('TU');
        expect(getInitialsFromTutor(undefined, 'alex.chen@kings.edu.au')).toBe('AC');
    });
});
