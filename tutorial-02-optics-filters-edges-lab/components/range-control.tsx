'use client';

import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';

type RangeControlProps = {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  displayValue?: string;
  help?: string;
};

function decimalPlaces(step: number) {
  const text = step.toString().toLowerCase();
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

export function RangeControl({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  disabled,
  displayValue,
  help,
}: RangeControlProps) {
  const precision = decimalPlaces(step);
  return (
    <div className={disabled ? 'range-control is-disabled' : 'range-control'}>
      <span className="range-label">
        {help ? (
          <TooltipProvider delay={120}>
            <Tooltip>
              <TooltipTrigger
                className="range-label-term range-help-trigger"
                aria-label={`Explain ${label}`}
              >
                <span>
                  <i>{symbol}</i> · {label}
                </span>
                <CircleHelp aria-hidden="true" size={14} />
              </TooltipTrigger>
              <TooltipContent className="range-help-tooltip" side="right">
                {help}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="range-label-term">
            <span>
              <i>{symbol}</i> · {label}
            </span>
          </span>
        )}
        <output>
          {displayValue ?? value.toFixed(precision)} {unit}
        </output>
      </span>
      <Slider
        aria-label={`${label} in ${unit}`}
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? Number(next[0]) : Number(next))
        }
      />
    </div>
  );
}
