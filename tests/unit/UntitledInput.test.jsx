import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/untitled/input';

test('forwards the input ref on React 18 and associates its label and hint', async () => {
    const ref = createRef();
    const onChange = jest.fn();
    render(<Input ref={ref} label="Search" hint="Enter a class name or code" onChange={onChange} />);
    // CSS visibility of the upstream required marker is a browser concern.
    const input = screen.getByRole('textbox', { name: /^Search/ });
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleDescription('Enter a class name or code');
    await userEvent.setup().type(input, 'math');
    expect(onChange).toHaveBeenLastCalledWith('math');
});
