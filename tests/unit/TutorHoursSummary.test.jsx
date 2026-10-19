import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TutorHoursSummary from '@/components/TutorHoursSummary';
import { getDocs } from 'firebase/firestore';

const mockAddAlert = jest.fn();
let mockAuth;
let mockShifts;
let mockUsers;
let mockCsv;

jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
jest.mock('@/firestore/firestoreOperations', () => ({}));
jest.mock('firebase/firestore', () => ({
    collection: (_db, path) => ({ path }), where: (key, op, value) => ({ key, op, value }),
    query: (ref, ...filters) => ({ ...ref, filters }), getDocs: jest.fn(),
}));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: mockAddAlert }));
jest.mock('@/hooks/useAuthSession', () => () => mockAuth);
jest.mock('react-csv', () => {
    const { forwardRef } = require('react');
    return { CSVLink: forwardRef(function Csv({ data, filename, children }, ref) {
        mockCsv = { data, filename }; return <a ref={ref} href="#csv">{children}</a>;
    }) };
});
// Isolate the report calculations and query contract. Browser checks use the actual datepicker.
jest.mock('@/components/untitled/date-picker', () => ({ DatePicker: ({ label, value, onChange }) => <input aria-label={label}
    value={value ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}` : ''}
    onChange={event => onChange(new Date(`${event.target.value}T12:00:00`))} /> }));

const staff = 'hours-check@example.edu';
const other = 'other-check@example.edu';
const asDoc = (id, data) => ({ id, data: () => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value instanceof Date ? { toDate: () => new Date(value) } : value])) });
const shift = (id, day, hours, extra = {}) => ({ id, start: new Date(`2032-05-${String(day).padStart(2,'0')}T09:00:00`), end: new Date(new Date(`2032-05-${String(day).padStart(2,'0')}T09:00:00`).getTime()+hours*3600000), recurring: null, workStatus: 'completed', workType: 'tutoring', staff: [{ value: staff, label: 'Old display name' }], emailsList: [staff], ...extra });
const snapshot = docs => ({ docs });
const row = email => screen.getByRole('row', { name: new RegExp(email) });
const selectWeek = async () => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Start Date' }), { target: { value: '2032-05-05' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'End Date' }), { target: { value: '2032-05-09' } });
    await waitFor(() => expect(mockCsv?.filename).toContain('2032'));
};

beforeEach(() => {
    jest.clearAllMocks();
    mockCsv = null;
    mockAuth = { userRole: 'admin', userRoles: ['admin'], session: { user: { email: staff } } };
    mockUsers = [asDoc(staff, { name: 'Current user name', email: staff.toUpperCase() })];
    mockShifts = [];
    getDocs.mockImplementation(async ref => {
        if (ref.path === 'users') return snapshot(mockUsers);
        const matching = mockShifts.filter(s => ref.filters.every(({ key, op, value }) => {
            if (op === '==') return s[key] === value;
            if (op === 'in') return value.includes(s[key]);
            if (op === '>=') return s[key] >= value;
            if (op === '<=') return s[key] <= value;
            if (op === 'array-contains') return s[key].includes(value);
            throw new Error(`Unexpected filter ${op}`);
        }));
        return snapshot(matching.map(s => asDoc(s.id, s)));
    });
});

test('preserves break thresholds, main completed/approved eligibility and overlapping Work, category totals, and current user names', async () => {
    mockShifts = [
        shift('three',3,3), shift('six',4,6,{workType:'coaching'}), shift('seven',5,7,{workType:'work'}),
        shift('just-over-three',6,3.25), shift('just-over-six',7,6.25),
        shift('approved',8,2,{createdByStudent:true,approvalStatus:'approved'}),
        shift('pending',8,8,{createdByStudent:true,approvalStatus:'pending'}), shift('not-complete',8,8,{workStatus:'scheduled'}),
        shift('unconfirmed',8,8,{confirmationRequired:true,tutorResponses:[{email:staff,response:false}]}),
        shift('confirmed',9,1,{confirmationRequired:true,tutorResponses:[{email:staff,response:true}]}),
        shift('string-staff',9,1,{staff:[other],emailsList:[other]}),
    ];
    render(<TutorHoursSummary />); await selectWeek();
    await waitFor(() => expect(mockCsv.data).toContainEqual(expect.objectContaining({ Email: staff, Name:'Current user name', 'Work Hours':'25', 'Coaching Hours':'5.5', 'Total Hours':'30.5' })));
    expect(within(row(staff)).getByText('30h 30m')).toBeInTheDocument();
    expect(within(row(other)).getAllByText('1h 0m')).toHaveLength(2);
    expect(mockCsv.data.find(r=>r.Email===other).Name).toBe(other);
});

test('keeps Monday alignment, inclusive end-of-day queries, weekly/fortnightly expansion, exceptions, and until boundaries', async () => {
    mockShifts = [
        shift('weekly',26,2,{start:new Date('2032-04-26T09:00:00'),end:new Date('2032-04-26T11:00:00'),recurring:'weekly',eventExceptions:[0]}),
        shift('fortnightly',19,1,{start:new Date('2032-04-19T09:00:00'),end:new Date('2032-04-19T10:00:00'),recurring:'fortnightly'}),
        shift('excluded-occurrence',26,8,{start:new Date('2032-04-26T09:00:00'),end:new Date('2032-04-26T17:00:00'),recurring:'weekly',eventExceptions:[1]}),
        shift('expired',26,8,{start:new Date('2032-04-26T09:00:00'),end:new Date('2032-04-26T17:00:00'),recurring:'weekly',until:new Date('2032-05-02T23:59:59')}),
        shift('before',2,8), shift('after',10,8),
        shift('sunday',9,2,{start:new Date('2032-05-09T23:00:00'),end:new Date('2032-05-10T01:00:00')}),
    ];
    render(<TutorHoursSummary />); await selectWeek();
    await waitFor(() => expect(mockCsv.data[0]?.['Total Hours']).toBe('4'));
    const reads = getDocs.mock.calls.map(([ref])=>ref).filter(ref=>ref.path==='shifts'&&ref.filters.some(f=>f.op==='>='));
    const last = reads.at(-1).filters;
    expect(last.find(f=>f.op==='>=').value).toEqual(new Date('2032-05-03T00:00:00'));
    expect(last.find(f=>f.op==='<=').value).toEqual(new Date('2032-05-09T23:59:59.999'));
});

test.each(['tutor','coach'])('%s sees only their own report and has no timesheet-generation actions', async role => {
    mockAuth = { ...mockAuth, userRole:role, userRoles:[] };
    mockShifts = [shift('both',3,3,{ staff:[staff,other],emailsList:[staff,other] }),shift('other',4,6,{staff:[other],emailsList:[other]})];
    render(<TutorHoursSummary />); await selectWeek();
    await waitFor(()=>expect(mockCsv.data).toHaveLength(1));
    expect(mockCsv.data[0].Email).toBe(staff);
    expect(screen.queryByRole('button',{name:/Generate.*Timesheet/})).not.toBeInTheDocument();
    const shiftQueries = getDocs.mock.calls.map(([ref])=>ref).filter(ref=>ref.path==='shifts');
    expect(shiftQueries.every(ref=>ref.filters.some(f=>f.key==='emailsList'&&f.op==='array-contains'&&f.value===staff))).toBe(true);
});

test('shows loading until data resolves and distinguishes an empty completed-hours report', async () => {
    let release;
    const implementation = getDocs.getMockImplementation();
    getDocs.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    render(<TutorHoursSummary />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading hours…');
    expect(screen.getByRole('button', { name:'Export as CSV' })).toBeDisabled();
    await act(async()=>release(snapshot([])));
    expect(screen.getByRole('status')).toHaveTextContent('No completed hours for these dates.');
    expect(screen.getByRole('button', { name:'Export as CSV' })).toBeEnabled();
    getDocs.mockImplementation(implementation);
});

test('failed Firestore reads show a retry and recover without leaving stale report data', async () => {
    getDocs.mockRejectedValueOnce(new Error('Fixture read failed'));
    render(<TutorHoursSummary />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load hours. Please try again.');
    expect(screen.getByRole('button', { name:'Export as CSV' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name:'Try again' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No completed hours for these dates.'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name:'Export as CSV' })).toBeEnabled();
});

test('an earlier date-range response cannot overwrite a newer report', async () => {
    const pending=[];
    getDocs.mockImplementation(ref => ref.path==='users' ? Promise.resolve(snapshot(mockUsers)) : new Promise(resolve=>pending.push({ref,resolve})));
    render(<TutorHoursSummary />);
    await selectWeek();
    expect(pending).toHaveLength(4);
    await act(async()=>{
        pending[2].resolve(snapshot([asDoc('new',shift('new',3,3))])); pending[3].resolve(snapshot([]));
    });
    expect(mockCsv.data[0].Email).toBe(staff);
    await act(async()=>{
        pending[0].resolve(snapshot([asDoc('old',shift('old',3,7,{staff:[other],emailsList:[other]}))])); pending[1].resolve(snapshot([]));
    });
    expect(mockCsv.data).toHaveLength(1); expect(mockCsv.data[0].Email).toBe(staff);
    expect(screen.queryByRole('row',{name:new RegExp(other)})).not.toBeInTheDocument();
});

test('a reversed date range stops reads and disables exporting the previous period', async () => {
    render(<TutorHoursSummary />); await selectWeek();
    const calls=getDocs.mock.calls.length;
    fireEvent.change(screen.getByRole('textbox',{name:'End Date'}),{target:{value:'2032-05-01'}});
    expect(screen.getByRole('alert')).toHaveTextContent('End date must be on or after the start date.');
    expect(screen.getByRole('button',{name:'Export as CSV'})).toBeDisabled();
    expect(getDocs).toHaveBeenCalledTimes(calls);
});
