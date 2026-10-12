'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InteractiveAnswer } from '@/components/interactive-answer';
import { tutorialQuestions } from '@/lib/question-bank';
import { browserVoterId, fetchQuestionState, labsApiAvailable, submitVote, type QuestionState } from '@/lib/labs-api';

export const questionGroups = ['Normal Integration', 'Photometric Stereo', 'Light & Reflectance'] as const;
const refreshInterval = 10000;
const noState: QuestionState = { votes: 0, hasVoted: false, published: false };

export function QuestionsSection() {
  const [voterId] = useState<string | null>(() => typeof window === 'undefined' ? null : browserVoterId('cv-tutorial-04-voter-id'));
  const [state, setState] = useState<Record<string, QuestionState> | null>(null);
  const [activeGroup, setActiveGroup] = useState<(typeof questionGroups)[number]>('Normal Integration');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState(labsApiAvailable ? '' : 'Voting and released answers are not connected in this copy of the lab.');
  const questions = useMemo(() => tutorialQuestions.map((question) => ({ ...question, ...(state?.[question.id] ?? noState) })), [state]);
  useEffect(() => {
    if (!voterId || !labsApiAvailable) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await fetchQuestionState(voterId);
        if (active) { setState(next); setError(''); }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the votes.'); }
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const interval = window.setInterval(refreshWhenVisible, refreshInterval);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [voterId]);
  const filtered = useMemo(() => questions.filter((question) => question.groupName === activeGroup), [questions, activeGroup]);
  const releasedCount = questions.filter((question) => question.published).length;
  const vote = async (questionId: string) => {
    if (!voterId) return;
    setSubmitting(questionId); setError('');
    try {
      await submitVote(questionId, voterId);
      setState(await fetchQuestionState(voterId));
    } catch (voteError) { setError(voteError instanceof Error ? voteError.message : 'Could not submit vote.'); }
    finally { setSubmitting(null); }
  };
  return (
    <section className="question-section" id="questions" aria-labelledby="questions-title">
      <div className="question-header"><div><p className="section-kicker">02 / THINK &amp; DISCUSS</p><h2 id="questions-title">Which point should we unpack?</h2><p>Two short questions per lab, taken from the worksheet. Try the matching lab first, then vote for what still feels unclear.</p></div><div className="question-instruction"><span>1</span> vote per browser per question · totals and released answers refresh automatically</div></div>
      <div className="question-groups" role="tablist" aria-label="Question group">{questionGroups.map((group) => <button key={group} role="tab" aria-selected={activeGroup === group} className={activeGroup === group ? 'active' : ''} onClick={() => setActiveGroup(group)}><strong>{group}</strong><span>{questions.filter((question) => question.groupName === group).length}</span></button>)}</div>
      {error ? <p className="question-error" role="alert">{error}</p> : null}
      <output className={releasedCount ? 'answer-release-announcement published' : 'answer-release-announcement'} aria-live="polite" aria-atomic="true">
        {releasedCount ? `${releasedCount === questions.length ? 'All answers are' : `${releasedCount} of ${questions.length} answers are`} now available in the topic tabs below.` : state ? 'Answers will appear here when your instructor releases them. No refresh needed.' : ''}
      </output>
      <div className="question-grid">
        {filtered.map((question) => <article className={question.published ? 'question-card question-card-released' : 'question-card'} key={question.id}><div className="question-card-topline"><span>Q{String(question.sortOrder).padStart(2, '0')}</span><span>{question.difficulty}{state ? ` · ${question.votes} ${question.votes === 1 ? 'vote' : 'votes'}` : ''}</span></div><p className="question-prompt">{question.prompt}</p><div className="question-card-bottom"><Button type="button" aria-label={'Vote for question ' + question.sortOrder + ': ' + question.prompt} variant={question.hasVoted ? 'secondary' : 'default'} className={question.hasVoted ? 'vote-button voted' : 'vote-button'} disabled={!labsApiAvailable || question.hasVoted || submitting === question.id} onClick={() => vote(question.id)}>{submitting === question.id ? 'Sending…' : question.hasVoted ? 'Vote recorded' : 'I want this explained'}</Button><span className={question.published ? 'answer-status published' : 'answer-status'}>{question.published ? 'Answer released' : 'Think first'}</span></div>{question.published ? <InteractiveAnswer questionId={question.id} fallback={question.answer} /> : null}</article>)}
      </div>
    </section>
  );
}
