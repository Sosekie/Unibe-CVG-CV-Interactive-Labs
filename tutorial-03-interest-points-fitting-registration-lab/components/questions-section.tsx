'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

const groups = ['Edges', 'Interest Points', 'Fitting', 'Registration'] as const;
const refreshInterval = 5000;
type StudentQuestion = { id: string; groupName: string; difficulty: string; prompt: string; sortOrder: number; votes: number; hasVoted: boolean; answer?: string; answerPublished: boolean };

function voterId() {
  const key = 'cv-tutorial-03-voter-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'voter-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  window.localStorage.setItem(key, next);
  return next;
}

export function QuestionsSection() {
  const [browserVoterId] = useState<string | null>(() => typeof window === 'undefined' ? null : voterId());
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [activeGroup, setActiveGroup] = useState<(typeof groups)[number]>('Edges');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = async (id: string) => {
    const response = await fetch('/api/questions?voter=' + encodeURIComponent(id), { cache: 'no-store' });
    const data = await response.json() as { questions?: StudentQuestion[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Could not load questions.');
    setQuestions(data.questions ?? []);
  };
  useEffect(() => {
    if (!browserVoterId) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/questions?voter=' + encodeURIComponent(browserVoterId), { cache: 'no-store' });
        const data = await response.json() as { questions?: StudentQuestion[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Could not load questions.');
        if (active) { setQuestions(data.questions ?? []); setError(''); }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load questions.'); }
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(refreshWhenVisible, refreshInterval);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [browserVoterId]);
  const filtered = useMemo(() => questions.filter((question) => question.groupName === activeGroup), [questions, activeGroup]);
  const submitVote = async (questionId: string) => {
    if (!browserVoterId) return;
    setSubmitting(questionId); setError('');
    try {
      const response = await fetch('/api/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, voterId: browserVoterId }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not submit vote.');
      await load(browserVoterId);
    } catch (voteError) { setError(voteError instanceof Error ? voteError.message : 'Could not submit vote.'); }
    finally { setSubmitting(null); }
  };
  return (
    <section className="question-section" id="questions" aria-labelledby="questions-title">
      <div className="question-header"><div><p className="section-kicker">02 / THINK &amp; DISCUSS</p><h2 id="questions-title">Which point should we unpack?</h2><p>Nine selected questions cover the core tutorial. Try the matching lab first, then vote for what still feels unclear.</p></div><div className="question-instruction"><span>1</span> vote per browser per question · totals and released answers refresh automatically</div></div>
      <div className="question-groups" role="tablist" aria-label="Question group">{groups.map((group) => <button key={group} role="tab" aria-selected={activeGroup === group} className={activeGroup === group ? 'active' : ''} onClick={() => setActiveGroup(group)}><strong>{group}</strong><span>{questions.filter((question) => question.groupName === group).length}</span></button>)}</div>
      {error ? <p className="question-error" role="alert">{error}</p> : null}
      <div className="question-grid">
        {!questions.length && !error ? <p className="loading-question">Loading the Tutorial 03 question bank…</p> : null}
        {filtered.map((question, index) => <article className="question-card" key={question.id}><div className="question-card-topline"><span>Q{String(index + 1).padStart(2, '0')}</span><span>{question.difficulty} · {question.votes} {question.votes === 1 ? 'vote' : 'votes'}</span></div><p className="question-prompt">{question.prompt}</p><div className="question-card-bottom"><Button type="button" aria-label={'Vote for question ' + (index + 1) + ': ' + question.prompt} variant={question.hasVoted ? 'secondary' : 'default'} className={question.hasVoted ? 'vote-button voted' : 'vote-button'} disabled={question.hasVoted || submitting === question.id} onClick={() => submitVote(question.id)}>{submitting === question.id ? 'Sending…' : question.hasVoted ? 'Vote recorded' : 'I want this explained'}</Button><span className={question.answerPublished ? 'answer-status published' : 'answer-status'}>{question.answerPublished ? 'Answer released' : 'Think first'}</span></div>{question.answerPublished && question.answer ? <div className="released-answer"><span>ANSWER</span><p>{question.answer}</p></div> : null}</article>)}
      </div>
    </section>
  );
}
