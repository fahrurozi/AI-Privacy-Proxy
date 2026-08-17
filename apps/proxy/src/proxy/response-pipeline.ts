import { Readable } from 'stream';
import { ProtocolAdapter } from '../protocols/types.js';
import { detokenizeText } from '../privacy/detokenizer.js';
import { SSEParser, SSEEvent } from '../streaming/sse-parser.js';
import { processStreamChunk, flushStreamPending } from '../streaming/streaming-detokenizer.js';
import { streamStateManager } from '../streaming/stream-state.js';
import { vault } from '../vault/redis-vault.js';

export async function processNonStreamingResponse(
  bodyStr: string,
  sessionId: string,
  adapter: ProtocolAdapter | null,
): Promise<string> {
  if (!bodyStr) {
    return bodyStr;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(bodyStr);
  } catch {
    // Plain text response, detokenize directly
    const { text } = await detokenizeText(bodyStr, sessionId, vault);
    return text;
  }

  if (adapter) {
    const fields = adapter.extractResponseFields(parsed);
    if (fields.length > 0) {
      for (const field of fields) {
        const { text } = await detokenizeText(field.text, sessionId, vault);
        field.setter(text);
      }
      return JSON.stringify(parsed);
    }
  }

  // Fallback: detokenize entire serialized JSON string safely
  const { text } = await detokenizeText(bodyStr, sessionId, vault);
  return text;
}

export function createStreamingResponseTransformer(
  upstreamStream: Readable,
  sessionId: string,
  requestId: string,
  adapter: ProtocolAdapter | null,
): Readable {
  const parser = new SSEParser();
  const activeStreamKeys = new Set<string>();

  const outputStream = new Readable({
    read() {},
  });

  upstreamStream.on('data', async (chunk: Buffer) => {
    const textChunk = chunk.toString('utf-8');
    const events = parser.push(textChunk);

    for (const event of events) {
      if (!event.data || event.data.trim() === '[DONE]') {
        outputStream.push(SSEParser.serializeEvent(event));
        continue;
      }

      if (adapter) {
        const extraction = adapter.extractStreamChunk(event.data);
        if (extraction) {
          const streamKey = `${requestId}:${extraction.streamKeySuffix}`;
          activeStreamKeys.add(streamKey);

          try {
            const processedText = await processStreamChunk(
              streamKey,
              extraction.textToProcess,
              sessionId,
              vault,
              streamStateManager,
            );

            event.data = extraction.rebuildChunk(processedText);
          } catch (err) {
            // Keep original if error
          }
        }
      } else {
        // Fallback: detokenize complete tokens in data directly
        try {
          const { text } = await detokenizeText(event.data, sessionId, vault);
          event.data = text;
        } catch {}
      }

      outputStream.push(SSEParser.serializeEvent(event));
    }
  });

  upstreamStream.on('end', async () => {
    // Flush any pending chunks in parser
    const remainingEvents = parser.flush();
    for (const event of remainingEvents) {
      outputStream.push(SSEParser.serializeEvent(event));
    }

    // Flush any remaining buffers in active stream keys
    for (const streamKey of activeStreamKeys) {
      try {
        await flushStreamPending(streamKey, sessionId, vault, streamStateManager);
      } catch {}
    }

    streamStateManager.cleanupRequest(requestId);
    outputStream.push(null);
  });

  upstreamStream.on('error', (err) => {
    streamStateManager.cleanupRequest(requestId);
    outputStream.destroy(err);
  });

  return outputStream;
}
