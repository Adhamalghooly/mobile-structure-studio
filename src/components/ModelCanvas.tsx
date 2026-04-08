import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { StructuralNode, FrameElement, AreaElement } from '@/structural/model/types';
import type { ToolType } from './ToolPalette';

interface EndReleaseData {
  nodeI: { ux: boolean; uy: boolean; uz: boolean; rx: boolean; ry: boolean; rz: boolean };
  nodeJ: { ux: boolean; uy: boolean; uz: boolean; rx: boolean; ry: boolean; rz: boolean };
}

interface ModelCanvasProps {
  nodes: StructuralNode[];
  frames: FrameElement[];
  areas: AreaElement[];
  activeTool: ToolType;
  onCanvasClick: (x: number, y: number) => void;
  onNodeClick: (id: number) => void;
  onFrameClick: (id: number) => void;
  onAreaClick: (id: number) => void;
  onFrameLongPress?: (id: number) => void;
  onAreaLongPress?: (id: number) => void;
  selectedNodeId?: number | null;
  selectedFrameId?: number | null;
  selectedAreaId?: number | null;
  pendingNode?: { x: number; y: number } | null;
  columnLabels?: Map<number, string>;
  frameEndReleases?: Record<string, EndReleaseData>;
}

const NODE_RADIUS_BASE = 0.12;
const HIT_RADIUS = 0.3;

export default function ModelCanvas({
  nodes, frames, areas, activeTool,
  onCanvasClick, onNodeClick, onFrameClick, onAreaClick,
  onFrameLongPress, onAreaLongPress,
  selectedNodeId, selectedFrameId, selectedAreaId,
  pendingNode, columnLabels, frameEndReleases,
}: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState({ offsetX: 200, offsetY: 300, scale: 40 });
  const touchState = useRef<{
    type: 'none' | 'pan' | 'pinch';
    startX: number; startY: number;
    startOX: number; startOY: number;
    startDist: number; startScale: number;
    moved: boolean;
  }>({ type: 'none', startX: 0, startY: 0, startOX: 0, startOY: 0, startDist: 0, startScale: 1, moved: false });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toScreen = useCallback((wx: number, wy: number) => ({
    sx: wx * viewport.scale + viewport.offsetX,
    sy: -wy * viewport.scale + viewport.offsetY,
  }), [viewport]);

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - viewport.offsetX) / viewport.scale,
    y: -(sy - viewport.offsetY) / viewport.scale,
  }), [viewport]);

  const getNodeById = useCallback((id: number) => nodes.find(n => n.id === id), [nodes]);

  // Auto-fit to model
  useEffect(() => {
    const floorNodes = nodes.filter(n => Math.abs(n.z) < 0.01);
    if (floorNodes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const xs = floorNodes.map(n => n.x);
    const ys = floorNodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(w * 0.7 / rangeX, h * 0.7 / rangeY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewport({
      scale,
      offsetX: w / 2 - cx * scale,
      offsetY: h / 2 + cy * scale,
    });
  }, [nodes.length]);

  // Drawing
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

    // Background
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(0, 0, w, h);

    // Grid
    const gridSize = viewport.scale;
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

    const floorNodes = nodes.filter(n => Math.abs(n.z) < 0.01);
    const beamFrames = frames.filter(f => f.type === 'beam');
    const columnFrames = frames.filter(f => f.type === 'column');

    // Draw areas (slabs)
    for (const area of areas) {
      const areaNodes = area.nodeIds.map(id => getNodeById(id)).filter(Boolean) as StructuralNode[];
      if (areaNodes.length < 3) continue;
      const isSelected = selectedAreaId === area.id;

      ctx.beginPath();
      for (let i = 0; i < areaNodes.length; i++) {
        const { sx, sy } = toScreen(areaNodes[i].x, areaNodes[i].y);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.1)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      const cx = areaNodes.reduce((s, n) => s + n.x, 0) / areaNodes.length;
      const cy = areaNodes.reduce((s, n) => s + n.y, 0) / areaNodes.length;
      const { sx, sy } = toScreen(cx, cy);
      ctx.fillStyle = '#92400e';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`A${area.id}`, sx, sy);
    }

    // Draw beams
    for (const frame of beamFrames) {
      const ni = getNodeById(frame.nodeI);
      const nj = getNodeById(frame.nodeJ);
      if (!ni || !nj) continue;
      const isSelected = selectedFrameId === frame.id;
      const s1 = toScreen(ni.x, ni.y);
      const s2 = toScreen(nj.x, nj.y);

      ctx.beginPath();
      ctx.moveTo(s1.sx, s1.sy);
      ctx.lineTo(s2.sx, s2.sy);
      ctx.strokeStyle = isSelected ? '#ef4444' : '#1e293b';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // End release indicators
      if (frameEndReleases) {
        const posKey = `${ni.x.toFixed(3)}_${ni.y.toFixed(3)}_${nj.x.toFixed(3)}_${nj.y.toFixed(3)}`;
        const posKeyRev = `${nj.x.toFixed(3)}_${nj.y.toFixed(3)}_${ni.x.toFixed(3)}_${ni.y.toFixed(3)}`;
        const rel = frameEndReleases[posKey] || frameEndReleases[posKeyRev];
        if (rel) {
          const isRev = !frameEndReleases[posKey];
          const rI = isRev ? rel.nodeJ : rel.nodeI;
          const rJ = isRev ? rel.nodeI : rel.nodeJ;
          if (rI.rx || rI.ry || rI.rz) {
            ctx.beginPath(); ctx.arc(s1.sx, s1.sy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; ctx.fill();
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.stroke();
          }
          if (rJ.rx || rJ.ry || rJ.rz) {
            ctx.beginPath(); ctx.arc(s2.sx, s2.sy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; ctx.fill();
            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      }

      // Label
      const mx = (s1.sx + s2.sx) / 2;
      const my = (s1.sy + s2.sy) / 2;
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`B${frame.id}`, mx, my - 8);
    }

    // Draw nodes
    for (const node of floorNodes) {
      const { sx, sy } = toScreen(node.x, node.y);
      const isSelected = selectedNodeId === node.id;
      const hasColumn = columnFrames.some(f => {
        const topNode = getNodeById(f.nodeJ);
        return topNode && Math.abs(topNode.x - node.x) < 0.01 && Math.abs(topNode.y - node.y) < 0.01;
      });
      const hasRestraint = node.restraints.ux || node.restraints.uy || node.restraints.uz;

      if (!hasColumn) {
        ctx.beginPath();
        ctx.arc(sx, sy, isSelected ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`N${node.id}`, sx, sy + 16);
      }

      if (hasRestraint) {
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy + 8);
        ctx.lineTo(sx + 8, sy + 8);
        ctx.lineTo(sx, sy + 18);
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Draw columns
    for (const frame of columnFrames) {
      const topNode = getNodeById(frame.nodeJ);
      if (!topNode || Math.abs(topNode.z) > 0.01) continue;
      const isSelected = selectedFrameId === frame.id;
      const { sx, sy } = toScreen(topNode.x, topNode.y);

      ctx.fillStyle = isSelected ? '#ef4444' : '#22c55e';
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
      ctx.strokeStyle = isSelected ? '#ef4444' : '#166534';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - 8, sy - 8, 16, 16);

      const label = columnLabels?.get(frame.id) || `C${frame.id}`;
      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, sy - 14);
    }

    // Pending node
    if (pendingNode) {
      const { sx, sy } = toScreen(pendingNode.x, pendingNode.y);
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59,130,246,0.5)';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [nodes, frames, areas, viewport, selectedNodeId, selectedFrameId, selectedAreaId, pendingNode, columnLabels, frameEndReleases, getNodeById, toScreen]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  // Find hit targets
  const findNodeAt = useCallback((sx: number, sy: number): number | null => {
    const floorNodes = nodes.filter(n => Math.abs(n.z) < 0.01);
    for (const node of floorNodes) {
      const s = toScreen(node.x, node.y);
      const dx = sx - s.sx, dy = sy - s.sy;
      if (Math.sqrt(dx * dx + dy * dy) < 20) return node.id;
    }
    return null;
  }, [nodes, toScreen]);

  const findFrameAt = useCallback((sx: number, sy: number): number | null => {
    for (const frame of frames) {
      const ni = getNodeById(frame.nodeI);
      const nj = getNodeById(frame.nodeJ);
      if (!ni || !nj) continue;
      const s1 = toScreen(ni.x, ni.y);
      const s2 = toScreen(nj.x, nj.y);
      const dist = pointToSegDist(sx, sy, s1.sx, s1.sy, s2.sx, s2.sy);
      if (dist < 20) return frame.id;
    }
    return null;
  }, [frames, getNodeById, toScreen]);

  const findAreaAt = useCallback((sx: number, sy: number): number | null => {
    for (const area of areas) {
      const areaNodes = area.nodeIds.map(id => getNodeById(id)).filter(Boolean) as StructuralNode[];
      if (areaNodes.length < 3) continue;
      const points = areaNodes.map(n => toScreen(n.x, n.y));
      if (pointInPolygon(sx, sy, points.map(p => [p.sx, p.sy]))) return area.id;
    }
    return null;
  }, [areas, getNodeById, toScreen]);

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
        startX: 0, startY: 0,
        startOX: viewport.offsetX, startOY: viewport.offsetY,
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: viewport.scale,
        moved: false,
      };
      return;
    }

    const sx = e.touches[0].clientX - rect.left;
    const sy = e.touches[0].clientY - rect.top;
    touchState.current = {
      type: 'pan',
      startX: sx, startY: sy,
      startOX: viewport.offsetX, startOY: viewport.offsetY,
      startDist: 0, startScale: viewport.scale,
      moved: false,
    };

    // Long press detection for frames/areas
    longPressTimer.current = setTimeout(() => {
      const frameId = findFrameAt(sx, sy);
      if (frameId) { onFrameLongPress?.(frameId); return; }
      const areaId = findAreaAt(sx, sy);
      if (areaId) onAreaLongPress?.(areaId);
    }, 500);
  }, [viewport, findFrameAt, findAreaAt, onFrameLongPress, onAreaLongPress]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    touchState.current.moved = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 2 && touchState.current.type === 'pinch') {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchState.current.startDist;
      const newScale = Math.max(5, Math.min(200, touchState.current.startScale * ratio));
      const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
      const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
      setViewport({
        scale: newScale,
        offsetX: cx - (cx - touchState.current.startOX) * (newScale / touchState.current.startScale),
        offsetY: cy - (cy - touchState.current.startOY) * (newScale / touchState.current.startScale),
      });
      return;
    }

    if (touchState.current.type === 'pan') {
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;
      const dx = sx - touchState.current.startX;
      const dy = sy - touchState.current.startY;
      setViewport(v => ({
        ...v,
        offsetX: touchState.current.startOX + dx,
        offsetY: touchState.current.startOY + dy,
      }));
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (!touchState.current.moved && e.changedTouches.length > 0) {
      const sx = e.changedTouches[0].clientX - rect.left;
      const sy = e.changedTouches[0].clientY - rect.top;

      if (activeTool === 'select') {
        const nodeId = findNodeAt(sx, sy);
        if (nodeId) { onNodeClick(nodeId); }
        else {
          const frameId = findFrameAt(sx, sy);
          if (frameId) onFrameClick(frameId);
          else {
            const areaId = findAreaAt(sx, sy);
            if (areaId) onAreaClick(areaId);
          }
        }
      } else {
        const { x, y } = toWorld(sx, sy);
        onCanvasClick(Math.round(x * 2) / 2, Math.round(y * 2) / 2);
      }
    }

    touchState.current = { type: 'none', startX: 0, startY: 0, startOX: 0, startOY: 0, startDist: 0, startScale: 1, moved: false };
  }, [activeTool, findNodeAt, findFrameAt, findAreaAt, onNodeClick, onFrameClick, onAreaClick, onCanvasClick, toWorld]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(5, Math.min(200, viewport.scale * factor));
    setViewport({
      scale: newScale,
      offsetX: sx - (sx - viewport.offsetX) * (newScale / viewport.scale),
      offsetY: sy - (sy - viewport.offsetY) * (newScale / viewport.scale),
    });
  }, [viewport]);

  // Mouse click for desktop
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (activeTool === 'select') {
      const nodeId = findNodeAt(sx, sy);
      if (nodeId) { onNodeClick(nodeId); return; }
      const frameId = findFrameAt(sx, sy);
      if (frameId) { onFrameClick(frameId); return; }
      const areaId = findAreaAt(sx, sy);
      if (areaId) { onAreaClick(areaId); return; }
    } else {
      const { x, y } = toWorld(sx, sy);
      onCanvasClick(Math.round(x * 2) / 2, Math.round(y * 2) / 2);
    }
  }, [activeTool, findNodeAt, findFrameAt, findAreaAt, onNodeClick, onFrameClick, onAreaClick, onCanvasClick, toWorld]);

  return (
    <div className="flex-1 relative touch-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      {/* Coordinate display */}
      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] text-muted-foreground z-10 font-mono">
        N:{nodes.filter(n => Math.abs(n.z) < 0.01).length} F:{frames.length} A:{areas.length}
      </div>
    </div>
  );
}

function pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}

function pointInPolygon(px: number, py: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
