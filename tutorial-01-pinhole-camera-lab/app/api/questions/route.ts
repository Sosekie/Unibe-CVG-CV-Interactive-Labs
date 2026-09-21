import { NextRequest } from "next/server";
import { getStudentQuestions } from "@/lib/tutorial-questions";
import { DISCUSSION_CONVENTION } from "@/lib/discussion-convention";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const voterId = request.nextUrl.searchParams.get("voter")?.slice(0, 80);
  try {
    return Response.json({ convention: DISCUSSION_CONVENTION, questions: await getStudentQuestions(voterId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load questions." }, { status: 500 });
  }
}
