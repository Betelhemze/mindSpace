import { useOTAUpdates } from '@/hooks/useOTAUpdates';

describe('useOTAUpdates', () => {
  it('is exported as a function', () => {
    expect(typeof useOTAUpdates).toBe('function');
  });
});
