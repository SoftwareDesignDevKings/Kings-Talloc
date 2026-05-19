import {
    buildTutorCoverageOptionGroups,
    getCanvasCoverageKey,
} from '@/lib/canvas/canvasCoverage';

describe('canvasCoverage', () => {
    test('uses blueprint coverage when a course has blueprint metadata', () => {
        expect(getCanvasCoverageKey({
            id: '12SENX1',
            blueprintCourseId: 'SENX',
        })).toBe('blueprint:SENX');
    });

    test('falls back to course coverage when no blueprint is present', () => {
        expect(getCanvasCoverageKey({ id: '12SENX3' })).toBe('course:12SENX3');
    });

    test('groups blueprint courses once and leaves non-blueprint courses as individual options', () => {
        const groups = buildTutorCoverageOptionGroups([
            {
                id: '101',
                name: '12SENX1',
                courseCode: '12SENX1',
                blueprintCourseId: '900',
                blueprintCourseName: 'Software Engineering',
                blueprintCourseCode: 'SENX',
            },
            {
                id: '102',
                name: '12SENX2',
                courseCode: '12SENX2',
                blueprintCourseId: '900',
                blueprintCourseName: 'Software Engineering',
                blueprintCourseCode: 'SENX',
            },
            {
                id: '201',
                name: 'Robotics',
                courseCode: 'ROBO',
            },
        ]);

        expect(groups).toEqual([
            {
                label: 'Blueprints',
                options: [expect.objectContaining({
                    key: 'blueprint:900',
                    label: 'Software Engineering (SENX)',
                })],
            },
            {
                label: 'Courses without blueprint',
                options: [expect.objectContaining({
                    key: 'course:201',
                    label: 'Robotics (ROBO)',
                })],
            },
        ]);
    });
});
