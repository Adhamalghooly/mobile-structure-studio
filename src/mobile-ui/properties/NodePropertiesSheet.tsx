import React from 'react';
import MobileBottomSheet from '../shared/MobileBottomSheet';
import UnitInput from '../shared/UnitInput';
import type { StructuralNode } from '../shared/types';
import { Checkbox } from '@/components/ui/checkbox';
import { FIXED_RESTRAINTS, PINNED_RESTRAINTS, FREE_RESTRAINTS } from '@/core/model/types';

interface NodePropertiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  node: StructuralNode | null;
  onUpdate: (node: StructuralNode) => void;
}

const NodePropertiesSheet: React.FC<NodePropertiesSheetProps> = ({ isOpen, onClose, node, onUpdate }) => {
  if (!node) return null;
  
  const setRestraint = (key: keyof typeof node.restraints, val: boolean) => {
    onUpdate({ ...node, restraints: { ...node.restraints, [key]: val } });
  };

  const presets = [
    { label: 'Free', restraints: FREE_RESTRAINTS },
    { label: 'Pinned', restraints: PINNED_RESTRAINTS },
    { label: 'Fixed', restraints: FIXED_RESTRAINTS },
  ];

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={`Node ${node.id}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Coordinates</h4>
          <UnitInput label="X" value={node.x} unit="mm" onChange={v => onUpdate({ ...node, x: v })} />
          <UnitInput label="Y" value={node.y} unit="mm" onChange={v => onUpdate({ ...node, y: v })} />
          <UnitInput label="Z" value={node.z} unit="mm" onChange={v => onUpdate({ ...node, z: v })} />
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Support</h4>
          <div className="flex gap-2 flex-wrap">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => onUpdate({ ...node, restraints: { ...p.restraints } })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  JSON.stringify(node.restraints) === JSON.stringify(p.restraints)
                    ? 'bg-engineering-blue text-engineering-blue-foreground border-engineering-blue'
                    : 'bg-background border-border text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['ux', 'uy', 'uz', 'rx', 'ry', 'rz'] as const).map(key => (
              <label key={key} className="flex items-center gap-1.5">
                <Checkbox
                  checked={node.restraints[key]}
                  onCheckedChange={(v) => setRestraint(key, !!v)}
                />
                <span className="text-xs font-mono">{key.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </MobileBottomSheet>
  );
};

export default NodePropertiesSheet;
