import React from 'react';
import type { MobileTab } from '../shared/types';
import { Grid3X3, Weight, Play, BarChart3, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasResults: boolean;
}

const tabs: { key: MobileTab; label: string; icon: React.ReactNode }[] = [
  { key: 'model', label: 'Model', icon: <Grid3X3 size={20} /> },
  { key: 'loads', label: 'Loads', icon: <Weight size={20} /> },
  { key: 'analyze', label: 'Analyze', icon: <Play size={20} /> },
  { key: 'results', label: 'Results', icon: <BarChart3 size={20} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, hasResults }) => (
  <nav
    className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex items-center justify-around z-40"
    style={{ height: 'var(--mobile-nav-height)', paddingBottom: 'var(--safe-area-bottom)' }}
  >
    {tabs.map(tab => {
      const isActive = activeTab === tab.key;
      const isDisabled = tab.key === 'results' && !hasResults;
      return (
        <button
          key={tab.key}
          onClick={() => !isDisabled && onTabChange(tab.key)}
          disabled={isDisabled}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
            isActive
              ? 'text-engineering-blue'
              : isDisabled
              ? 'text-muted-foreground/40'
              : 'text-muted-foreground'
          }`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      );
    })}
  </nav>
);

export default MobileBottomNav;
