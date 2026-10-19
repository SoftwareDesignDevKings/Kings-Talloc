import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Toast from 'bootstrap/js/dist/toast';
import { AlertContextProvider } from '@/contexts/AlertContext';
import useAlert from '@/hooks/useAlert';

const Trigger = () => {
    const { addAlert } = useAlert();
    return <>{['success', 'error', 'warning', 'info'].map(type =>
        <button key={type} onClick={() => addAlert(type, `${type} message`)}>{type}</button>
    )}</>;
};
const mount = () => render(<AlertContextProvider><Trigger /></AlertContextProvider>);
const advance = ms => act(() => jest.advanceTimersByTime(ms));
const add = type => fireEvent.click(screen.getByRole('button', { name: type, exact: true }));
beforeEach(() => {
    jest.useFakeTimers();
    // Exercise the real legacy toast lifecycle during baseline; the migrated
    // implementation must pass the same public-behaviour checks without it.
    window.bootstrap = { Toast };
});
afterEach(() => { cleanup(); jest.runOnlyPendingTimers(); jest.useRealTimers(); delete window.bootstrap; });

test.each(['success', 'error', 'warning', 'info'])('%s preserves the exact message and alert semantics', type => {
    mount(); add(type); advance(200);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(`${type} message`);
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
    expect(within(alert).getByRole('button', { name: 'Close', exact: true })).toBeEnabled();
});
test('manual dismissal removes only its alert', () => {
    mount(); add('success'); add('error'); advance(200);
    fireEvent.click(within(screen.getAllByRole('alert')[1]).getByRole('button', { name: 'Close' })); advance(200);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('success message');
});
test('Escape dismisses the oldest alert first', () => {
    mount(); add('success'); add('warning'); advance(200);
    fireEvent.keyDown(window, { key: 'Escape' }); advance(200);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('warning message');
});
test('alerts expire independently and adding another does not restart the first', () => {
    mount(); add('success'); advance(3000); add('info'); advance(2500);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('info message');
    advance(3000); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('hover pauses automatic dismissal and leaving restarts its delay', () => {
    mount(); add('warning'); advance(200);
    fireEvent.mouseOver(screen.getByRole('alert')); advance(6000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.mouseOut(screen.getByRole('alert'), { relatedTarget: document.body }); advance(4000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    advance(1500); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('focus pauses automatic dismissal and leaving restarts its delay', () => {
    mount(); add('error'); advance(200);
    const close = within(screen.getByRole('alert')).getByRole('button', { name: 'Close' });
    fireEvent.focusIn(close); advance(6000);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.focusOut(close, { relatedTarget: screen.getByRole('button', { name: 'success', exact: true }) });
    advance(5500); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('unmount cancels pending work and removes the Escape listener', () => {
    const { unmount } = mount(); add('success'); advance(200); unmount();
    fireEvent.keyDown(window, { key: 'Escape' }); advance(6000);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
});
test('works without Bootstrap and unmounts safely during the entrance animation', () => {
    delete window.bootstrap;
    const { unmount } = mount(); add('info');
    expect(screen.getByRole('alert')).toHaveTextContent('info message');
    unmount(); advance(6000);
    expect(jest.getTimerCount()).toBe(0);
});
test('leaving hover does not resume dismissal while keyboard focus remains inside', () => {
    mount(); add('warning'); advance(200);
    const alert = screen.getByRole('alert');
    fireEvent.mouseOver(alert);
    fireEvent.focusIn(within(alert).getByRole('button', { name: 'Close' }));
    fireEvent.mouseOut(alert, { relatedTarget: document.body }); advance(6000);
    expect(alert).toBeInTheDocument();
    fireEvent.focusOut(alert, { relatedTarget: document.body }); advance(5500);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
