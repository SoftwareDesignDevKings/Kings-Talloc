import { renderHook } from '@testing-library/react';
import { useEventFormData } from '@/components/forms/useEventFormData';
const mockData = { tutors: [{ email: 'tutor@school.test', name: 'Tutor', roles: ['tutor'] }], classes: [], students: [], calendarAvailabilities: [], calendarShifts: [] };
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => mockData }));
test('teacher options show a tutor as available during Work, but busy during a student session', () => {
    const start = new Date('2027-04-06T05:00Z'), end = new Date('2027-04-06T06:00Z');
    const work = { start, end, staff: [{ value: 'tutor@school.test' }], students: [], workType: 'work', locationType: 'remote' };
    mockData.calendarShifts = [work];
    const { result, rerender } = renderHook(() => useEventFormData({ start, end, workType: 'work' }));
    expect(result.current.staffOptions[0].locationType).toBe('remote');
    mockData.calendarShifts = [work, { ...work, students: ['student@school.test'] }];
    rerender();
    expect(result.current.staffOptions[0].locationType).toBe('unavailable');
});
