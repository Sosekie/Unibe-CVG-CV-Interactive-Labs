'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const prompts = {
  edges: 'Before increasing σ: what should happen to the height and width of the gradient peak?',
  interest: 'Before moving the contrast slider: how should the Harris score change when intensity is halved?',
  fitting: 'Before rotating the points: which method should still represent the same geometric line?',
  registration: 'Before changing the model: how many point pairs are needed for a unique solution?',
} as const;

export function PredictionStep({ moduleId }: { moduleId: keyof typeof prompts }) {
  const storageKey = 'cv-tutorial-03-prediction-' + moduleId;
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState<string | null>(() => typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey));
  const save = () => {
    const value = draft.trim();
    if (!value) return;
    window.localStorage.setItem(storageKey, value);
    setSaved(value);
  };
  return (
    <div className="prediction-step">
      <span className="prediction-index">PREDICT</span>
      <p>{prompts[moduleId]}</p>
      {saved ? <div className="prediction-saved"><span>{saved}</span><button type="button" onClick={() => { window.localStorage.removeItem(storageKey); setSaved(null); setDraft(''); }}>Edit</button></div> : <div className="prediction-entry"><Input aria-label="Your prediction" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write one sentence…" onKeyDown={(event) => { if (event.key === 'Enter') save(); }} /><Button onClick={save}>Save</Button></div>}
    </div>
  );
}
