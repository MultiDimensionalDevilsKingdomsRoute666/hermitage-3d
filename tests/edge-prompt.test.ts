import { describe, expect, it } from 'vitest';

import { edgePromptView } from '../src/ui/edge-prompt';

describe('§6.1 edge-prompt: visible only at an enterable settled boundary', () => {
  it('shows at a settled boundary with an airlock side', () => {
    expect(edgePromptView({ settled: true, boundary: 'forward' })).toEqual({ visible: true });
    expect(edgePromptView({ settled: true, boundary: 'backward' })).toEqual({ visible: true });
  });

  it('hides mid-room, mid-glide, in transit and at the inert far end', () => {
    expect(edgePromptView({ settled: true, boundary: null })).toEqual({ visible: false });
    expect(edgePromptView({ settled: false, boundary: 'forward' })).toEqual({ visible: false });
    // The host codes "no airlock side exists" into a null boundary, so a bare
    // settled state at the landing's dead end is also null — covered above.
  });
});
