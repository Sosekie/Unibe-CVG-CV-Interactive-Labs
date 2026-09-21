"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnswerExplanation } from "@/components/answer-explanation";
import type { DiscussionQuestion } from "@/lib/answer-types";
import { DiscussionConvention } from "@/components/discussion-convention";

const REFRESH_INTERVAL_MS = 5000;

type TeacherQuestion = DiscussionQuestion;

export function TeacherDashboard() {
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/questions", { cache: "no-store" });
      const data = (await response.json()) as { questions?: TeacherQuestion[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load results.");
      setQuestions(data.questions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refreshQuestions = async () => {
      try {
        const response = await fetch("/api/teacher/questions", { cache: "no-store" });
        const data = (await response.json()) as { questions?: TeacherQuestion[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load results.");
        if (active) {
          setQuestions(data.questions ?? []);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load results.");
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
  }, []);

  const updateAnswers = async (payload: { scope: "all"; published: boolean } | { questionId: string; published: boolean }) => {
    setChanging("scope" in payload ? "all" : payload.questionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/teacher/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update answer visibility.");
      setNotice(payload.published ? "Answers released. Open student pages update automatically within about 5 seconds." : "Answers hidden. Open student pages update automatically within about 5 seconds.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update answer visibility.");
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
        <span>INSTRUCTOR VIEW</span>
      </header>
      <section className="teacher-content">
        <div className="teacher-heading">
          <div><p className="section-kicker">LIVE CLASS SIGNAL</p><h1>Questions to discuss</h1><p>Use the ranked votes to decide what to explain next. Votes and released answers update automatically every few seconds.</p></div>
          <Button type="button" variant="outline" className="refresh-button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh now"}</Button>
        </div>
        {error ? <p className="question-error" role="alert">{error}</p> : null}
        <section className="classroom-release" aria-labelledby="release-heading">
          <div><p className="section-kicker">REVEAL → READ & REFLECT → DISCUSS</p><h2 id="release-heading">Ready to reveal the answers?</h2><p>Publish the full set, give students time to read the diagrams and reasoning, then lead the discussion. Preview each answer below before you release it.</p></div>
          <div className="classroom-release-controls">
            <span>{publishedCount} / {questions.length || "7"} answers visible to students</span>
            <Button type="button" className="publish-button release-all-button" onClick={() => updateAnswers({ scope: "all", published: true })} disabled={loading || changing !== null || questions.length === 0 || publishedCount === questions.length}>{changing === "all" ? "Updating…" : publishedCount === questions.length && questions.length ? "All answers published" : "Publish all answers"}</Button>
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
