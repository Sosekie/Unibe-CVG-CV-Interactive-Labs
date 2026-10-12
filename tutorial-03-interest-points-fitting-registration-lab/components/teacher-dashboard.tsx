'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCheck, Eye, EyeOff, LogOut, RefreshCw, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractiveAnswer } from '@/components/interactive-answer';
import { tutorialQuestions } from '@/lib/question-bank';
import { fetchTeacherState, LabsApiError, updateRelease, type TeacherQuestionState, type TeacherSession } from '@/lib/labs-api';

const groups = ['All', 'Edges', 'Interest Points', 'Fitting', 'Registration'] as const;
const refreshInterval = 5000;

export function TeacherDashboard({ session, onSignOut }: { session: TeacherSession; onSignOut: (reason?: 'expired') => void }) {
  const [state, setState] = useState<Record<string, TeacherQuestionState> | null>(null);
  const [group, setGroup] = useState<(typeof groups)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const questions = useMemo(() => tutorialQuestions
    .map((question) => ({ ...question, votes: state?.[question.id]?.votes ?? 0, answerPublished: state?.[question.id]?.published ?? false }))
    .sort((a, b) => b.votes - a.votes || a.sortOrder - b.sortOrder), [state]);

  const showError = useCallback((loadError: unknown) => {
    if (loadError instanceof LabsApiError && loadError.status === 401) onSignOut('expired');
    else setError(loadError instanceof Error ? loadError.message : 'Could not load results.');
  }, [onSignOut]);

  const load = async () => {
    try {
      setState((await fetchTeacherState(session)).questions);
      setError('');
    } catch (loadError) {
      showError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await fetchTeacherState(session);
        if (active) { setState(next.questions); setError(''); setLoading(false); }
      } catch (loadError) {
        if (active) { showError(loadError); setLoading(false); }
      }
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(refreshWhenVisible, refreshInterval);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [session, showError]);

  const filtered = useMemo(() => group === 'All' ? questions : questions.filter((question) => question.groupName === group), [questions, group]);
  const totalVotes = questions.reduce((sum, question) => sum + question.votes, 0);
  const published = questions.filter((question) => question.answerPublished).length;

  const updateAnswers = async (payload: { questionId?: string; scope?: 'all'; published: boolean }) => {
    setChanging(payload.scope ?? payload.questionId ?? 'all');
    setError('');
    setNotice('');
    try {
      await updateRelease(session, payload);
      await load();
      setNotice(payload.published ? 'Answers are now visible to students.' : 'Answers are now hidden from students.');
    } catch (updateError) {
      if (updateError instanceof LabsApiError && updateError.status === 401) onSignOut('expired');
      else setError(updateError instanceof Error ? updateError.message : 'Could not update answer visibility.');
    } finally {
      setChanging(null);
    }
  };

  return (
    <main className="teacher-shell">
      <header className="teacher-topbar"><Link href="/">← Tutorial 03 Lab</Link><span className="teacher-account">INSTRUCTOR VIEW · {session.login}<button type="button" onClick={() => onSignOut()}><LogOut size={13} /> Sign out</button></span></header>
      <section className="teacher-content">
        <div className="teacher-heading">
          <div><p className="section-kicker">LIVE CLASS SIGNAL</p><h1>What needs explanation?</h1><p>Questions are ranked by votes. Publish an explanation when you are ready for students to see it.</p></div>
          <Button variant="outline" onClick={() => { setLoading(true); void load(); }} disabled={loading || changing !== null}><RefreshCw size={15} className={loading ? 'spin' : ''} /> {loading ? 'Refreshing…' : 'Refresh now'}</Button>
        </div>

        <section className="teacher-release" aria-labelledby="release-heading">
          <div className="teacher-release-copy">
            <span className="teacher-release-icon"><Send size={17} /></span>
            <div><p className="section-kicker">STUDENT VISIBILITY</p><h2 id="release-heading">Publish prepared answers</h2><p>Published explanations appear on the student page. You can release them together or one at a time.</p></div>
          </div>
          <div className="teacher-release-actions">
            <Button onClick={() => updateAnswers({ scope: 'all', published: true })} disabled={loading || changing !== null || published === questions.length}>
              <CheckCheck size={15} /> {changing === 'all' && published < questions.length ? 'Publishing…' : 'Publish all answers'}
            </Button>
            <Button variant="outline" onClick={() => updateAnswers({ scope: 'all', published: false })} disabled={loading || changing !== null || published === 0}>
              <EyeOff size={15} /> {changing === 'all' && published > 0 ? 'Hiding…' : 'Hide all answers'}
            </Button>
          </div>
          <div className="teacher-release-status"><span>{published} / {questions.length} answers visible to students</span><div className="teacher-release-track"><i style={{ width: `${questions.length ? published / questions.length * 100 : 0}%` }} /></div></div>
        </section>

        {notice ? <output className="teacher-notice">{notice}</output> : null}
        <div className="teacher-stats"><article><Users /><span>Total votes</span><strong>{totalVotes}</strong></article><article><Eye /><span>Answers published</span><strong>{published} / {questions.length}</strong></article><article><span>Top request</span><strong>{questions[0]?.votes ?? 0} votes</strong><small>{questions[0]?.votes ? questions[0].groupName : 'Waiting for class'}</small></article></div>
        <div className="teacher-filters" aria-label="Filter questions by topic">{groups.map((item) => <button key={item} className={group === item ? 'active' : ''} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}</button>)}</div>
        {error ? <p className="question-error" role="alert">{error}</p> : null}
        <div className="teacher-list" aria-live="polite">
          {loading && !state ? <p className="loading-question">Loading classroom questions…</p> : filtered.length === 0 ? <p className="loading-question">No questions in this topic yet.</p> : filtered.map((question, index) => (
            <article className="teacher-question" key={question.id}>
              <div className="rank-badge">{index + 1}</div>
              <div className="teacher-question-body">
                <div><span>{question.groupName}</span><span className={'difficulty ' + question.difficulty.toLowerCase()}>{question.difficulty}</span></div>
                <p className="teacher-prompt">{question.prompt}</p>
                <div className="teacher-answer"><span>Prepared explanation</span><p>{question.answer}</p></div>
              </div>
              <div className="teacher-actions"><strong>{question.votes}</strong><span>votes</span><Button variant={question.answerPublished ? 'secondary' : 'default'} disabled={changing !== null} onClick={() => updateAnswers({ questionId: question.id, published: !question.answerPublished })}>{changing === question.id ? 'Updating…' : question.answerPublished ? <><EyeOff size={14} /> Hide answer</> : <><Eye size={14} /> Publish answer</>}</Button></div>
              <details className="teacher-answer-preview"><summary>Preview full interactive answer · Q{String(question.sortOrder).padStart(2, '0')}</summary><InteractiveAnswer questionId={question.id} fallback={question.answer} /></details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
