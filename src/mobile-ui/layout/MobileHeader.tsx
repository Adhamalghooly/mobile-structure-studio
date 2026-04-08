import React from 'react';
import { Save, Play, ChevronLeft } from 'lucide-react';

interface MobileHeaderProps {
  projectName: string;
  isDirty: boolean;
  analysisStatus: 'idle' | 'running' | 'done' | 'error';
  onAnalyze: () => void;
  onBack?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  projectName, isDirty, analysisStatus, onAnalyze, onBack
}) => (
  <header
    className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur border-b border-border flex items-center px-3 gap-2 z-40"
    style={{ height: 'var(--mobile-header-height)', paddingTop: 'var(--safe-area-top)' }}
  >
    {onBack && (
      <button onClick={onBack} className="text-muted-foreground p-1">
        <ChevronLeft size={20} />
      </button>
    )}
    <div className="flex-1 min-w-0">
      <h1 className="text-sm font-semibold text-foreground truncate">{projectName}</h1>
    </div>
    {isDirty && (
      <div className="flex items-center gap-1 text-engineering-warning">
        <Save size={14} />
        <span className="text-[10px]">Unsaved</span>
      </div>
    )}
    <button
      onClick={onAnalyze}
      disabled={analysisStatus === 'running'}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        analysisStatus === 'running'
          ? 'bg-muted text-muted-foreground'
          : analysisStatus === 'done'
          ? 'bg-engineering-success text-engineering-blue-foreground'
          : 'bg-engineering-blue text-engineering-blue-foreground'
      }`}
    >
      <Play size={14} />
      {analysisStatus === 'running' ? 'Solving...' : 'Analyze'}
    </button>
  </header>
);

export default MobileHeader;
