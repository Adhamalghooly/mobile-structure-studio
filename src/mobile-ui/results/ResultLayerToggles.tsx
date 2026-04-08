import React from 'react';
import type { ResultLayer } from '../shared/types';

interface ResultLayerTogglesProps {
  activeLayers: ResultLayer[];
  onToggle: (layer: ResultLayer) => void;
  hasShellResults: boolean;
}

const LAYERS: { key: ResultLayer; label: string; color: string; beta?: boolean }[] = [
  { key: 'deformed', label: 'Deformed', color: 'bg-engineering-blue' },
  { key: 'axial', label: 'Axial N', color: 'bg-engineering-beam' },
  { key: 'shear', label: 'Shear V', color: 'bg-engineering-success' },
  { key: 'moment', label: 'Moment M', color: 'bg-destructive' },
  { key: 'reactions', label: 'Reactions', color: 'bg-engineering-beta' },
  { key: 'contour', label: 'Contour', color: 'bg-engineering-slab', beta: true },
];

const ResultLayerToggles: React.FC<ResultLayerTogglesProps> = ({ activeLayers, onToggle, hasShellResults }) => (
  <div className="fixed bottom-20 left-3 right-16 z-30 flex gap-1.5 overflow-x-auto pb-1" style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 4px)' }}>
    {LAYERS.filter(l => l.key !== 'contour' || hasShellResults).map(layer => {
      const isActive = activeLayers.includes(layer.key);
      return (
        <button
          key={layer.key}
          onClick={() => onToggle(layer.key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
            isActive
              ? `${layer.color} text-engineering-blue-foreground border-transparent`
              : 'bg-background/90 text-foreground border-border'
          }`}
        >
          {layer.label}
          {layer.beta && ' β'}
        </button>
      );
    })}
  </div>
);

export default ResultLayerToggles;
