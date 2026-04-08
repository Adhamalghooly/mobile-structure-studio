import React from 'react';
import MobileBottomSheet from '../shared/MobileBottomSheet';
import UnitInput from '../shared/UnitInput';
import type { StructuralElement, Material, Section } from '../shared/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BeamPropertiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  element: StructuralElement | null;
  materials: Material[];
  sections: Section[];
  onUpdate: (el: StructuralElement) => void;
}

const BeamPropertiesSheet: React.FC<BeamPropertiesSheetProps> = ({
  isOpen, onClose, element, materials, sections, onUpdate
}) => {
  if (!element) return null;

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={`${element.type === 'column' ? 'Column' : 'Beam'} ${element.id}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Material</h4>
          <Select value={element.materialId} onValueChange={v => onUpdate({ ...element, materialId: v })}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} (E={m.E} MPa)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Section</h4>
          <Select value={element.sectionId} onValueChange={v => onUpdate({ ...element, sectionId: v })}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.b}×{s.h})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Nodes</h4>
          <p className="text-sm text-muted-foreground font-mono">
            {element.nodeIds.join(' → ')}
          </p>
        </div>
      </div>
    </MobileBottomSheet>
  );
};

export default BeamPropertiesSheet;
