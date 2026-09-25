import { NextRequest } from 'next/server';
import { getStudentQuestions } from '@/lib/tutorial-questions';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const voterId = request.nextUrl.searchParams.get('voter')?.slice(0, 80);
  try { return Response.json({ questions: await getStudentQuestions(voterId) }); }
  catch { return Response.json({ error: 'Could not load questions.' }, { status: 500 }); }
}
