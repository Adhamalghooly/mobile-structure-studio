import React from 'react';
import MobileBottomSheet from '../shared/MobileBottomSheet';
import UnitInput from '../shared/UnitInput';
import type { StructuralElement, Material } from '../shared/types';
import type { SlabStiffnessMode } from '@/core/model/types';
import { Badge } from '@/components/ui/badge';

interface SlabPropertiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  element: StructuralElement | null;
  materials: Material[];
  onUpdate: (el: StructuralElement) => void;
}

const STIFFNESS_MODES: { key: SlabStiffnessMode; label: string; desc: string }[] = [
  { key: 'FULL', label: 'Full', desc: 'Full stiffness contribution' },
  { key: 'LOAD_ONLY', label: 'Load Only', desc: 'Load distribution only' },
  { key: 'MEMBRANE_ONLY', label: 'Membrane', desc: 'Membrane stiffness only' },
  { key: 'REDUCED', label: 'Reduced', desc: 'Custom reduction factor' },
];

const SlabPropertiesSheet: React.FC<SlabPropertiesSheetProps> = ({
  isOpen, onClose, element, materials, onUpdate
}) => {
  if (!element || element.type !== 'slab' || !element.slabProperties) return null;
  const props = element.slabProperties;

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={`Slab ${element.id}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-engineering-beta/10 border border-engineering-beta/30">
          <Badge className="bg-engineering-beta text-engineering-blue-foreground text-[10px]">BETA</Badge>
          <span className="text-xs text-muted-foreground">FEM Slab Analysis is experimental</span>
        </div>

        <UnitInput
          label="Thickness"
          value={props.thickness}
          unit="mm"
          min={50}
          max={1000}
          onChange={v => onUpdate({
            ...element,
            slabProperties: { ...props, thickness: v }
          })}
        />

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Stiffness Mode</h4>
          <div className="grid grid-cols-2 gap-2">
            {STIFFNESS_MODES.map(mode => (
              <button
                key={mode.key}
                onClick={() => onUpdate({
                  ...element,
                  slabProperties: { ...props, stiffnessMode: mode.key }
                })}
                className={`p-2 rounded-lg text-left border transition-colors ${
                  props.stiffnessMode === mode.key
                    ? 'bg-engineering-blue/10 border-engineering-blue text-engineering-blue'
                    : 'bg-background border-border text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">{mode.label}</div>
                <div className="text-[10px] text-muted-foreground">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {props.stiffnessMode === 'REDUCED' && (
          <UnitInput
            label="Factor"
            value={props.stiffnessFactor ?? 0.5}
            unit=""
            min={0}
            max={1}
            step={0.05}
            onChange={v => onUpdate({
              ...element,
              slabProperties: { ...props, stiffnessFactor: v }
            })}
          />
        )}
      </div>
    </MobileBottomSheet>
  );
};

export default SlabPropertiesSheet;
