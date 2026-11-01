import { describe, it, expect } from 'vitest';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

describe('react-resizable-panels exports', () => {
  it('exports Panel, PanelGroup, and PanelResizeHandle', () => {
    expect(Panel).toBeDefined();
    expect(PanelGroup).toBeDefined();
    expect(PanelResizeHandle).toBeDefined();
  });
});

