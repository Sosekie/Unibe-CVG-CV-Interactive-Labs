import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { TeacherDashboard } from '@/components/teacher-dashboard';
import { TEACHER_EMAIL } from '@/lib/teacher';
export const dynamic = 'force-dynamic';
export default async function TeacherPage() {
  if (!TEACHER_EMAIL) notFound();
  const user = await requireChatGPTUser('/teacher');
  if (user.email.toLowerCase() !== TEACHER_EMAIL) notFound();
  return <TeacherDashboard />;
}
