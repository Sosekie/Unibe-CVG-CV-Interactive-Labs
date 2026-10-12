"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnswerExplanation } from "@/components/answer-explanation";
import { DiscussionConvention } from "@/components/discussion-convention";
import { tutorialQuestions } from "@/lib/question-bank";
import { tutorialAnswers } from "@/lib/tutorial-answers";
import { fetchTeacherState, LabsApiError, updateRelease, type TeacherQuestionState, type TeacherSession } from "@/lib/labs-api";

const REFRESH_INTERVAL_MS = 5000;

export function TeacherDashboard({ session, onSignOut }: { session: TeacherSession; onSignOut: (reason?: "expired") => void }) {
  const [state, setState] = useState<Record<string, TeacherQuestionState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const questions = useMemo(() => tutorialQuestions
    .map((question) => ({ ...question, explanation: tutorialAnswers[question.id], votes: state?.[question.id]?.votes ?? 0, answerPublished: state?.[question.id]?.published ?? false }))
    .sort((first, second) => second.votes - first.votes || first.sortOrder - second.sortOrder), [state]);

  const showError = useCallback((loadError: unknown) => {
    if (loadError instanceof LabsApiError && loadError.status === 401) onSignOut("expired");
    else setError(loadError instanceof Error ? loadError.message : "Could not load results.");
  }, [onSignOut]);

  const load = async () => {
    setError("");
    try {
      setState((await fetchTeacherState(session)).questions);
    } catch (loadError) {
      showError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refreshQuestions = async () => {
      try {
        const next = await fetchTeacherState(session);
        if (active) {
          setState(next.questions);
          setError("");
        }
      } catch (loadError) {
        if (active) showError(loadError);
      } finally {
        if (active) setLoading(false);
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
  }, [session, showError]);

  const updateAnswers = async (payload: { scope: "all"; published: boolean } | { questionId: string; published: boolean }) => {
    setChanging("scope" in payload ? "all" : payload.questionId);
    setError("");
    setNotice("");
    try {
      await updateRelease(session, payload);
      setNotice(payload.published ? "Answers released. Open student pages update automatically within about 10 seconds." : "Answers hidden. Open student pages update automatically within about 10 seconds.");
      await load();
    } catch (updateError) {
      if (updateError instanceof LabsApiError && updateError.status === 401) onSignOut("expired");
      else setError(updateError instanceof Error ? updateError.message : "Could not update answer visibility.");
    } finally {
      setChanging(null);
    }
  };

  const highestVotes = Math.max(0, ...questions.map((question) => question.votes));
  const publishedCount = questions.filter((question) => question.answerPublished).length;

  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <Link className="teacher-brand" href="/">← Pinhole Camera Lab</Link>
        <span className="teacher-account">INSTRUCTOR VIEW · {session.login}<button type="button" onClick={() => onSignOut()}><LogOut size={13} /> Sign out</button></span>
      </header>
      <section className="teacher-content">
        <div className="teacher-heading">
          <div><p className="section-kicker">LIVE CLASS SIGNAL</p><h1>Questions to discuss</h1><p>Use the ranked votes to decide what to explain next. Votes and released answers update automatically every few seconds.</p></div>
          <Button type="button" variant="outline" className="refresh-button" onClick={() => { setLoading(true); void load(); }} disabled={loading}>{loading ? "Refreshing…" : "Refresh now"}</Button>
        </div>
        {error ? <p className="question-error" role="alert">{error}</p> : null}
        <section className="classroom-release" aria-labelledby="release-heading">
          <div><p className="section-kicker">REVEAL → READ & REFLECT → DISCUSS</p><h2 id="release-heading">Ready to reveal the answers?</h2><p>Publish the full set, give students time to read the diagrams and reasoning, then lead the discussion. Preview each answer below before you release it.</p></div>
          <div className="classroom-release-controls">
            <span>{publishedCount} / {questions.length} answers visible to students</span>
            <Button type="button" className="publish-button release-all-button" onClick={() => updateAnswers({ scope: "all", published: true })} disabled={loading || changing !== null || publishedCount === questions.length}>{changing === "all" ? "Updating…" : publishedCount === questions.length ? "All answers published" : "Publish all answers"}</Button>
            <Button type="button" variant="outline" className="refresh-button" onClick={() => updateAnswers({ scope: "all", published: false })} disabled={loading || changing !== null || publishedCount === 0}>Hide all answers</Button>
          </div>
          <p className="classroom-release-notice" role="status" aria-live="polite">{notice || "Publishing changes what every student can see. Previewing below is visible only to you."}</p>
        </section>
        <div className="teacher-list">
          <DiscussionConvention />
          {questions.map((question, index) => (
            <article className="teacher-question" key={question.id}>
              <div className="rank-badge" aria-label={`Vote rank ${index + 1}`}>{index + 1}</div>
              <div className="teacher-question-body"><p className="teacher-question-number">Q{String(question.sortOrder).padStart(2, "0")} · {question.answerPublished ? "Visible to students" : "Not yet released"}</p><p className="teacher-prompt">{question.prompt}</p><p className="teacher-answer">{question.explanation?.conclusion ?? question.answer}</p></div>
              <div className="teacher-actions"><strong className={question.votes === highestVotes && highestVotes > 0 ? "top-votes" : ""}>{question.votes}</strong><span>votes</span><Button type="button" aria-label={`${question.answerPublished ? "Hide" : "Publish"} answer for question ${question.sortOrder}: ${question.prompt}`} variant={question.answerPublished ? "secondary" : "default"} className={question.answerPublished ? "publish-button unpublished" : "publish-button"} onClick={() => updateAnswers({ questionId: question.id, published: !question.answerPublished })} disabled={changing !== null}>{changing === question.id ? "Updating…" : question.answerPublished ? "Hide answer" : "Publish answer"}</Button></div>
              <details className="teacher-answer-preview"><summary>Preview student answer · Q{String(question.sortOrder).padStart(2, "0")}</summary>{question.explanation ? <AnswerExplanation explanation={question.explanation} questionNumber={question.sortOrder} /> : <p>{question.answer}</p>}</details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
