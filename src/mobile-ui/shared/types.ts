/**
 * Mobile UI shared types
 */
import type { StructuralModel, StructuralNode, StructuralElement, Material, Section, LoadCase, LoadCombination } from '@/core/model/types';
import type { AnalysisResult } from '@/core/postprocess/resultProcessor';

export type MobileTab = 'model' | 'loads' | 'analyze' | 'results' | 'settings';

export type CanvasTool = 'select' | 'node' | 'beam' | 'column' | 'slab' | 'delete' | 'move' | 'measure';

export interface ProjectState {
  name: string;
  model: StructuralModel;
  analysisResult: AnalysisResult | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface CanvasViewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CanvasInteraction {
  selectedNodeIds: number[];
  selectedElementIds: number[];
  activeTool: CanvasTool;
  isDrawing: boolean;
  drawingPoints: { x: number; y: number }[];
}

export type ResultLayer = 'deformed' | 'axial' | 'shear' | 'moment' | 'reactions' | 'contour';

export { type StructuralModel, type StructuralNode, type StructuralElement, type Material, type Section, type LoadCase, type LoadCombination, type AnalysisResult };
