import { ExtractedField, ProtocolAdapter } from './types.js';

export class AnthropicAdapter implements ProtocolAdapter {
  type = 'anthropic' as const;

  matches(url: string, headers: Record<string, string | string[] | undefined>, _body: any): boolean {
    if (url.includes('/chat/completions') || url.includes('/completions') || url.includes('/models')) {
      return false;
    }
    const isAnthropicUrl = url.includes('/v1/messages') || url.includes('/v1/complete');
    const hasAnthropicHeader =
      Boolean(headers['anthropic-version']) ||
      Boolean(headers['anthropic-beta']);
    return isAnthropicUrl || hasAnthropicHeader;
  }

  extractRequestFields(body: any): ExtractedField[] {
    const fields: ExtractedField[] = [];
    if (!body || typeof body !== 'object') return fields;

    // system prompt
    if (typeof body.system === 'string') {
      fields.push({
        path: 'system',
        text: body.system,
        setter: (newText: string) => {
          body.system = newText;
        },
      });
    } else if (Array.isArray(body.system)) {
      body.system.forEach((part: any, idx: number) => {
        if (part && typeof part.text === 'string') {
          fields.push({
            path: `system[${idx}].text`,
            text: part.text,
            setter: (newText: string) => {
              part.text = newText;
            },
          });
        }
      });
    }

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
          msg.content.forEach((block: any, blockIdx: number) => {
            if (block?.type === 'text' && typeof block.text === 'string') {
              fields.push({
                path: `messages[${idx}].content[${blockIdx}].text`,
                text: block.text,
                setter: (newText: string) => {
                  block.text = newText;
                },
              });
            }
          });
        }
      });
    }

    return fields;
  }

  extractResponseFields(body: any): ExtractedField[] {
    const fields: ExtractedField[] = [];
    if (!body || typeof body !== 'object') return fields;

    if (Array.isArray(body.content)) {
      body.content.forEach((block: any, idx: number) => {
        if (block?.type === 'text' && typeof block.text === 'string') {
          fields.push({
            path: `content[${idx}].text`,
            text: block.text,
            setter: (newText: string) => {
              block.text = newText;
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
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      const index = parsed.index ?? 0;

      if (parsed.type === 'content_block_delta' && parsed.delta) {
        if (parsed.delta.type === 'text_delta' && typeof parsed.delta.text === 'string') {
          return {
            streamKeySuffix: `block:${index}:text_delta`,
            textToProcess: parsed.delta.text,
            rebuildChunk: (detokenizedText: string) => {
              parsed.delta.text = detokenizedText;
              return JSON.stringify(parsed);
            },
          };
        }
        if (parsed.delta.type === 'thinking_delta' && typeof parsed.delta.thinking === 'string') {
          return {
            streamKeySuffix: `block:${index}:thinking_delta`,
            textToProcess: parsed.delta.thinking,
            rebuildChunk: (detokenizedText: string) => {
              parsed.delta.thinking = detokenizedText;
              return JSON.stringify(parsed);
            },
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const anthropicAdapter = new AnthropicAdapter();
