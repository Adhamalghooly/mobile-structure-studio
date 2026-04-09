import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { StructuralModel, CanvasViewport, CanvasInteraction, CanvasTool } from '../shared/types';

interface MobileModelCanvasProps {
  model: StructuralModel;
  viewport: CanvasViewport;
  onViewportChange: (v: CanvasViewport) => void;
  interaction: CanvasInteraction;
  onNodeTap: (id: number) => void;
  onElementTap: (id: number) => void;
  onCanvasTap: (x: number, y: number) => void;
  onNodeMove: (id: number, x: number, y: number) => void;
  snapGrid: number;
  /** Node ID of the first point when drawing a beam/column */
  drawingStartNodeId?: number | null;
}

function snapTo(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

const NODE_RADIUS = 8;
const HIT_RADIUS = 20;

const MobileModelCanvas: React.FC<MobileModelCanvasProps> = ({
  model, viewport, onViewportChange, interaction,
  onNodeTap, onElementTap, onCanvasTap, onNodeMove, snapGrid,
  drawingStartNodeId = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef(0);

  const touchState = useRef<{
    type: 'none' | 'pan' | 'pinch' | 'drag';
    startX: number; startY: number;
    startDist: number;
    startScale: number;
    startOX: number; startOY: number;
    dragNodeId: number | null;
  }>({ type: 'none', startX: 0, startY: 0, startDist: 0, startScale: 1, startOX: 0, startOY: 0, dragNodeId: null });

  const toScreen = useCallback((wx: number, wy: number) => ({
    sx: wx * viewport.scale + viewport.offsetX,
    sy: -wy * viewport.scale + viewport.offsetY,
  }), [viewport]);

  const toWorld = useCallback((sx: number, sy: number) => ({
    wx: (sx - viewport.offsetX) / viewport.scale,
    wy: -(sy - viewport.offsetY) / viewport.scale,
  }), [viewport]);

  // Pulse animation timestamp
  const pulseRef = useRef(0);

  // Drawing
  const draw = useCallback((timestamp?: number) => {
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

    const t = timestamp ?? performance.now();
    const pulse = 0.5 + 0.5 * Math.sin(t / 300); // 0..1 oscillation

    // Background
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, w, h);

    // Grid
    const gridSize = snapGrid * viewport.scale;
    if (gridSize > 8) {
      ctx.strokeStyle = '#e0e4ea';
      ctx.lineWidth = 0.5;
      const startX = viewport.offsetX % gridSize;
      const startY = viewport.offsetY % gridSize;
      for (let x = startX; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = startY; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
    const startNode = drawingStartNodeId != null ? nodeMap.get(drawingStartNodeId) : null;
    const isDrawingLine = interaction.activeTool === 'beam';

    // Draw elements
    for (const el of model.elements) {
      const isSelected = interaction.selectedElementIds.includes(el.id);
      if (el.type === 'column' && el.nodeIds.length >= 1) {
        // Column = single point in plan view, drawn as filled square
        const node = nodeMap.get(el.nodeIds[0]);
        if (node) {
          const { sx, sy } = toScreen(node.x, node.y);
          const size = isSelected ? 14 : 12;
          ctx.save();
          ctx.fillStyle = isSelected ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.15)';
          ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
          ctx.strokeStyle = isSelected ? '#ef4444' : '#22c55e';
          ctx.lineWidth = isSelected ? 2.5 : 2;
          ctx.strokeRect(sx - size, sy - size, size * 2, size * 2);
          // Cross inside
          ctx.beginPath();
          ctx.moveTo(sx - size, sy - size); ctx.lineTo(sx + size, sy + size);
          ctx.moveTo(sx + size, sy - size); ctx.lineTo(sx - size, sy + size);
          ctx.strokeStyle = isSelected ? '#ef4444' : '#16a34a';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          // Label
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`C${el.id}`, sx, sy - size - 4);
        }
      } else if (el.type === 'slab' && el.nodeIds.length >= 3) {
        ctx.beginPath();
        for (let i = 0; i < el.nodeIds.length; i++) {
          const node = nodeMap.get(el.nodeIds[i]);
          if (!node) continue;
          const { sx, sy } = toScreen(node.x, node.y);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fillStyle = isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ef4444' : '#f59e0b';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
      } else if (el.nodeIds.length >= 2) {
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (n1 && n2) {
          const s1 = toScreen(n1.x, n1.y);
          const s2 = toScreen(n2.x, n2.y);
          ctx.beginPath();
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
          ctx.strokeStyle = isSelected ? '#ef4444' : '#1e293b';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();
        }
      }
    }

    // ─── Rubber-band preview line from startNode to cursor ───
    if (startNode && isDrawingLine && cursorWorld) {
      const s1 = toScreen(startNode.x, startNode.y);
      const snappedX = snapTo(cursorWorld.x, snapGrid);
      const snappedY = snapTo(cursorWorld.y, snapGrid);
      const s2 = toScreen(snappedX, snappedY);

      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(59,130,246,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s1.sx, s1.sy);
      ctx.lineTo(s2.sx, s2.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Snap target circle at cursor
      ctx.beginPath();
      ctx.arc(s2.sx, s2.sy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Distance label
      const dx = snappedX - startNode.x;
      const dy = snappedY - startNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const midSx = (s1.sx + s2.sx) / 2;
        const midSy = (s1.sy + s2.sy) / 2;
        const label = dist >= 1000 ? `${(dist / 1000).toFixed(2)} m` : `${dist.toFixed(0)} mm`;
        ctx.font = 'bold 11px monospace';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(midSx - tw / 2 - 4, midSy - 16, tw + 8, 20);
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(label, midSx, midSy - 2);
      }
      ctx.restore();
    }

    // Draw nodes
    for (const node of model.nodes) {
      const { sx, sy } = toScreen(node.x, node.y);
      const isSelected = interaction.selectedNodeIds.includes(node.id);
      const isStart = node.id === drawingStartNodeId;
      const hasSupport = node.restraints.ux || node.restraints.uy || node.restraints.uz;

      // Pulsing ring for start node
      if (isStart) {
        ctx.save();
        const ringRadius = NODE_RADIUS + 6 + pulse * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(59,130,246,${0.3 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Solid inner highlight
        ctx.beginPath();
        ctx.arc(sx, sy, NODE_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59,130,246,0.2)';
        ctx.fill();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isStart ? '#2563eb'
        : isSelected ? '#ef4444' : '#3b82f6';
      ctx.fill();

      if (hasSupport) {
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy + 8);
        ctx.lineTo(sx + 8, sy + 8);
        ctx.lineTo(sx, sy + 18);
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
        ctx.fill();
      }

      // Label
      ctx.fillStyle = isStart ? '#0f172a' : '#64748b';
      ctx.font = isStart ? 'bold 11px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`N${node.id}`, sx, sy - 12);
    }

    // Drawing preview (polygon for slab)
    if (interaction.isDrawing && interaction.drawingPoints.length > 0) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < interaction.drawingPoints.length; i++) {
        const p = interaction.drawingPoints[i];
        const { sx, sy } = toScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Continue animation if drawing is active
    if (startNode && isDrawingLine) {
      animFrameRef.current = requestAnimationFrame(draw);
    }
  }, [model, viewport, interaction, toScreen, snapGrid, drawingStartNodeId, cursorWorld]);

  // Start/stop animation loop
  useEffect(() => {
    const isDrawingLine = interaction.activeTool === 'beam' && drawingStartNodeId != null;
    if (isDrawingLine) {
      animFrameRef.current = requestAnimationFrame(draw);
    } else {
      draw();
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Find node near screen point
  const findNodeAt = useCallback((sx: number, sy: number): number | null => {
    for (const node of model.nodes) {
      const s = toScreen(node.x, node.y);
      const dx = sx - s.sx;
      const dy = sy - s.sy;
      if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) return node.id;
    }
    return null;
  }, [model.nodes, toScreen]);

  // Find element near screen point
  const findElementAt = useCallback((sx: number, sy: number): number | null => {
    const nodeMap = new Map(model.nodes.map(n => [n.id, n]));
    for (const el of model.elements) {
      if (el.nodeIds.length >= 2) {
        const n1 = nodeMap.get(el.nodeIds[0]);
        const n2 = nodeMap.get(el.nodeIds[1]);
        if (n1 && n2) {
          const s1 = toScreen(n1.x, n1.y);
          const s2 = toScreen(n2.x, n2.y);
          const dist = pointToSegmentDist(sx, sy, s1.sx, s1.sy, s2.sx, s2.sy);
          if (dist < HIT_RADIUS) return el.id;
        }
      }
    }
    return null;
  }, [model, toScreen]);

  // Track cursor/touch position for rubber-band
  const updateCursor = useCallback((sx: number, sy: number) => {
    const { wx, wy } = toWorld(sx, sy);
    setCursorWorld({ x: wx, y: wy });
  }, [toWorld]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchState.current = {
        type: 'pinch',
        startX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        startY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: viewport.scale,
        startOX: viewport.offsetX,
        startOY: viewport.offsetY,
        dragNodeId: null,
      };
      return;
    }

    const sx = e.touches[0].clientX - rect.left;
    const sy = e.touches[0].clientY - rect.top;

    updateCursor(sx, sy);

    if (interaction.activeTool === 'move') {
      const nodeId = findNodeAt(sx, sy);
      if (nodeId) {
        touchState.current = { type: 'drag', startX: sx, startY: sy, startDist: 0, startScale: viewport.scale, startOX: viewport.offsetX, startOY: viewport.offsetY, dragNodeId: nodeId };
        return;
      }
    }

    if (interaction.activeTool === 'select') {
      touchState.current = { type: 'pan', startX: sx, startY: sy, startDist: 0, startScale: viewport.scale, startOX: viewport.offsetX, startOY: viewport.offsetY, dragNodeId: null };
    } else {
      touchState.current = { type: 'none', startX: sx, startY: sy, startDist: 0, startScale: viewport.scale, startOX: viewport.offsetX, startOY: viewport.offsetY, dragNodeId: null };
    }
  }, [viewport, interaction.activeTool, findNodeAt, updateCursor]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 2 && touchState.current.type === 'pinch') {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchState.current.startDist;
      const newScale = Math.max(0.1, Math.min(10, touchState.current.startScale * ratio));
      const cx = touchState.current.startX;
      const cy = touchState.current.startY;
      onViewportChange({
        scale: newScale,
        offsetX: cx - (cx - touchState.current.startOX) * (newScale / touchState.current.startScale),
        offsetY: cy - (cy - touchState.current.startOY) * (newScale / touchState.current.startScale),
      });
      return;
    }

    const sx = e.touches[0].clientX - rect.left;
    const sy = e.touches[0].clientY - rect.top;

    // Update rubber-band cursor
    if (drawingStartNodeId != null) {
      updateCursor(sx, sy);
    }

    if (touchState.current.type === 'pan') {
      const dx = sx - touchState.current.startX;
      const dy = sy - touchState.current.startY;
      onViewportChange({
        ...viewport,
        offsetX: touchState.current.startOX + dx,
        offsetY: touchState.current.startOY + dy,
      });
    } else if (touchState.current.type === 'drag' && touchState.current.dragNodeId) {
      const { wx, wy } = toWorld(sx, sy);
      onNodeMove(touchState.current.dragNodeId, snapTo(wx, snapGrid), snapTo(wy, snapGrid));
    }
  }, [viewport, onViewportChange, toWorld, onNodeMove, snapGrid, drawingStartNodeId, updateCursor]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (touchState.current.type === 'pan') {
      if (e.changedTouches.length > 0) {
        const sx = e.changedTouches[0].clientX - rect.left;
        const sy = e.changedTouches[0].clientY - rect.top;
        const dx = sx - touchState.current.startX;
        const dy = sy - touchState.current.startY;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          const nodeId = findNodeAt(sx, sy);
          if (nodeId) { onNodeTap(nodeId); }
          else {
            const elId = findElementAt(sx, sy);
            if (elId) onElementTap(elId);
          }
        }
      }
    } else if (touchState.current.type === 'none' && e.changedTouches.length > 0) {
      const sx = e.changedTouches[0].clientX - rect.left;
      const sy = e.changedTouches[0].clientY - rect.top;
      const dx = sx - touchState.current.startX;
      const dy = sy - touchState.current.startY;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        const { wx, wy } = toWorld(sx, sy);
        onCanvasTap(snapTo(wx, snapGrid), snapTo(wy, snapGrid));
      }
    }
    
    touchState.current = { type: 'none', startX: 0, startY: 0, startDist: 0, startScale: 1, startOX: 0, startOY: 0, dragNodeId: null };
  }, [findNodeAt, findElementAt, onNodeTap, onElementTap, onCanvasTap, toWorld, snapGrid]);

  // Mouse support for desktop testing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drawingStartNodeId == null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    updateCursor(e.clientX - rect.left, e.clientY - rect.top);
  }, [drawingStartNodeId, updateCursor]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (interaction.activeTool === 'select') {
      const nodeId = findNodeAt(sx, sy);
      if (nodeId) { onNodeTap(nodeId); return; }
      const elId = findElementAt(sx, sy);
      if (elId) { onElementTap(elId); return; }
    } else {
      const { wx, wy } = toWorld(sx, sy);
      onCanvasTap(snapTo(wx, snapGrid), snapTo(wy, snapGrid));
    }
  }, [interaction.activeTool, findNodeAt, findElementAt, onNodeTap, onElementTap, onCanvasTap, toWorld, snapGrid]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    />
  );
};

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

export default MobileModelCanvas;
