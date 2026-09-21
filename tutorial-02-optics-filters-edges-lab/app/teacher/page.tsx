import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { TeacherDashboard } from '@/components/teacher-dashboard';

export const dynamic = 'force-dynamic';

export default async function TeacherPage() {
  const teacherEmail = process.env.TEACHER_EMAIL?.toLowerCase();
  if (!teacherEmail) notFound();
  const user = await requireChatGPTUser('/teacher');
  if (user.email.toLowerCase() !== teacherEmail) notFound();
  return <TeacherDashboard />;
}
