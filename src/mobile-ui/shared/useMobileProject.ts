/**
 * Mobile project state hook - manages the StructuralModel and analysis results
 */
import { useState, useCallback, useRef } from 'react';
import type { ProjectState, CanvasInteraction, CanvasTool } from './types';
import type { StructuralModel, StructuralNode, StructuralElement, Material, Section, LoadCase, LoadCombination } from '@/core/model/types';
import type { AnalysisResult } from '@/core/postprocess/resultProcessor';
import { FREE_RESTRAINTS } from '@/core/model/types';
import { runAnalysis, type AnalysisConfig } from '@/core/coreAnalysisController';

const DEFAULT_MATERIAL: Material = {
  id: 'mat-concrete-25',
  name: 'C25/30',
  E: 30000,
  nu: 0.2,
  gamma: 0.000025,
  fc: 25,
};

const DEFAULT_SECTION: Section = {
  id: 'sec-rect-300x500',
  name: '300×500',
  type: 'rectangular',
  b: 300,
  h: 500,
};

const DEFAULT_COLUMN_SECTION: Section = {
  id: 'sec-col-300x300',
  name: '300×300 Col',
  type: 'rectangular',
  b: 300,
  h: 300,
};

function createEmptyModel(): StructuralModel {
  return {
    nodes: [],
    elements: [],
    materials: [DEFAULT_MATERIAL],
    sections: [DEFAULT_SECTION, DEFAULT_COLUMN_SECTION],
    loadCases: [{ id: 'DL', name: 'Dead Load', type: 'dead', selfWeightFactor: 1.0 }],
    combinations: [{ id: 'comb1', name: '1.4DL', factors: [{ loadCaseId: 'DL', factor: 1.4 }] }],
  };
}

export function useMobileProject() {
  const [project, setProject] = useState<ProjectState>({
    name: 'New Project',
    model: createEmptyModel(),
    analysisResult: null,
    isDirty: false,
    lastSaved: null,
  });

  const [interaction, setInteraction] = useState<CanvasInteraction>({
    selectedNodeIds: [],
    selectedElementIds: [],
    activeTool: 'select',
    isDrawing: false,
    drawingPoints: [],
  });

  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [analysisDiagnostics, setAnalysisDiagnostics] = useState<string[]>([]);
  const [solveTime, setSolveTime] = useState<number>(0);

  const nextNodeId = useRef(1);
  const nextElementId = useRef(1);

  // Initialize IDs based on existing model
  if (project.model.nodes.length > 0) {
    const maxNodeId = Math.max(...project.model.nodes.map(n => n.id));
    if (nextNodeId.current <= maxNodeId) nextNodeId.current = maxNodeId + 1;
  }
  if (project.model.elements.length > 0) {
    const maxElId = Math.max(...project.model.elements.map(e => e.id));
    if (nextElementId.current <= maxElId) nextElementId.current = maxElId + 1;
  }

  const updateModel = useCallback((updater: (m: StructuralModel) => StructuralModel) => {
    setProject(prev => ({
      ...prev,
      model: updater(prev.model),
      isDirty: true,
      analysisResult: null,
    }));
    setAnalysisStatus('idle');
  }, []);

  const addNode = useCallback((x: number, y: number, z: number = 0): number => {
    const id = nextNodeId.current++;
    const node: StructuralNode = {
      id,
      x,
      y,
      z,
      restraints: { ...FREE_RESTRAINTS },
      nodalLoads: [],
    };
    updateModel(m => ({ ...m, nodes: [...m.nodes, node] }));
    return id;
  }, [updateModel]);

  const addElement = useCallback((type: 'beam' | 'column' | 'slab', nodeIds: number[]): number => {
    const id = nextElementId.current++;
    const el: StructuralElement = {
      id,
      type,
      nodeIds,
      materialId: DEFAULT_MATERIAL.id,
      sectionId: type === 'column' ? DEFAULT_COLUMN_SECTION.id : DEFAULT_SECTION.id,
    };
    if (type === 'slab') {
      el.slabProperties = { stiffnessMode: 'FULL', thickness: 200 };
    }
    updateModel(m => ({ ...m, elements: [...m.elements, el] }));
    return id;
  }, [updateModel]);

  const deleteSelected = useCallback(() => {
    updateModel(m => {
      const nodeSet = new Set(interaction.selectedNodeIds);
      const elSet = new Set(interaction.selectedElementIds);
      const elements = m.elements.filter(e => !elSet.has(e.id) && !e.nodeIds.some(nid => nodeSet.has(nid)));
      const usedNodeIds = new Set(elements.flatMap(e => e.nodeIds));
      const nodes = m.nodes.filter(n => !nodeSet.has(n.id) || usedNodeIds.has(n.id));
      return { ...m, nodes, elements };
    });
    setInteraction(prev => ({ ...prev, selectedNodeIds: [], selectedElementIds: [] }));
  }, [updateModel, interaction]);

  const setTool = useCallback((tool: CanvasTool) => {
    setInteraction(prev => ({ ...prev, activeTool: tool, isDrawing: false, drawingPoints: [] }));
  }, []);

  const selectNode = useCallback((nodeId: number) => {
    setInteraction(prev => ({ ...prev, selectedNodeIds: [nodeId], selectedElementIds: [] }));
  }, []);

  const selectElement = useCallback((elementId: number) => {
    setInteraction(prev => ({ ...prev, selectedNodeIds: [], selectedElementIds: [elementId] }));
  }, []);

  const clearSelection = useCallback(() => {
    setInteraction(prev => ({ ...prev, selectedNodeIds: [], selectedElementIds: [] }));
  }, []);

  const runCoreAnalysis = useCallback(() => {
    setAnalysisStatus('running');
    setAnalysisDiagnostics([]);
    const warnings: string[] = [];
    
    const model = project.model;
    if (model.nodes.length === 0) {
      warnings.push('No nodes defined');
      setAnalysisDiagnostics(warnings);
      setAnalysisStatus('error');
      return;
    }
    if (model.elements.length === 0) {
      warnings.push('No elements defined');
      setAnalysisDiagnostics(warnings);
      setAnalysisStatus('error');
      return;
    }

    const hasSupport = model.nodes.some(n =>
      n.restraints.ux || n.restraints.uy || n.restraints.uz
    );
    if (!hasSupport) {
      warnings.push('Warning: No supports defined - structure is unstable');
    }

    // Check for slab elements and add beta warning
    const hasSlabs = model.elements.some(e => e.type === 'slab');
    if (hasSlabs) {
      warnings.push('⚠ FEM Slab Analysis is BETA - results are experimental');
    }

    try {
      const t0 = performance.now();
      const result = runAnalysis(model, { useUnifiedCore: true });
      const dt = performance.now() - t0;
      setSolveTime(dt);
      
      setProject(prev => ({ ...prev, analysisResult: result, isDirty: false }));
      warnings.push(`Solved in ${dt.toFixed(0)}ms`);
      setAnalysisDiagnostics(warnings);
      setAnalysisStatus('done');
    } catch (err: any) {
      warnings.push(`Analysis error: ${err.message || err}`);
      setAnalysisDiagnostics(warnings);
      setAnalysisStatus('error');
    }
  }, [project.model]);

  return {
    project,
    setProject,
    interaction,
    setInteraction,
    updateModel,
    addNode,
    addElement,
    deleteSelected,
    setTool,
    selectNode,
    selectElement,
    clearSelection,
    runCoreAnalysis,
    analysisStatus,
    analysisDiagnostics,
    solveTime,
  };
}
