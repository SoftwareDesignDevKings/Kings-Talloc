import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DatePicker } from '@/components/untitled/date-picker';

const changed = jest.fn();
const validity = jest.fn();
function Field() {
    const [date, setDate] = useState(new Date(2032, 4, 3));
    return <DatePicker id="test-date" label="Start date" value={date}
        onChange={next => { changed(next); setDate(next); }} onDraftValidityChange={validity} />;
}
beforeEach(() => jest.clearAllMocks());
test('typed dates commit at local midnight and keep DD/MM/YYYY formatting', () => {
    render(<Field />);
    const input = screen.getByRole('textbox', { name: 'Start date' });
    fireEvent.change(input, { target: { value: '05/05/2032' } });
    expect(validity).toHaveBeenLastCalledWith(false);
    expect(changed).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(changed).toHaveBeenCalledWith(new Date(2032, 4, 5));
    expect(input).toHaveValue('05/05/2032');
});
test.each(['30/02/2032', 'not-a-date', '10/13/2032'])('invalid draft %s cannot replace the selected date; Escape restores it', text => {
    render(<Field />);
    const input = screen.getByRole('textbox', { name: 'Start date' });
    fireEvent.change(input, { target: { value: text } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(changed).not.toHaveBeenCalled(); expect(validity).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('03/05/2032'); expect(validity).toHaveBeenLastCalledWith(true);
});
test('clearing the field clears its value, and valid blurred input commits', () => {
    render(<Field />);
    const input = screen.getByRole('textbox', { name: 'Start date' });
    fireEvent.change(input, { target: { value: '' } }); expect(changed).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: '09/05/2032' } }); fireEvent.blur(input);
    expect(changed).toHaveBeenLastCalledWith(new Date(2032, 4, 9));
});
