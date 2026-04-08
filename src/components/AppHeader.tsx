import { Compass, Save, Play } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export default function AppHeader({ title = 'Structural Master', leftSlot, rightSlot }: AppHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur border-b border-border flex items-center px-3 gap-2 z-40"
      style={{ height: 'var(--mobile-header-height)', paddingTop: 'var(--safe-area-top)' }}
    >
      {leftSlot || (
        <div className="w-8 h-8 rounded-lg bg-engineering-blue/10 flex items-center justify-center shrink-0">
          <Compass size={18} className="text-engineering-blue" />
        </div>
      )}
      <h1 className="flex-1 text-sm font-semibold text-foreground truncate text-center">{title}</h1>
      {rightSlot || (
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Compass size={16} className="text-muted-foreground" />
        </div>
      )}
    </header>
  );
}
