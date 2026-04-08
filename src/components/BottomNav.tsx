import { FileText, Settings2, Compass, FolderOpen, Cpu } from 'lucide-react';

export type MainTab = 'reports' | 'inputs' | 'modeling' | 'projects' | 'solver';

interface BottomNavProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

const tabs: { id: MainTab; label: string; icon: typeof FileText }[] = [
  { id: 'projects', label: 'المشاريع', icon: FolderOpen },
  { id: 'inputs', label: 'المدخلات', icon: Settings2 },
  { id: 'modeling', label: 'النمذجة', icon: Compass },
  { id: 'solver', label: 'المحلل', icon: Cpu },
  { id: 'reports', label: 'التقارير', icon: FileText },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around z-40"
      style={{ height: 'var(--mobile-nav-height)', paddingBottom: 'var(--safe-area-bottom)' }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
              isActive
                ? 'text-engineering-blue'
                : 'text-muted-foreground'
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
