import { getPilotMetrics } from '@/lib/metrics/pilotData';

export async function GET() {
  return Response.json(getPilotMetrics(), { status: 200 });
}
