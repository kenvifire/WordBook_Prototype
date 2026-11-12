/**
 * Models sometimes wrap JSON replies in a markdown code fence (```json ... ```)
 * despite being told not to. Strip a single surrounding fence, if present, so
 * the body can be passed to JSON.parse. Unfenced input is returned trimmed.
 */
export function stripCodeFence(response: string): string {
  const trimmed = response.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}
