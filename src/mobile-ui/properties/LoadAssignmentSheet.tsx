import React from 'react';
import MobileBottomSheet from '../shared/MobileBottomSheet';
import UnitInput from '../shared/UnitInput';
import type { StructuralNode, LoadCase } from '../shared/types';
import type { NodalLoad } from '@/core/model/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LoadAssignmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  node: StructuralNode | null;
  loadCases: LoadCase[];
  onUpdate: (node: StructuralNode) => void;
}

const LoadAssignmentSheet: React.FC<LoadAssignmentSheetProps> = ({
  isOpen, onClose, node, loadCases, onUpdate
}) => {
  if (!node) return null;

  const addLoad = () => {
    const newLoad: NodalLoad = {
      fx: 0, fy: 0, fz: -10000,
      mx: 0, my: 0, mz: 0,
      loadCaseId: loadCases[0]?.id || 'DL',
    };
    onUpdate({ ...node, nodalLoads: [...node.nodalLoads, newLoad] });
  };

  const updateLoad = (idx: number, partial: Partial<NodalLoad>) => {
    const loads = [...node.nodalLoads];
    loads[idx] = { ...loads[idx], ...partial };
    onUpdate({ ...node, nodalLoads: loads });
  };

  const removeLoad = (idx: number) => {
    onUpdate({ ...node, nodalLoads: node.nodalLoads.filter((_, i) => i !== idx) });
  };

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={`Loads on Node ${node.id}`}>
      <div className="space-y-3">
        {node.nodalLoads.map((load, idx) => (
          <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Select value={load.loadCaseId} onValueChange={v => updateLoad(idx, { loadCaseId: v })}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {loadCases.map(lc => <SelectItem key={lc.id} value={lc.id}>{lc.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => removeLoad(idx)} className="text-destructive text-xs">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <UnitInput label="Fx" value={load.fx} unit="N" onChange={v => updateLoad(idx, { fx: v })} />
              <UnitInput label="Fy" value={load.fy} unit="N" onChange={v => updateLoad(idx, { fy: v })} />
              <UnitInput label="Fz" value={load.fz} unit="N" onChange={v => updateLoad(idx, { fz: v })} />
              <UnitInput label="Mx" value={load.mx} unit="N·mm" onChange={v => updateLoad(idx, { mx: v })} />
            </div>
          </div>
        ))}
        <button
          onClick={addLoad}
          className="w-full py-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground"
        >
          + Add Load
        </button>
      </div>
    </MobileBottomSheet>
  );
};

export default LoadAssignmentSheet;
