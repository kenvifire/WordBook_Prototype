const DEFAULT_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export class AIClientError extends Error {}

export interface AIClient {
  complete(prompt: string): Promise<string>;
}

export function createOpenAIClient(apiKey: string, model?: string, baseUrl?: string): AIClient {
  return {
    async complete(prompt: string): Promise<string> {
      const response = await fetch(baseUrl ?? DEFAULT_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model ?? DEFAULT_MODEL,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new AIClientError(`OpenAI request failed: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    },
  };
}
