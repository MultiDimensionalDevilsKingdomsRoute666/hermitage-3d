// Disposable pipeline smoke test: proves Vitest wiring. The real test
// population arrives with the sky and grammar modules (relay round 2).
import { describe, expect, it } from 'vitest';
import { PROJECT_ID } from '../src/app/identity';

describe('scaffold', () => {
  it('carries the project identity', () => {
    expect(PROJECT_ID).toBe('zimny');
  });
});
