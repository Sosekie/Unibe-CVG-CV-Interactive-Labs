'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherDashboard } from '@/components/teacher-dashboard';
import { labsApiAvailable, serverTeacherSessionState, signOutTeacher, subscribeTeacherSession, teacherSessionState, teacherSignInUrl } from '@/lib/labs-api';

// The teacher page is static. Instructors sign in with GitHub on the course server;
// the server checks the account against its instructor list on every request.
export function TeacherApp() {
  const { session, message, ready } = useSyncExternalStore(subscribeTeacherSession, teacherSessionState, serverTeacherSessionState);
  const signOut = useCallback((reason?: 'expired') => {
    signOutTeacher(reason === 'expired' ? 'Your sign-in has expired or was withdrawn. Please sign in again.' : 'You are signed out.');
  }, []);

  if (session) return <TeacherDashboard session={session} onSignOut={signOut} />;
  return (
    <main className="teacher-shell">
      <header className="teacher-topbar"><Link href="/">← Back to the lab</Link><span>INSTRUCTOR VIEW</span></header>
      <section className="teacher-content">
        <div className="teacher-signin">
          <p className="section-kicker">INSTRUCTORS ONLY</p>
          <h1>Sign in to see the votes</h1>
          <p>Course instructors sign in with their GitHub account to see which questions students want explained and to publish the prepared answers.</p>
          {message ? <output className="teacher-signin-message">{message}</output> : null}
          {labsApiAvailable
            ? <Button disabled={!ready} onClick={() => window.location.assign(teacherSignInUrl())}><LogIn size={16} /> Sign in with GitHub</Button>
            : <output className="teacher-signin-message">This copy of the lab is not connected to the course server.</output>}
        </div>
      </section>
    </main>
  );
}
