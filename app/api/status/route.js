import { getDubbingStatus } from "../../../lib/sarvam.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const jobId = new URL(request.url).searchParams.get("job")?.trim();
    if (!jobId || !/^[\w-]+$/.test(jobId)) throw new Error("Missing or invalid job ID.");
    return Response.json(await getDubbingStatus(jobId));
  } catch (error) {
    return Response.json({ error: error.message || "Could not check the job." }, { status: 400 });
  }
}
