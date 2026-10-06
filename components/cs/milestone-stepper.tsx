'use client';

import { Check } from 'lucide-react';
import type { Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEPS: Milestone[] = ['Booked', 'Customs Cleared', 'Handover', 'Delivered'];

const STEP_INDEX: Record<Milestone, number> = {
  Booked: 0,
  'Customs Cleared': 1,
  Handover: 2,
  Delivered: 3,
};

export function MilestoneStepper({ current }: { current: Milestone }) {
  const currentIdx = STEP_INDEX[current];

  return (
    <div className="flex items-center gap-1" aria-label={`Milestone: ${current}`}>
      {STEPS.map((step, idx) => {
        const completed = idx < currentIdx;
        const active = idx === currentIdx;
        const pending = idx > currentIdx;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                  completed && 'bg-emerald-500 text-white',
                  active && 'bg-blue-600 text-white ring-4 ring-blue-100',
                  pending && 'bg-slate-100 text-slate-400'
                )}
              >
                {completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  'hidden whitespace-nowrap text-[10px] font-medium lg:block',
                  active ? 'text-blue-700' : completed ? 'text-emerald-700' : 'text-slate-400'
                )}
              >
                {step}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-0.5 h-0.5 w-6 rounded-full transition-colors',
                  idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
