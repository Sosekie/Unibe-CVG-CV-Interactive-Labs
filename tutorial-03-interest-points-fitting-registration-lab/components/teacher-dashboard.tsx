'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const groups = ['All', 'Edges', 'Interest Points', 'Fitting', 'Registration'] as const;
const refreshInterval = 5000;
type TeacherQuestion = { id: string; groupName: string; difficulty: string; prompt: string; answer: string; answerPublished: boolean; sortOrder: number; votes: number };

export function TeacherDashboard() {
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [group, setGroup] = useState<(typeof groups)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/teacher/questions', { cache: 'no-store' });
      const data = await response.json() as { questions?: TeacherQuestion[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not load results.');
      setQuestions(data.questions ?? []); setError('');
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Could not load results.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/teacher/questions', { cache: 'no-store' });
        const data = await response.json() as { questions?: TeacherQuestion[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? 'Could not load results.');
        if (active) { setQuestions(data.questions ?? []); setError(''); setLoading(false); }
      } catch (loadError) { if (active) { setError(loadError instanceof Error ? loadError.message : 'Could not load results.'); setLoading(false); } }
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(refreshWhenVisible, refreshInterval);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, []);
  const filtered = useMemo(() => group === 'All' ? questions : questions.filter((question) => question.groupName === group), [questions, group]);
  const totalVotes = questions.reduce((sum, question) => sum + question.votes, 0);
  const published = questions.filter((question) => question.answerPublished).length;
  const toggle = async (question: TeacherQuestion) => {
    setChanging(question.id);
    try {
      const response = await fetch('/api/teacher/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: question.id, published: !question.answerPublished }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Could not update answer visibility.');
      await load();
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Could not update answer visibility.'); }
    finally { setChanging(null); }
  };
  return (
    <main className="teacher-shell">
      <header className="teacher-topbar"><Link href="/">← Tutorial 03 Lab</Link><span>INSTRUCTOR VIEW · PRIVATE</span></header>
      <section className="teacher-content">
        <div className="teacher-heading"><div><p className="section-kicker">LIVE CLASS SIGNAL</p><h1>What needs explanation?</h1><p>Questions are ranked by votes. Publish an explanation when you are ready for students to see it.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh now'}</Button></div>
        <div className="teacher-stats"><article><Users /><span>Total votes</span><strong>{totalVotes}</strong></article><article><Eye /><span>Answers published</span><strong>{published} / {questions.length}</strong></article><article><span>Top request</span><strong>{questions[0]?.votes ?? 0} votes</strong><small>{questions[0]?.groupName ?? 'Waiting for class'}</small></article></div>
        <div className="teacher-filters">{groups.map((item) => <button key={item} className={group === item ? 'active' : ''} onClick={() => setGroup(item)}>{item}</button>)}</div>
        {error ? <p className="question-error" role="alert">{error}</p> : null}
        <div className="teacher-list">{filtered.map((question, index) => <article className="teacher-question" key={question.id}><div className="rank-badge">{index + 1}</div><div className="teacher-question-body"><div><span>{question.groupName}</span><span className={'difficulty ' + question.difficulty.toLowerCase()}>{question.difficulty}</span></div><p className="teacher-prompt">{question.prompt}</p><div className="teacher-answer"><span>Prepared explanation</span><p>{question.answer}</p></div></div><div className="teacher-actions"><strong>{question.votes}</strong><span>votes</span><Button variant={question.answerPublished ? 'secondary' : 'default'} disabled={changing === question.id} onClick={() => toggle(question)}>{changing === question.id ? 'Updating…' : question.answerPublished ? <><EyeOff size={14} /> Hide answer</> : <><Eye size={14} /> Publish answer</>}</Button></div></article>)}</div>
      </section>
    </main>
  );
}
