import React, { useState, useCallback } from 'react';
import MobileHeader from './layout/MobileHeader';
import MobileBottomNav from './layout/MobileBottomNav';
import MobileModelCanvas from './modeling/MobileModelCanvas';
import FloatingToolbar from './modeling/FloatingToolbar';
import ResultsCanvas from './results/ResultsCanvas';
import ResultLayerToggles from './results/ResultLayerToggles';
import ElementInspector from './results/ElementInspector';
import AnalysisControlPanel from './analysis/AnalysisControlPanel';
import NodePropertiesSheet from './properties/NodePropertiesSheet';
import BeamPropertiesSheet from './properties/BeamPropertiesSheet';
import SlabPropertiesSheet from './properties/SlabPropertiesSheet';
import LoadAssignmentSheet from './properties/LoadAssignmentSheet';
import { useMobileProject } from './shared/useMobileProject';
import type { MobileTab, CanvasViewport, ResultLayer } from './shared/types';

const MobileApp: React.FC = () => {
  const {
    project, interaction, updateModel, addNode, addElement, deleteSelected,
    setTool, selectNode, selectElement, clearSelection, runCoreAnalysis,
    analysisStatus, analysisDiagnostics, solveTime,
  } = useMobileProject();

  const [activeTab, setActiveTab] = useState<MobileTab>('model');
  const [viewport, setViewport] = useState<CanvasViewport>({ offsetX: 200, offsetY: 400, scale: 0.15 });
  const [snapGrid] = useState(500); // 500mm grid

  // Property sheet states
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editingElementId, setEditingElementId] = useState<number | null>(null);
  const [editingLoadNodeId, setEditingLoadNodeId] = useState<number | null>(null);
  const [inspectingElementId, setInspectingElementId] = useState<number | null>(null);

  // Result layers
  const [activeLayers, setActiveLayers] = useState<ResultLayer[]>(['deformed']);
  const [resultScaleFactor, setResultScaleFactor] = useState(100);

  // Drawing state for beam/column creation
  const [drawingStartNode, setDrawingStartNode] = useState<number | null>(null);

  const handleCanvasTap = useCallback((wx: number, wy: number) => {
    const tool = interaction.activeTool;

    if (tool === 'node') {
      addNode(wx, wy);
    } else if (tool === 'beam' || tool === 'column') {
      // Find existing node at location or create new
      const existingNode = project.model.nodes.find(n =>
        Math.abs(n.x - wx) < 100 && Math.abs(n.y - wy) < 100
      );
      const nodeId = existingNode?.id ?? addNode(wx, wy);

      if (drawingStartNode === null) {
        setDrawingStartNode(nodeId);
      } else {
        addElement(tool, [drawingStartNode, nodeId]);
        setDrawingStartNode(null);
      }
    } else if (tool === 'delete') {
      // Find nearest node or element
      const nearNode = project.model.nodes.find(n =>
        Math.abs(n.x - wx) < 200 && Math.abs(n.y - wy) < 200
      );
      if (nearNode) {
        selectNode(nearNode.id);
        deleteSelected();
      }
    } else if (tool === 'select') {
      clearSelection();
    }
  }, [interaction.activeTool, addNode, addElement, drawingStartNode, project.model.nodes, selectNode, deleteSelected, clearSelection]);

  const handleNodeTap = useCallback((nodeId: number) => {
    if (interaction.activeTool === 'select') {
      selectNode(nodeId);
      if (activeTab === 'loads') {
        setEditingLoadNodeId(nodeId);
      } else {
        setEditingNodeId(nodeId);
      }
    } else if (interaction.activeTool === 'beam' || interaction.activeTool === 'column') {
      if (drawingStartNode === null) {
        setDrawingStartNode(nodeId);
      } else {
        addElement(interaction.activeTool, [drawingStartNode, nodeId]);
        setDrawingStartNode(null);
      }
    } else if (interaction.activeTool === 'delete') {
      selectNode(nodeId);
      deleteSelected();
    }
  }, [interaction.activeTool, selectNode, activeTab, drawingStartNode, addElement, deleteSelected]);

  const handleElementTap = useCallback((elementId: number) => {
    if (activeTab === 'results' && project.analysisResult) {
      setInspectingElementId(elementId);
    } else {
      selectElement(elementId);
      setEditingElementId(elementId);
    }
  }, [activeTab, project.analysisResult, selectElement]);

  const handleNodeMove = useCallback((nodeId: number, x: number, y: number) => {
    updateModel(m => ({
      ...m,
      nodes: m.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n),
    }));
  }, [updateModel]);

  const toggleResultLayer = useCallback((layer: ResultLayer) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  }, []);

  const editingNode = project.model.nodes.find(n => n.id === editingNodeId) || null;
  const editingElement = project.model.elements.find(e => e.id === editingElementId) || null;
  const loadNode = project.model.nodes.find(n => n.id === editingLoadNodeId) || null;

  const hasSlabResults = (project.analysisResult?.elementStresses.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      <MobileHeader
        projectName={project.name}
        isDirty={project.isDirty}
        analysisStatus={analysisStatus}
        onAnalyze={() => {
          runCoreAnalysis();
          setActiveTab('analyze');
        }}
      />

      {/* Main content area */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          marginTop: 'calc(var(--mobile-header-height) + var(--safe-area-top))',
          marginBottom: 'var(--mobile-nav-height)',
        }}
      >
        {/* Model / Results canvas */}
        {(activeTab === 'model' || activeTab === 'loads') && (
          <>
            <MobileModelCanvas
              model={project.model}
              viewport={viewport}
              onViewportChange={setViewport}
              interaction={interaction}
              onNodeTap={handleNodeTap}
              onElementTap={handleElementTap}
              onCanvasTap={handleCanvasTap}
              onNodeMove={handleNodeMove}
              snapGrid={snapGrid}
            />
            <FloatingToolbar
              activeTool={interaction.activeTool}
              onToolChange={setTool}
            />
            {/* Drawing indicator */}
            {drawingStartNode !== null && (
              <div className="absolute top-2 left-2 bg-engineering-blue text-engineering-blue-foreground px-3 py-1 rounded-full text-xs font-semibold z-20">
                Tap end point for {interaction.activeTool}
              </div>
            )}
            {/* Model info */}
            <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] text-muted-foreground z-20">
              N:{project.model.nodes.length} E:{project.model.elements.length}
            </div>
          </>
        )}

        {activeTab === 'analyze' && (
          <div className="h-full overflow-y-auto p-4">
            <AnalysisControlPanel
              model={project.model}
              analysisStatus={analysisStatus}
              diagnostics={analysisDiagnostics}
              solveTime={solveTime}
              result={project.analysisResult}
              onRunAnalysis={runCoreAnalysis}
            />
          </div>
        )}

        {activeTab === 'results' && project.analysisResult && (
          <>
            <ResultsCanvas
              model={project.model}
              result={project.analysisResult}
              viewport={viewport}
              onViewportChange={setViewport}
              activeLayers={activeLayers}
              onElementTap={handleElementTap}
              scaleFactor={resultScaleFactor}
            />
            <ResultLayerToggles
              activeLayers={activeLayers}
              onToggle={toggleResultLayer}
              hasShellResults={hasSlabResults}
            />
            {/* Scale factor control */}
            <div className="absolute top-2 left-2 bg-background/90 backdrop-blur rounded-lg px-3 py-1.5 z-20 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Scale</span>
              <input
                type="range"
                min={1}
                max={500}
                value={resultScaleFactor}
                onChange={e => setResultScaleFactor(parseInt(e.target.value))}
                className="w-24 h-1"
              />
              <span className="text-[10px] font-mono text-foreground">{resultScaleFactor}×</span>
            </div>
          </>
        )}

        {activeTab === 'results' && !project.analysisResult && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">No results yet</p>
              <button
                onClick={() => { runCoreAnalysis(); setActiveTab('analyze'); }}
                className="px-4 py-2 bg-engineering-blue text-engineering-blue-foreground rounded-lg text-sm font-semibold"
              >
                Run Analysis
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Settings</h2>
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Project</h4>
                <p className="text-sm text-foreground">{project.name}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Engine</h4>
                <p className="text-sm text-foreground">Unified Structural Core v1.0</p>
                <p className="text-[10px] text-muted-foreground mt-1">Frame analysis: Production ✅</p>
                <p className="text-[10px] text-engineering-beta mt-0.5">Shell/Slab FEM: Beta ⚠️</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Units</h4>
                <p className="text-sm text-foreground">mm, N, MPa, rad</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResults={!!project.analysisResult}
      />

      {/* Property Sheets */}
      <NodePropertiesSheet
        isOpen={editingNodeId !== null}
        onClose={() => setEditingNodeId(null)}
        node={editingNode}
        onUpdate={node => {
          updateModel(m => ({
            ...m,
            nodes: m.nodes.map(n => n.id === node.id ? node : n),
          }));
        }}
      />

      <BeamPropertiesSheet
        isOpen={editingElementId !== null && editingElement?.type !== 'slab'}
        onClose={() => setEditingElementId(null)}
        element={editingElement?.type !== 'slab' ? editingElement : null}
        materials={project.model.materials}
        sections={project.model.sections}
        onUpdate={el => {
          updateModel(m => ({
            ...m,
            elements: m.elements.map(e => e.id === el.id ? el : e),
          }));
        }}
      />

      <SlabPropertiesSheet
        isOpen={editingElementId !== null && editingElement?.type === 'slab'}
        onClose={() => setEditingElementId(null)}
        element={editingElement?.type === 'slab' ? editingElement : null}
        materials={project.model.materials}
        onUpdate={el => {
          updateModel(m => ({
            ...m,
            elements: m.elements.map(e => e.id === el.id ? el : e),
          }));
        }}
      />

      <LoadAssignmentSheet
        isOpen={editingLoadNodeId !== null}
        onClose={() => setEditingLoadNodeId(null)}
        node={loadNode}
        loadCases={project.model.loadCases}
        onUpdate={node => {
          updateModel(m => ({
            ...m,
            nodes: m.nodes.map(n => n.id === node.id ? node : n),
          }));
        }}
      />

      {/* Element Inspector (Results) */}
      {project.analysisResult && (
        <ElementInspector
          isOpen={inspectingElementId !== null}
          onClose={() => setInspectingElementId(null)}
          elementId={inspectingElementId}
          model={project.model}
          result={project.analysisResult}
        />
      )}
    </div>
  );
};

export default MobileApp;
