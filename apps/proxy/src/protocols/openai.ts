import { ExtractedField, ProtocolAdapter } from './types.js';

export class OpenAIAdapter implements ProtocolAdapter {
  type = 'openai' as const;

  matches(url: string, _headers: Record<string, string | string[] | undefined>, _body: any): boolean {
    return (
      url.includes('/chat/completions') ||
      url.includes('/completions') ||
      url.includes('/v1/chat') ||
      url.includes('/v1/completions') ||
      url.includes('/models')
    );
  }

  extractRequestFields(body: any): ExtractedField[] {
    const fields: ExtractedField[] = [];
    if (!body || typeof body !== 'object') return fields;

    // messages array
    if (Array.isArray(body.messages)) {
      body.messages.forEach((msg: any, idx: number) => {
        if (!msg) return;
        if (typeof msg.content === 'string') {
          fields.push({
            path: `messages[${idx}].content`,
            text: msg.content,
            setter: (newText: string) => {
              msg.content = newText;
            },
          });
        } else if (Array.isArray(msg.content)) {
          msg.content.forEach((part: any, partIdx: number) => {
            if (part && part.type === 'text' && typeof part.text === 'string') {
              fields.push({
                path: `messages[${idx}].content[${partIdx}].text`,
                text: part.text,
                setter: (newText: string) => {
                  part.text = newText;
                },
              });
            }
          });
        }
      });
    }

    // single prompt
    if (typeof body.prompt === 'string') {
      fields.push({
        path: 'prompt',
        text: body.prompt,
        setter: (newText: string) => {
          body.prompt = newText;
        },
      });
    }

    return fields;
  }

  extractResponseFields(body: any): ExtractedField[] {
    const fields: ExtractedField[] = [];
    if (!body || typeof body !== 'object') return fields;

    if (Array.isArray(body.choices)) {
      body.choices.forEach((choice: any, idx: number) => {
        if (choice?.message?.content && typeof choice.message.content === 'string') {
          fields.push({
            path: `choices[${idx}].message.content`,
            text: choice.message.content,
            setter: (newText: string) => {
              choice.message.content = newText;
            },
          });
        }
        if (typeof choice?.text === 'string') {
          fields.push({
            path: `choices[${idx}].text`,
            text: choice.text,
            setter: (newText: string) => {
              choice.text = newText;
            },
          });
        }
      });
    }

    return fields;
  }

  extractStreamChunk(eventData: string): {
    streamKeySuffix: string;
    textToProcess: string;
    rebuildChunk: (detokenizedText: string) => string;
  } | null {
    const trimmed = eventData.trim();
    if (trimmed === '[DONE]' || !trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      const choice = parsed.choices?.[0];
      if (!choice) return null;

      const delta = choice.delta;
      if (!delta) return null;

      const choiceIndex = choice.index ?? 0;

      // Regular text content
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        return {
          streamKeySuffix: `choices:${choiceIndex}:delta.content`,
          textToProcess: delta.content,
          rebuildChunk: (detokenizedText: string) => {
            parsed.choices[0].delta.content = detokenizedText;
            return JSON.stringify(parsed);
          },
        };
      }

      // Reasoning content (deepseek / o1 style)
      if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
        return {
          streamKeySuffix: `choices:${choiceIndex}:delta.reasoning_content`,
          textToProcess: delta.reasoning_content,
          rebuildChunk: (detokenizedText: string) => {
            parsed.choices[0].delta.reasoning_content = detokenizedText;
            return JSON.stringify(parsed);
          },
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const openAIAdapter = new OpenAIAdapter();
