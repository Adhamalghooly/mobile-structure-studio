import React, { useRef, useCallback, useEffect } from 'react';
import type { StructuralModel, AnalysisResult, CanvasViewport, ResultLayer } from '../shared/types';
import { Badge } from '@/components/ui/badge';

interface ResultsCanvasProps {
  model: StructuralModel;
  result: AnalysisResult;
  viewport: CanvasViewport;
  onViewportChange: (v: CanvasViewport) => void;
  activeLayers: ResultLayer[];
  onElementTap: (id: number) => void;
  scaleFactor: number;
}

const ResultsCanvas: React.FC<ResultsCanvasProps> = ({
  model, result, viewport, onViewportChange, activeLayers, onElementTap, scaleFactor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toScreen = useCallback((wx: number, wy: number) => ({
    sx: wx * viewport.scale + viewport.offsetX,
    sy: -wy * viewport.scale + viewport.offsetY,
  }), [viewport]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, w, h);

    const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
    const dispMap = new Map(result.nodalDisplacements.map(d => [d.nodeId, d]));
    const forceMap = new Map(result.elementForces.map(f => [f.elementId, f]));

    // Original structure (gray)
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    for (const el of model.elements) {
      if (el.nodeIds.length >= 2) {
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (n1 && n2) {
          const s1 = toScreen(n1.x, n1.y);
          const s2 = toScreen(n2.x, n2.y);
          ctx.beginPath();
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
          ctx.stroke();
        }
      }
    }

    // Deformed shape
    if (activeLayers.includes('deformed')) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      for (const el of model.elements) {
        if (el.nodeIds.length >= 2) {
          const n1 = nodeMap.get(el.nodeIds[0]);
          const n2 = nodeMap.get(el.nodeIds[1]);
          if (!n1 || !n2) continue;
          const d1 = dispMap.get(n1.id);
          const d2 = dispMap.get(n2.id);
          const s1 = toScreen(
            n1.x + (d1?.ux || 0) * scaleFactor,
            n1.y + (d1?.uy || 0) * scaleFactor
          );
          const s2 = toScreen(
            n2.x + (d2?.ux || 0) * scaleFactor,
            n2.y + (d2?.uy || 0) * scaleFactor
          );
          ctx.beginPath();
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
          ctx.stroke();
        }
      }
    }

    // Moment diagrams
    if (activeLayers.includes('moment')) {
      for (const el of model.elements) {
        if (el.type !== 'beam' && el.type !== 'column') continue;
        const forces = forceMap.get(el.id);
        if (!forces) continue;
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (!n1 || !n2) continue;
        const s1 = toScreen(n1.x, n1.y);
        const s2 = toScreen(n2.x, n2.y);
        
        // Draw moment diagram as perpendicular offsets
        const dx = s2.sx - s1.sx;
        const dy = s2.sy - s1.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        const nx = -dy / len;
        const ny = dx / len;
        const mScale = scaleFactor * 0.00005;
        
        ctx.fillStyle = 'rgba(239,68,68,0.15)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s1.sx, s1.sy);
        ctx.lineTo(s1.sx + nx * forces.nodeI.Mz * mScale, s1.sy + ny * forces.nodeI.Mz * mScale);
        ctx.lineTo(s2.sx + nx * forces.nodeJ.Mz * mScale, s2.sy + ny * forces.nodeJ.Mz * mScale);
        ctx.lineTo(s2.sx, s2.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Shear diagrams
    if (activeLayers.includes('shear')) {
      for (const el of model.elements) {
        if (el.type !== 'beam' && el.type !== 'column') continue;
        const forces = forceMap.get(el.id);
        if (!forces) continue;
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (!n1 || !n2) continue;
        const s1 = toScreen(n1.x, n1.y);
        const s2 = toScreen(n2.x, n2.y);
        const dx = s2.sx - s1.sx, dy = s2.sy - s1.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) continue;
        const nx = -dy / len, ny = dx / len;
        const vScale = scaleFactor * 0.0001;

        ctx.fillStyle = 'rgba(34,197,94,0.15)';
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s1.sx, s1.sy);
        ctx.lineTo(s1.sx + nx * forces.nodeI.Vy * vScale, s1.sy + ny * forces.nodeI.Vy * vScale);
        ctx.lineTo(s2.sx + nx * forces.nodeJ.Vy * vScale, s2.sy + ny * forces.nodeJ.Vy * vScale);
        ctx.lineTo(s2.sx, s2.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Axial forces (color coded)
    if (activeLayers.includes('axial')) {
      for (const el of model.elements) {
        if (el.type !== 'beam' && el.type !== 'column') continue;
        const forces = forceMap.get(el.id);
        if (!forces) continue;
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (!n1 || !n2) continue;
        const s1 = toScreen(n1.x, n1.y);
        const s2 = toScreen(n2.x, n2.y);
        const N = forces.nodeI.N;
        ctx.strokeStyle = N > 0 ? '#ef4444' : '#3b82f6'; // tension=red, compression=blue
        ctx.lineWidth = Math.min(6, 2 + Math.abs(N) * 0.00001 * scaleFactor);
        ctx.beginPath();
        ctx.moveTo(s1.sx, s1.sy);
        ctx.lineTo(s2.sx, s2.sy);
        ctx.stroke();
      }
    }

    // Reactions
    if (activeLayers.includes('reactions')) {
      for (const r of result.reactions) {
        const node = nodeMap.get(r.nodeId);
        if (!node) continue;
        const { sx, sy } = toScreen(node.x, node.y);
        const arrowScale = scaleFactor * 0.0002;

        // Vertical reaction
        if (Math.abs(r.fz) > 0.01) {
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          const len = r.fz * arrowScale;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + len);
          ctx.stroke();
          // Arrow head
          ctx.beginPath();
          ctx.moveTo(sx - 4, sy + len * 0.7);
          ctx.lineTo(sx, sy + len);
          ctx.lineTo(sx + 4, sy + len * 0.7);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (const node of model.nodes) {
      const { sx, sy } = toScreen(node.x, node.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    }
  }, [model, result, viewport, activeLayers, scaleFactor, toScreen]);

  useEffect(() => { draw(); }, [draw]);

  // Touch pan/pinch for results view
  const touchRef = useRef({ startX: 0, startY: 0, startOX: 0, startOY: 0, startDist: 0, startScale: 1 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchRef.current = {
        startX: 0, startY: 0,
        startOX: viewport.offsetX, startOY: viewport.offsetY,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: viewport.scale,
      };
    } else {
      touchRef.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        startOX: viewport.offsetX, startOY: viewport.offsetY,
        startDist: 0, startScale: viewport.scale,
      };
    }
  }, [viewport]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchRef.current.startDist;
      const newScale = Math.max(0.1, Math.min(10, touchRef.current.startScale * ratio));
      onViewportChange({ ...viewport, scale: newScale });
    } else {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;
      onViewportChange({
        ...viewport,
        offsetX: touchRef.current.startOX + dx,
        offsetY: touchRef.current.startOY + dy,
      });
    }
  }, [viewport, onViewportChange]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    />
  );
};

export default ResultsCanvas;
