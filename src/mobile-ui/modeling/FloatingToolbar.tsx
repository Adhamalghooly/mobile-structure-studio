import React, { useState } from 'react';
import type { CanvasTool } from '../shared/types';
import {
  MousePointer2, Circle, Minus, Square, PenTool,
  Trash2, Move, Ruler
} from 'lucide-react';

interface FloatingToolbarProps {
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
}

const tools: { key: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { key: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
  { key: 'node', icon: <Circle size={20} />, label: 'Node' },
  { key: 'beam', icon: <Minus size={20} />, label: 'Beam' },
  { key: 'column', icon: <Square size={20} />, label: 'Column' },
  { key: 'slab', icon: <PenTool size={20} />, label: 'Slab' },
  { key: 'delete', icon: <Trash2 size={20} />, label: 'Delete' },
  { key: 'move', icon: <Move size={20} />, label: 'Move' },
  { key: 'measure', icon: <Ruler size={20} />, label: 'Measure' },
];

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ activeTool, onToolChange }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end gap-1">
      {expanded ? (
        <div className="bg-background/95 backdrop-blur rounded-2xl shadow-lg border border-border p-1.5 flex flex-col gap-1">
          {tools.map(tool => (
            <button
              key={tool.key}
              onClick={() => { onToolChange(tool.key); setExpanded(false); }}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                activeTool === tool.key
                  ? 'bg-engineering-blue text-engineering-blue-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="w-12 h-12 rounded-full bg-engineering-blue text-engineering-blue-foreground shadow-lg flex items-center justify-center"
        >
          {tools.find(t => t.key === activeTool)?.icon}
        </button>
      )}
    </div>
  );
};

export default FloatingToolbar;
