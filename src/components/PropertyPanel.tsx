import React, { useState } from 'react';
import type { StructuralNode, FrameElement, AreaElement } from '@/structural/model/types';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface PropertyPanelProps {
  selectedNode?: StructuralNode | null;
  selectedFrame?: FrameElement | null;
  selectedArea?: AreaElement | null;
  onNodeRestraintChange?: (nodeId: number, restraints: StructuralNode['restraints']) => void;
  modelStats?: { nodes: number; beams: number; columns: number; areas: number };
  onClose?: () => void;
}

export default function PropertyPanel({
  selectedNode, selectedFrame, selectedArea, onNodeRestraintChange, modelStats, onClose
}: PropertyPanelProps) {
  const [sheetHeight, setSheetHeight] = useState(0.4);
  const hasSelection = selectedNode || selectedFrame || selectedArea;

  const content = (
    <div className="space-y-4">
      {/* Model Stats */}
      {modelStats && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">إحصائيات النموذج</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'العقد', value: modelStats.nodes },
              { label: 'الجسور', value: modelStats.beams },
              { label: 'الأعمدة', value: modelStats.columns },
              { label: 'البلاطات', value: modelStats.areas },
            ].map(item => (
              <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
                <div className="text-lg font-semibold text-foreground font-mono">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Node */}
      {selectedNode && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">عقدة #{selectedNode.id}</h4>
          <div className="grid grid-cols-3 gap-2">
            {['x', 'y', 'z'].map(axis => (
              <div key={axis} className="bg-muted/50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">{axis}</div>
                <div className="text-sm font-mono font-semibold text-foreground">
                  {(selectedNode as any)[axis].toFixed(3)}
                </div>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-semibold text-muted-foreground uppercase">القيود</h4>
          {/* Presets */}
          <div className="flex gap-2">
            {[
              { label: 'حر', r: { ux: false, uy: false, uz: false, rx: false, ry: false, rz: false } },
              { label: 'مفصل', r: { ux: true, uy: true, uz: true, rx: false, ry: false, rz: false } },
              { label: 'مثبت', r: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => onNodeRestraintChange?.(selectedNode.id, p.r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  JSON.stringify(selectedNode.restraints) === JSON.stringify(p.r)
                    ? 'bg-engineering-blue text-engineering-blue-foreground border-engineering-blue'
                    : 'bg-background border-border text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['ux', 'uy', 'uz', 'rx', 'ry', 'rz'] as const).map(dof => (
              <label key={dof} className="flex items-center gap-1.5">
                <Checkbox
                  checked={selectedNode.restraints[dof]}
                  onCheckedChange={(v) => onNodeRestraintChange?.(selectedNode.id, {
                    ...selectedNode.restraints,
                    [dof]: !!v,
                  })}
                />
                <span className="text-xs font-mono">{dof.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Selected Frame */}
      {selectedFrame && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            {selectedFrame.type === 'beam' ? 'جسر' : 'عمود'} #{selectedFrame.id}
          </h4>
          <div className="space-y-1">
            {[
              { label: 'النوع', value: selectedFrame.type === 'beam' ? 'جسر' : 'عمود' },
              { label: 'عقدة I', value: `N${selectedFrame.nodeI}` },
              { label: 'عقدة J', value: `N${selectedFrame.nodeJ}` },
              { label: 'المقطع', value: `S${selectedFrame.sectionId}` },
              ...(selectedFrame.b && selectedFrame.h
                ? [{ label: 'الأبعاد', value: `${selectedFrame.b}×${selectedFrame.h} مم` }]
                : []),
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-mono font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Area */}
      {selectedArea && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">بلاطة #{selectedArea.id}</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">العقد</span>
              <span className="text-sm font-mono font-semibold text-foreground">{selectedArea.nodeIds.join(', ')}</span>
            </div>
            <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">السماكة</span>
              <span className="text-sm font-mono font-semibold text-foreground">{selectedArea.thickness} مم</span>
            </div>
          </div>
        </div>
      )}

      {/* Nothing selected */}
      {!hasSelection && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">اختر عنصراً لعرض خصائصه</p>
        </div>
      )}
    </div>
  );

  // Bottom sheet with drag handle
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      {hasSelection && (
        <div
          className="absolute inset-0 bg-foreground/20 pointer-events-auto"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden transition-all duration-300 ${
          hasSelection ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          height: `${sheetHeight * 100}vh`,
          paddingBottom: 'var(--safe-area-bottom)',
        }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex flex-col items-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex-shrink-0 px-4 py-2 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">الخصائص</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setSheetHeight(h => h > 0.5 ? 0.35 : 0.7)}
              className="p-2 text-muted-foreground"
            >
              {sheetHeight > 0.5 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 text-muted-foreground">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {content}
        </div>
      </div>
    </div>
  );
}
