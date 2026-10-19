import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { Modal } from 'bootstrap';
import BaseModal from '@/components/modals/BaseModal';
beforeEach(() => { jest.useFakeTimers(); window.bootstrap = { Modal }; });
afterEach(() => {
    act(() => jest.runAllTimers());
    cleanup();
    act(() => jest.runAllTimers());
    document.querySelectorAll('.modal-backdrop').forEach(element => element.remove());
    document.body.classList.remove('modal-open');
    delete window.bootstrap;
    jest.useRealTimers();
});
test('quickly cancelling during a hide animation restores the editor and still allows closing it', () => {
    const hide = jest.fn();
    const { rerender } = render(<BaseModal show onHide={hide} title="Editor" />);
    act(() => jest.runAllTimers());
    rerender(<BaseModal show={false} suppressOnHidden onHide={hide} title="Editor" />);
    rerender(<BaseModal show onHide={hide} title="Editor" />);
    act(() => jest.runAllTimers());
    expect(screen.getByRole('heading', { name: 'Editor' }).closest('.modal')).toHaveClass('show');
    expect(hide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => jest.runAllTimers());
    expect(hide).toHaveBeenCalledTimes(1);
});
test('cancelling a hide while the editor is opening does not make its next Close reopen it', () => {
    const hide = jest.fn();
    const { rerender } = render(<BaseModal show onHide={hide} title="Editor" />);
    act(() => jest.advanceTimersByTime(0));
    rerender(<BaseModal show={false} suppressOnHidden onHide={hide} title="Editor" />);
    rerender(<BaseModal show onHide={hide} title="Editor" />);
    act(() => jest.runAllTimers());
    expect(screen.getByRole('heading', { name: 'Editor' }).closest('.modal')).toHaveClass('show');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => jest.runAllTimers());
    expect(hide).toHaveBeenCalledTimes(1);
});


test('a modal opened before the async Bootstrap script loads becomes visible when it finishes', () => {
    delete window.bootstrap;
    const hide = jest.fn();
    render(<BaseModal show onHide={hide} title="Delayed editor" />);
    const modal = screen.getByText('Delayed editor').closest('.modal');
    expect(modal).not.toHaveClass('show');
    const script = document.createElement('script');
    document.body.appendChild(script);
    window.bootstrap = { Modal };
    fireEvent.load(script);
    act(() => jest.runAllTimers());
    expect(modal).toHaveClass('show');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => jest.runAllTimers());
    expect(hide).toHaveBeenCalledTimes(1);
    script.remove();
});

test('a modal closed before Bootstrap loads stays closed and an unmounted modal never initializes', () => {
    delete window.bootstrap;
    const { rerender, unmount } = render(<BaseModal show title="Delayed editor" />);
    const modal = screen.getByText('Delayed editor').closest('.modal');
    rerender(<BaseModal show={false} title="Delayed editor" />);
    const script = document.createElement('script');
    document.body.appendChild(script);
    window.bootstrap = { Modal };
    fireEvent.load(script);
    act(() => jest.runAllTimers());
    expect(modal).not.toHaveClass('show');
    unmount();
    fireEvent.load(script);
    expect(Modal.getInstance(modal)).toBeNull();
    script.remove();
});


test('StrictMode mounting leaves one working editor and no stale transition callbacks', () => {
    const hide = jest.fn();
    render(<React.StrictMode><BaseModal show onHide={hide} title="Strict editor" /></React.StrictMode>);
    act(() => jest.runAllTimers());
    expect(screen.getByRole('heading', { name: 'Strict editor' }).closest('.modal')).toHaveClass('show');
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => jest.runAllTimers());
    expect(hide).toHaveBeenCalledTimes(1);
});


test('unmounting while opening finishes cleanup without a stale Bootstrap callback', () => {
    const hide = jest.fn();
    const { unmount } = render(<BaseModal show onHide={hide} title="Leaving editor" />);
    act(() => jest.advanceTimersByTime(0));
    unmount();
    act(() => jest.runAllTimers());
    expect(document.querySelectorAll('.modal-backdrop')).toHaveLength(0);
    expect(document.body).not.toHaveClass('modal-open');
    expect(screen.queryByText('Leaving editor')).not.toBeInTheDocument();
    expect(hide).not.toHaveBeenCalled();
});
