import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/untitled/button';

describe('Untitled button compatibility with React 18', () => {
    test('activates once per mouse, Enter, and Space interaction', async () => {
        const user = userEvent.setup();
        const onPress = jest.fn();
        render(<Button onPress={onPress} aria-expanded={false} aria-controls="roster">Expand Students</Button>);
        const button = screen.getByRole('button', { name: 'Expand Students' });
        await user.click(button);
        expect(onPress).toHaveBeenCalledTimes(1);
        await user.keyboard('{Enter}');
        expect(onPress).toHaveBeenCalledTimes(2);
        await user.keyboard(' ');
        expect(onPress).toHaveBeenCalledTimes(3);
        expect(button).toHaveAttribute('aria-expanded', 'false');
        expect(button).toHaveAttribute('aria-controls', 'roster');
    });

    test('does not submit a form unless explicitly given type submit', async () => {
        const user = userEvent.setup();
        const onSubmit = jest.fn(event => event.preventDefault());
        const { rerender } = render(<form onSubmit={onSubmit}><Button>Expand Students</Button></form>);
        await user.click(screen.getByRole('button'));
        expect(onSubmit).not.toHaveBeenCalled();
        rerender(<form onSubmit={onSubmit}><Button type="submit">Save</Button></form>);
        await user.click(screen.getByRole('button'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test.each(['isDisabled', 'isLoading'])('%s prevents activation', async (state) => {
        const user = userEvent.setup();
        const onPress = jest.fn();
        render(<Button {...{ [state]: true }} onPress={onPress}>Expand Students</Button>);
        const button = screen.getByRole('button');
        await user.click(button);
        button.focus();
        await user.keyboard('{Enter} ');
        expect(onPress).not.toHaveBeenCalled();
    });
});
