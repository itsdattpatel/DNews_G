import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useAppStore } from '../../store/useAppStore';
import { RightIconRail } from '../../components/layout/RightIconRail';
import { LibraryHeader } from '../../library/components/LibraryHeader';

describe('The Library Navigation & State Management', () => {
  beforeEach(() => {
    useAppStore.setState({
      isLibraryOpen: false,
      currentView: 'reader',
    });
    vi.clearAllMocks();
  });

  it('updates store state when openLibrary() and closeLibrary() are invoked', () => {
    expect(useAppStore.getState().isLibraryOpen).toBe(false);

    useAppStore.getState().openLibrary();
    expect(useAppStore.getState().isLibraryOpen).toBe(true);

    useAppStore.getState().closeLibrary();
    expect(useAppStore.getState().isLibraryOpen).toBe(false);
  });

  it('renders RightIconRail with The Library button present', () => {
    const html = renderToStaticMarkup(<RightIconRail />);
    expect(html).toContain('btn-rail-library');
    expect(html).toContain('The Library');
  });

  it('renders LibraryHeader with return to desk button', () => {
    const html = renderToStaticMarkup(<LibraryHeader />);
    expect(html).toContain('btn-library-return-desk');
    expect(html).toContain('News Desk');
    expect(html).toContain('THE READING ROOM');
  });

  it('properly toggles isLibraryOpen state when user opens and closes library', () => {
    useAppStore.getState().openLibrary();
    expect(useAppStore.getState().isLibraryOpen).toBe(true);

    useAppStore.getState().closeLibrary();
    expect(useAppStore.getState().isLibraryOpen).toBe(false);
  });
});
