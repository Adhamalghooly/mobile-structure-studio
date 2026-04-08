import React from 'react';
import { Input } from '@/components/ui/input';

interface UnitInputProps {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const UnitInput: React.FC<UnitInputProps> = ({ label, value, unit, onChange, min, max, step = 1 }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</label>
    <div className="relative flex-1">
      <Input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="h-10 pr-10 text-sm font-mono"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
    </div>
  </div>
);

export default UnitInput;
