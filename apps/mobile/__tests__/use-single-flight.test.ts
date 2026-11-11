import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSingleFlight } from '@/lib/use-single-flight';

describe('useSingleFlight', () => {
  it('ignores a second run while the first is in flight', async () => {
    const { result } = renderHook(() => useSingleFlight());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let runs = 0;

    let first!: Promise<string | undefined>;
    await act(async () => {
      first = result.current.run(async () => {
        runs += 1;
        await gate;
        return 'first';
      }) as Promise<string | undefined>;
    });

    await waitFor(() => expect(result.current.busy).toBe(true));

    const skipped = await act(async () =>
      result.current.run(async () => {
        runs += 1;
        return 'second';
      }),
    );
    expect(skipped).toBeUndefined();
    expect(runs).toBe(1);

    release();
    await act(async () => {
      await first;
    });

    await waitFor(() => expect(result.current.busy).toBe(false));
  });
});
