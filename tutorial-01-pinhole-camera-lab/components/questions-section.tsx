"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getVoterId } from "@/lib/voter-session";
import { AnswerExplanation } from "@/components/answer-explanation";
import { DiscussionConvention } from "@/components/discussion-convention";
import { tutorialQuestions } from "@/lib/question-bank";
import { tutorialAnswers } from "@/lib/tutorial-answers";
import { fetchQuestionState, labsApiAvailable, submitVote, type QuestionState } from "@/lib/labs-api";

const REFRESH_INTERVAL_MS = 10000;
const NO_STATE: QuestionState = { votes: 0, hasVoted: false, published: false };

export function QuestionsSection() {
  const [voterId] = useState<string | null>(() => (typeof window === "undefined" ? null : getVoterId()));
  const [state, setState] = useState<Record<string, QuestionState> | null>(null);
  const [error, setError] = useState(labsApiAvailable ? "" : "Voting and released answers are not connected in this copy of the lab.");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const questions = useMemo(() => tutorialQuestions.map((question) => {
    const current = state?.[question.id] ?? NO_STATE;
    return { ...question, votes: current.votes, hasVoted: current.hasVoted, answerPublished: current.published, explanation: tutorialAnswers[question.id] };
  }), [state]);

  useEffect(() => {
    if (!voterId || !labsApiAvailable) return;
    let active = true;

    const refreshQuestions = async () => {
      try {
        const next = await fetchQuestionState(voterId);
        if (active) {
          setState(next);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load the votes.");
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshQuestions();
    };

    void refreshQuestions();
    const intervalId = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [voterId]);

  const vote = async (questionId: string) => {
    if (!voterId) return;
    setSubmitting(questionId);
    setError("");
    try {
      await submitVote(questionId, voterId);
      setState(await fetchQuestionState(voterId));
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : "Could not submit vote.");
    } finally {
      setSubmitting(null);
    }
  };

  const released = questions.filter((question) => question.answerPublished);

  return (
    <section className="question-section" aria-labelledby="discussion-title">
      <div className="question-header">
        <div>
          <p className="section-kicker">03 / THINK & DISCUSS</p>
          <h2 id="discussion-title">{released.length ? "Read, reflect, then discuss" : "Which point should we unpack?"}</h2>
          <p>{released.length ? "Read each key idea and its diagram at your own pace. Open the reasoning when you need it, and consider the question before we discuss together." : "Try the visualizer first. Then vote for every question you would like us to discuss in the tutorial."}</p>
        </div>
        <div className="question-instruction">Anonymous classroom poll. Your choices are remembered in this browser when storage is available. Totals and released answers refresh automatically.</div>
      </div>

      {error ? <p className="question-error" role="alert">{error}</p> : null}
      <DiscussionConvention />
      <div className="answer-release-announcement" role="status" aria-live="polite" aria-atomic="true">
        {released.length ? `${released.length === questions.length ? "All answers are" : `${released.length} of ${questions.length} answers are`} now available below. Take some time to read and reflect.` : state ? "Answers will appear here when your instructor releases them. No refresh needed." : ""}
      </div>
      {released.length ? <nav className="answer-jump-nav" aria-label="Jump to a released answer"><span>READ ANSWERS</span>{released.map((question) => <a key={question.id} href={`#discussion-${question.sortOrder}`} aria-label={`Read answer for question ${question.sortOrder}: ${question.prompt}`}>Q{String(question.sortOrder).padStart(2, "0")}</a>)}</nav> : null}
      <div className="question-grid">
        {questions.map((question) => (
          <article className={`question-card${question.answerPublished ? " question-card-released" : ""}`} key={question.id} id={`discussion-${question.sortOrder}`}>
            <div className="question-card-topline"><span>Q{String(question.sortOrder).padStart(2, "0")}</span><span>{state ? `${question.votes} ${question.votes === 1 ? "vote" : "votes"}` : ""}</span></div>
            <p className="question-prompt">{question.prompt}</p>
            <div className="question-card-bottom">
              <Button
                type="button"
                aria-label={`Vote for question ${question.sortOrder}: ${question.prompt}`}
                variant={question.hasVoted ? "secondary" : "default"}
                className={question.hasVoted ? "vote-button voted" : "vote-button"}
                disabled={!labsApiAvailable || question.hasVoted || submitting === question.id}
                onClick={() => vote(question.id)}
              >
                {submitting === question.id ? "Sending…" : question.hasVoted ? "Vote recorded" : "I want this explained"}
              </Button>
              {question.answerPublished ? <span className="answer-status published">Answer released</span> : <span className="answer-status">Think first</span>}
            </div>
            {question.answerPublished && question.explanation ? <AnswerExplanation explanation={question.explanation} questionNumber={question.sortOrder} /> : question.answerPublished ? <div className="released-answer"><span>ANSWER</span><p>{question.answer}</p></div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
