import React from 'react';
import type { StructuralModel, AnalysisResult } from '../shared/types';
import { Badge } from '@/components/ui/badge';
import { DOF_PER_NODE } from '@/core/model/types';

interface AnalysisControlPanelProps {
  model: StructuralModel;
  analysisStatus: 'idle' | 'running' | 'done' | 'error';
  diagnostics: string[];
  solveTime: number;
  result: AnalysisResult | null;
  onRunAnalysis: () => void;
}

const AnalysisControlPanel: React.FC<AnalysisControlPanelProps> = ({
  model, analysisStatus, diagnostics, solveTime, result, onRunAnalysis
}) => {
  const nodeCount = model.nodes.length;
  const elementCount = model.elements.length;
  const frameCount = model.elements.filter(e => e.type === 'beam' || e.type === 'column').length;
  const slabCount = model.elements.filter(e => e.type === 'slab').length;
  const dofCount = nodeCount * DOF_PER_NODE;
  const supportCount = model.nodes.filter(n => n.restraints.ux || n.restraints.uy || n.restraints.uz).length;

  return (
    <div className="space-y-4 p-1">
      {/* Model Summary */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Nodes', value: nodeCount },
          { label: 'Elements', value: elementCount },
          { label: 'Frames', value: frameCount },
          { label: 'Slabs', value: slabCount },
          { label: 'DOFs', value: dofCount },
          { label: 'Supports', value: supportCount },
        ].map(item => (
          <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
            <div className="text-[10px] text-muted-foreground uppercase">{item.label}</div>
            <div className="text-lg font-semibold text-foreground font-mono">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Run button */}
      <button
        onClick={onRunAnalysis}
        disabled={analysisStatus === 'running' || nodeCount === 0}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
          analysisStatus === 'running'
            ? 'bg-muted text-muted-foreground'
            : analysisStatus === 'done'
            ? 'bg-engineering-success text-engineering-blue-foreground'
            : 'bg-engineering-blue text-engineering-blue-foreground'
        }`}
      >
        {analysisStatus === 'running' ? '⏳ Solving...'
          : analysisStatus === 'done' ? '✅ Re-Run Analysis'
          : '▶ Run Analysis'}
      </button>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Diagnostics</h4>
          {diagnostics.map((msg, i) => (
            <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${
              msg.includes('error') || msg.includes('Error')
                ? 'bg-destructive/10 text-destructive'
                : msg.includes('⚠') || msg.includes('Warning')
                ? 'bg-engineering-warning/10 text-engineering-warning'
                : 'bg-engineering-success/10 text-engineering-success'
            }`}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Results Summary */}
      {result && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Results Summary</h4>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs font-mono">
            <div>Solve time: {solveTime.toFixed(0)} ms</div>
            <div>Max |U|: {result.nodalDisplacements.reduce(
              (max, d) => Math.max(max, Math.abs(d.ux), Math.abs(d.uy), Math.abs(d.uz)), 0
            ).toFixed(4)} mm</div>
            <div>Reactions: {result.reactions.length}</div>
            <div>Frame forces: {result.elementForces.length}</div>
            {result.elementStresses.length > 0 && (
              <div className="flex items-center gap-1">
                Shell stresses: {result.elementStresses.length}
                <Badge className="bg-engineering-beta text-engineering-blue-foreground text-[8px] ml-1">BETA</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {slabCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-engineering-beta/10 border border-engineering-beta/30">
          <Badge className="bg-engineering-beta text-engineering-blue-foreground text-[10px]">BETA</Badge>
          <span className="text-[10px] text-muted-foreground">
            Slab FEM stress recovery is experimental. Frame results are production-ready.
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalysisControlPanel;
