import React, { useRef, useState, useCallback, useEffect } from 'react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snapPoints?: number[];
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen, onClose, title, children, snapPoints = [0.5, 0.9]
}) => {
  const [height, setHeight] = useState(snapPoints[0]);
  const startY = useRef(0);
  const startH = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startH.current = height;
  }, [height]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = startY.current - e.touches[0].clientY;
    const dh = dy / window.innerHeight;
    const newH = Math.max(0.15, Math.min(0.95, startH.current + dh));
    setHeight(newH);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Snap to closest point
    let closest = snapPoints[0];
    let minDist = Math.abs(height - closest);
    for (const sp of snapPoints) {
      const dist = Math.abs(height - sp);
      if (dist < minDist) { minDist = dist; closest = sp; }
    }
    if (height < 0.15) {
      onClose();
      setHeight(snapPoints[0]);
    } else {
      setHeight(closest);
    }
  }, [height, snapPoints, onClose]);

  useEffect(() => {
    if (isOpen) setHeight(snapPoints[0]);
  }, [isOpen, snapPoints]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-[height] duration-200"
        style={{ height: `${height * 100}vh`, paddingBottom: 'var(--safe-area-bottom)' }}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 cursor-grab"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex-shrink-0 px-4 py-2 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomSheet;
