import { translateWord } from '@/lib/translate/mymemory';
import { createCardIfMissing } from '@/lib/store/cardStore';
import { normalizeToken } from '@/lib/text/tokenize';

export async function POST(request: Request) {
  const { sectionId, token } = (await request.json()) as {
    sectionId: string;
    token: string;
    sentence: string;
  };

  const translation = await translateWord(token);
  const card = createCardIfMissing(sectionId, normalizeToken(token));

  return Response.json(
    { translation: translation.translatedText, card },
    { status: 200 }
  );
}
