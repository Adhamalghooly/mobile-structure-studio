import React from 'react';
import MobileBottomSheet from '../shared/MobileBottomSheet';
import type { StructuralModel, AnalysisResult, StructuralElement } from '../shared/types';
import { Badge } from '@/components/ui/badge';

interface ElementInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  elementId: number | null;
  model: StructuralModel;
  result: AnalysisResult;
}

const ElementInspector: React.FC<ElementInspectorProps> = ({
  isOpen, onClose, elementId, model, result
}) => {
  if (!elementId) return null;
  const element = model.elements.find(e => e.id === elementId);
  if (!element) return null;

  const isFrame = element.type === 'beam' || element.type === 'column';
  const isSlab = element.type === 'slab';

  const forces = result.elementForces.find(f => f.elementId === elementId);
  const stresses = result.elementStresses.find(s => s.elementId === elementId);

  return (
    <MobileBottomSheet isOpen={isOpen} onClose={onClose} title={`${element.type.toUpperCase()} ${elementId}`}>
      <div className="space-y-4">
        {isFrame && forces && (
          <>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Internal Forces</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'N (Axial)', value: forces.nodeI.N, unit: 'N' },
                { label: 'Vy (Shear)', value: forces.nodeI.Vy, unit: 'N' },
                { label: 'Vz (Shear)', value: forces.nodeI.Vz, unit: 'N' },
                { label: 'T (Torsion)', value: forces.nodeI.T, unit: 'N·mm' },
                { label: 'My', value: forces.nodeI.My, unit: 'N·mm' },
                { label: 'Mz', value: forces.nodeI.Mz, unit: 'N·mm' },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-mono font-semibold text-foreground">
                    {item.value.toFixed(1)} <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mt-2">Node J Forces</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'N', value: forces.nodeJ.N },
                { label: 'Vy', value: forces.nodeJ.Vy },
                { label: 'Mz', value: forces.nodeJ.Mz },
              ].map(item => (
                <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-mono font-semibold text-foreground">{item.value.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {isSlab && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-engineering-beta text-engineering-blue-foreground text-[10px]">BETA</Badge>
              <span className="text-xs text-muted-foreground">Slab stress preview (experimental)</span>
            </div>
            {stresses ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Mx', value: stresses.Mx },
                  { label: 'My', value: stresses.My },
                  { label: 'Qx', value: stresses.Qx },
                  { label: 'Qy', value: stresses.Qy },
                ].map(item => (
                  <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-mono font-semibold text-foreground">{item.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No stress data available for this slab element.</p>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">
              Mesh: {element.nodeIds.length} nodes
            </div>
          </>
        )}

        {!isFrame && !isSlab && (
          <p className="text-sm text-muted-foreground">No detailed results available for this element type.</p>
        )}
      </div>
    </MobileBottomSheet>
  );
};

export default ElementInspector;
