import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    
    expect(result.current).toBe('initial');
  });

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );
    
    // Initial value
    expect(result.current).toBe('initial');
    
    // Update value
    rerender({ value: 'updated', delay: 300 });
    
    // Should still be initial value (debounce in progress)
    expect(result.current).toBe('initial');
    
    // Fast forward past debounce delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should now be updated value
    expect(result.current).toBe('updated');
  });

  it('handles multiple rapid updates', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );
    
    expect(result.current).toBe('first');
    
    // Rapid updates
    rerender({ value: 'second', delay: 300 });
    rerender({ value: 'third', delay: 300 });
    rerender({ value: 'fourth', delay: 300 });
    
    // Should still be first value
    expect(result.current).toBe('first');
    
    // Fast forward
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should be the last value (fourth)
    expect(result.current).toBe('fourth');
  });

  it('resets timer on each update', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'start', delay: 300 } }
    );
    
    expect(result.current).toBe('start');
    
    // Update before timer completes
    rerender({ value: 'update1', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200); // Not enough time
    });
    
    // Should still be start
    expect(result.current).toBe('start');
    
    // Update again (resets timer)
    rerender({ value: 'update2', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200); // Still not enough from last reset
    });
    
    // Should still be start
    expect(result.current).toBe('start');
    
    // Complete the timer
    act(() => {
      vi.advanceTimersByTime(100); // Total 300 from last update
    });
    
    // Should now be update2
    expect(result.current).toBe('update2');
  });

  it('handles different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'updated', delay: 500 });
    
    // Fast forward less than delay
    act(() => {
      vi.advanceTimersByTime(400);
    });
    
    expect(result.current).toBe('initial'); // Not yet updated
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(100); // Total 500
    });
    
    expect(result.current).toBe('updated');
  });

  it('changes delay dynamically', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );
    
    expect(result.current).toBe('initial');
    
    // Change delay to longer
    rerender({ value: 'updated', delay: 500 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should not update yet (new delay is 500)
    expect(result.current).toBe('initial');
    
    act(() => {
      vi.advanceTimersByTime(200); // Total 500
    });
    
    expect(result.current).toBe('updated');
  });

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'updated', delay: 0 });
    
    // With zero delay, should update immediately
    expect(result.current).toBe('updated');
  });

  it('cleans up timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );
    
    // Trigger an update
    rerender({ value: 'updated', delay: 300 });
    
    // Unmount before timer completes
    unmount();
    
    // Should have cleaned up the timer
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('handles null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: null, delay: 300 } }
    );
    
    expect(result.current).toBeNull();
    
    rerender({ value: undefined, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBeUndefined();
    
    rerender({ value: 'defined', delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe('defined');
  });

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );
    
    expect(result.current).toBe(0);
    
    rerender({ value: 42, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe(42);
    
    rerender({ value: 3.14, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe(3.14);
  });

  it('handles boolean values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: false, delay: 300 } }
    );
    
    expect(result.current).toBe(false);
    
    rerender({ value: true, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe(true);
  });

  it('handles object values', () => {
    const initialObject = { name: 'initial', count: 0 };
    const updatedObject = { name: 'updated', count: 1 };
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialObject, delay: 300 } }
    );
    
    expect(result.current).toEqual(initialObject);
    
    rerender({ value: updatedObject, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toEqual(updatedObject);
  });

  it('handles array values', () => {
    const initialArray = [1, 2, 3];
    const updatedArray = [4, 5, 6];
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialArray, delay: 300 } }
    );
    
    expect(result.current).toEqual(initialArray);
    
    rerender({ value: updatedArray, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current).toEqual(updatedArray);
  });

  it('preserves reference equality for same values', () => {
    const sameObject = { id: 1, name: 'test' };
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: sameObject, delay: 300 } }
    );
    
    const firstResult = result.current;
    
    // Re-render with same object reference
    rerender({ value: sameObject, delay: 300 });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should be same reference
    expect(result.current).toBe(firstResult);
  });

  it('works with very short delays', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1 } }
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'updated', delay: 1 });
    
    // Should update almost immediately
    act(() => {
      vi.advanceTimersByTime(1);
    });
    
    expect(result.current).toBe('updated');
  });

  it('works with very long delays', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 10000 } } // 10 seconds
    );
    
    expect(result.current).toBe('initial');
    
    rerender({ value: 'updated', delay: 10000 });
    
    // Fast forward most of the way
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    
    expect(result.current).toBe('initial'); // Not yet
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(1000); // Total 10000
    });
    
    expect(result.current).toBe('updated');
  });

  it('handles rapid toggling between values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'A', delay: 300 } }
    );
    
    // Rapid toggling
    rerender({ value: 'B', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    
    rerender({ value: 'A', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    
    rerender({ value: 'B', delay: 300 });
    act(() => { vi.advanceTimersByTime(100); });
    
    // Should still be initial value
    expect(result.current).toBe('A');
    
    // Complete from last update
    act(() => {
      vi.advanceTimersByTime(200); // Total 300 from last update
    });
    
    expect(result.current).toBe('B');
  });

  it('is stable across re-renders with same props', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'stable', delay: 300 } }
    );
    
    const firstResult = result.current;
    
    // Re-render with same props
    rerender({ value: 'stable', delay: 300 });
    
    // Should be same value
    expect(result.current).toBe(firstResult);
  });

  it('integrates correctly with React rendering cycle', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'render1', delay: 300 } }
    );
    
    // Do multiple re-renders in sequence
    for (let i = 2; i <= 5; i++) {
      rerender({ value: `render${i}`, delay: 300 });
    }
    
    // Should still be first value
    expect(result.current).toBe('render1');
    
    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should be last value
    expect(result.current).toBe('render5');
  });
});
