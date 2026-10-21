import { renderHook, waitFor, act } from '@testing-library/react';
import useBookableAvailability from '@/hooks/useBookableAvailability';
const range = { start: new Date('2027-04-06T05:00Z'), end: new Date('2027-04-06T08:00Z') };
let visible;
beforeEach(() => {
    visible = true;
    jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ slots: [] }) });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); delete global.fetch; });
test('hidden tabs do not poll; returning loads current availability', async () => {
    visible = false;
    const { result } = renderHook(() => useBookableAvailability('student@school.test', true, range));
    expect(fetch).not.toHaveBeenCalled();
    visible = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
});
test('simultaneous focus and visibility events do not stack identical in-flight reads', async () => {
    let resolve;
    fetch.mockReturnValue(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useBookableAvailability('student@school.test', true, range));
    act(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, json: async () => ({ slots: [] }) }));
    await waitFor(() => expect(result.current.ready).toBe(true));
});
test('rate-limit errors retain the last known slots and disable booking until a refresh succeeds', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: range.start.toISOString(), end: range.end.toISOString(), tutor: 'tutor@school.test' }] }) });
    const { result } = renderHook(() => useBookableAvailability('student@school.test', true, range));
    await waitFor(() => expect(result.current.ready).toBe(true));
    fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Please wait and retry.' }) });
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.ready).toBe(false); expect(result.current.slots).toHaveLength(1);
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.error).toBeNull();
});


test('a schedule change during a read queues one fresh result after that read finishes', async () => {
    let resolve;
    fetch.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useBookableAvailability('student@school.test', true, range));
    act(() => { window.dispatchEvent(new Event('talloc:schedule-changed')); window.dispatchEvent(new Event('talloc:schedule-changed')); });
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, json: async () => ({ slots: [{ start: range.start, end: range.end }] }) }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.slots).toEqual([]));
});
test('a stalled fetch times out so later refreshes can recover', async () => {
    jest.useFakeTimers();
    fetch.mockImplementationOnce((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Timed out')))));
    const { result } = renderHook(() => useBookableAvailability('student@school.test', true, range));
    await act(async () => jest.advanceTimersByTimeAsync(20000));
    expect(result.current.ready).toBe(false); expect(result.current.error).toBeTruthy();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(result.current.ready).toBe(true);
});
test('callers can poll less often', async () => {
    jest.useFakeTimers();
    renderHook(() => useBookableAvailability('student@school.test', true, range, { pollMs: 60000 }));
    await act(async () => jest.advanceTimersByTimeAsync(30000));
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTimeAsync(30000));
    expect(fetch).toHaveBeenCalledTimes(2);
});
