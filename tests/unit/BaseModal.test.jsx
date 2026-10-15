import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { Modal } from 'bootstrap';
import BaseModal from '@/components/modals/BaseModal';
beforeEach(() => { jest.useFakeTimers(); window.bootstrap = { Modal }; });
afterEach(() => {
    act(() => jest.runAllTimers());
    cleanup();
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
    rerender(<BaseModal show={false} suppressOnHidden onHide={hide} title="Editor" />);
    rerender(<BaseModal show onHide={hide} title="Editor" />);
    act(() => jest.runAllTimers());
    expect(screen.getByRole('heading', { name: 'Editor' }).closest('.modal')).toHaveClass('show');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => jest.runAllTimers());
    expect(hide).toHaveBeenCalledTimes(1);
});
