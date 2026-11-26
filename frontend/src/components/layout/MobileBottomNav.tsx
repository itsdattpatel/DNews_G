/**
 * frontend/src/components/layout/MobileBottomNav.tsx
 * Bottom Navigation Thumb Bar for Mobile Portrait (PRD Master Expansion #4).
 * Provides quick one-handed access to core desks with minimum 48px touch targets,
 * newspaper typography, and tactile haptic feedback.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { BookOpen, Layers, Tv, Library, Sliders } from 'lucide-react';
import type { AppView } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  view?: AppView;
  isLibrary?: boolean;
  isSettings?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'mobile-nav-reader', label: 'Dispatches', icon: BookOpen, view: 'reader' },
  { id: 'mobile-nav-category', label: 'Sections', icon: Layers, view: 'category' },
  { id: 'mobile-nav-tv', label: 'News TV', icon: Tv, view: 'tv' },
  { id: 'mobile-nav-library', label: 'Library', icon: Library, isLibrary: true },
  { id: 'mobile-nav-settings', label: 'Settings', icon: Sliders, isSettings: true },
];

export const MobileBottomNav: React.FC = () => {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const isLibraryOpen = useAppStore((s) => s.isLibraryOpen);

  const handleTap = (item: NavItem) => {
    triggerHaptic('selection');
    if (item.isSettings) {
      setSettingsOpen(true);
    } else if (item.isLibrary) {
      useAppStore.setState({ isLibraryOpen: true });
    } else if (item.view) {
      if (isLibraryOpen) {
        useAppStore.setState({ isLibraryOpen: false });
      }
      setCurrentView(item.view);
    }
  };

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation Bar"
      className="sm:hidden shrink-0 w-full z-40 bg-paper/95 backdrop-blur-md border-t-2 border-ink px-1 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around select-none shadow-lg"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.isSettings
          ? isSettingsOpen
          : item.isLibrary
            ? isLibraryOpen
            : currentView === item.view && !isLibraryOpen && !isSettingsOpen;

        return (
          <button
            key={item.id}
            id={item.id}
            type="button"
            onClick={() => handleTap(item)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 min-h-[48px] rounded-xs transition-all cursor-pointer ${isActive
              ? 'text-paper bg-ink font-bold shadow-xs'
              : 'text-ink-secondary hover:text-ink active:scale-95'
              }`}
            title={item.label}
          >
            <Icon size={18} className="shrink-0 mb-0.5" />
            <span className="font-ui text-[9px] font-bold uppercase tracking-wider leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
