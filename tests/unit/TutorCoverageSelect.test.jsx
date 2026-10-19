import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSelect } from '@/components/untitled/multi-select';
import { buildTutorCoverageOptionGroups, flattenCoverageOptionGroups, hydrateTutorCoverage, serialiseTutorCoverage } from '@/lib/canvas/canvasCoverage';

const courses = [
    { id: 'one', blueprintCourseId: 'bp', blueprintCourseCode: 'BP_12SEN' },
    { id: 'two', blueprintCourseId: 'bp', blueprintCourseCode: 'BP_12SEN' },
    { id: 'robotics', name: 'Robotics', courseCode: 'ROBO' },
];
const archived = { key: 'course:archived', type: 'course', id: 'archived', label: 'Archived Course' };
const changed = jest.fn();
function Field({ source = courses, saved = [archived] }) {
    const groups = buildTutorCoverageOptionGroups(source);
    const items = flattenCoverageOptionGroups(groups);
    const [value, setValue] = useState(() => hydrateTutorCoverage(saved, saved.map(item => item.key), items));
    const [open, setOpen] = useState(false);
    return <MultiSelect aria-label="Tutor Class Coverage" id="coverage" placeholder="Select..." groups={groups} items={items}
        selectedItems={value} onSelectionChange={next => { setValue(next); changed(serialiseTutorCoverage(next)); }}
        isMulti isClearable isOpen={open} onOpenChange={setOpen}
        emptyMessage={query => query ? 'No matching Canvas courses' : 'No Canvas courses synced'} />;
}
const open = async user => { await user.click(screen.getByRole('button', { name: 'Tutor Class Coverage', exact: true })); return screen.getByRole('searchbox', { name: 'Search Tutor Class Coverage' }); };
beforeEach(() => jest.clearAllMocks());

test('grouped search and keyboard selection retain archived coverage and full blueprint/course objects', async () => {
    const user = userEvent.setup(); render(<Field />);
    const search = await open(user);
    expect(screen.getByText('Blueprints')).toBeInTheDocument(); expect(screen.getByText('Courses without blueprint')).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: '12SEN' })).toHaveLength(1);
    await user.type(search, '12sen'); await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(changed).toHaveBeenLastCalledWith([archived, { key: 'blueprint:bp', type: 'blueprint', id: 'bp', label: '12SEN', courseCode: 'BP_12SEN' }]));
    await open(user); await user.click(screen.getByRole('option', { name: 'Robotics (ROBO)' }));
    expect(changed).toHaveBeenLastCalledWith([archived,
        { key: 'blueprint:bp', type: 'blueprint', id: 'bp', label: '12SEN', courseCode: 'BP_12SEN' },
        { key: 'course:robotics', type: 'course', id: 'robotics', label: 'Robotics (ROBO)', courseCode: 'ROBO' }]);
});
test('keeps existing empty/search messages and Escape preserves saved selection', async () => {
    const user = userEvent.setup(); render(<Field source={[]} />);
    const search = await open(user); expect(screen.getByText('No Canvas courses synced')).toBeInTheDocument();
    await user.type(search, 'missing'); expect(screen.getByText('No matching Canvas courses')).toBeInTheDocument();
    await user.keyboard('{Escape}'); await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(screen.getByText('Archived Course')).toBeInTheDocument(); expect(changed).not.toHaveBeenCalled();
});
test('removing saved chips and clearing return exact remaining coverage arrays', async () => {
    const selected = [archived, { key: 'course:robotics', type: 'course', id: 'robotics', label: 'Robotics (ROBO)', courseCode: 'ROBO' }];
    const user = userEvent.setup(); render(<Field saved={selected} />);
    await user.click(screen.getByRole('button', { name: 'Remove Archived Course' })); expect(changed).toHaveBeenLastCalledWith([selected[1]]);
    await user.click(screen.getByRole('button', { name: 'Clear Tutor Class Coverage' })); expect(changed).toHaveBeenLastCalledWith([]);
});
