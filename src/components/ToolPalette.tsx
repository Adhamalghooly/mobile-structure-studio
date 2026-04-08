import React, { useState } from 'react';
import {
  Box, Columns, Minus, Circle, MousePointer, Trash2, Move, Ruler
} from 'lucide-react';

export type ToolType = 'select' | 'node' | 'beam' | 'column' | 'slab' | 'move' | 'delete';

interface ToolPaletteProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  mode: 'auto' | 'manual';
  onModeChange: (mode: 'auto' | 'manual') => void;
}

const tools: { id: ToolType; label: string; icon: any; manual?: boolean }[] = [
  { id: 'select', label: 'تحديد', icon: MousePointer },
  { id: 'slab', label: 'بلاطة', icon: Box },
  { id: 'beam', label: 'جسر', icon: Minus, manual: true },
  { id: 'column', label: 'عمود', icon: Columns, manual: true },
  { id: 'node', label: 'عقدة', icon: Circle, manual: true },
  { id: 'move', label: 'تحريك', icon: Move, manual: true },
  { id: 'delete', label: 'حذف', icon: Trash2 },
];

export default function ToolPalette({ activeTool, onToolChange, mode, onModeChange }: ToolPaletteProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Floating FAB toolbar - same pattern as new mobile UI */}
      <div className="fixed right-3 z-30 flex flex-col items-end gap-1"
        style={{ top: 'calc(var(--mobile-header-height) + var(--safe-area-top) + 60px)' }}
      >
        {expanded ? (
          <div className="bg-background/95 backdrop-blur rounded-2xl shadow-lg border border-border p-1.5 flex flex-col gap-1">
            {/* Mode toggle */}
            <button
              onClick={() => onModeChange(mode === 'auto' ? 'manual' : 'auto')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-[9px] font-bold transition-colors ${
                mode === 'auto'
                  ? 'bg-engineering-success text-engineering-blue-foreground'
                  : 'bg-engineering-warning text-engineering-blue-foreground'
              }`}
            >
              {mode === 'auto' ? 'تلق' : 'يدوي'}
            </button>
            <div className="w-8 h-px bg-border mx-auto" />
            {tools.map(tool => {
              const Icon = tool.icon;
              const disabled = tool.manual && mode === 'auto';
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (!disabled) {
                      onToolChange(tool.id);
                      setExpanded(false);
                    }
                  }}
                  disabled={disabled}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                    activeTool === tool.id
                      ? 'bg-engineering-blue text-engineering-blue-foreground'
                      : disabled
                      ? 'text-muted-foreground/30'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  title={tool.label}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className="w-12 h-12 rounded-full bg-engineering-blue text-engineering-blue-foreground shadow-lg flex items-center justify-center"
          >
            {(() => {
              const ActiveIcon = tools.find(t => t.id === activeTool)?.icon || MousePointer;
              return <ActiveIcon size={20} />;
            })()}
          </button>
        )}
      </div>
    </>
  );
}
