import { useState } from 'react';
import { dayKey, addDays } from '@reveal/shared';
import { Button } from '../../components/ui/primitives';
import { Field, TextInput } from './ui';

export function useDateRange(defaultDays = 30) {
  const today = new Date();
  const [range, setRange] = useState({ from: dayKey(addDays(today, -(defaultDays - 1))), to: dayKey(today) });
  const query = new URLSearchParams(range).toString();
  return { range, setRange, query };
}

const PRESETS = [7, 30, 90];

export function DateRangeFilter({ range, onChange }: { range: { from: string; to: string }; onChange: (r: { from: string; to: string }) => void }) {
  const today = new Date();
  return (
    <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Date range">
      {PRESETS.map((d) => (
        <Button key={d} size="sm" variant="secondary" onClick={() => onChange({ from: dayKey(addDays(today, -(d - 1))), to: dayKey(today) })}>
          Last {d} days
        </Button>
      ))}
      <Field label="From" className="w-40">
        {(id) => <TextInput id={id} type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && onChange({ ...range, from: e.target.value })} />}
      </Field>
      <Field label="To" className="w-40">
        {(id) => <TextInput id={id} type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && onChange({ ...range, to: e.target.value })} />}
      </Field>
    </div>
  );
}
