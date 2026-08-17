import { describe, it, expect } from 'vitest';
import { SSEParser } from '../../src/streaming/sse-parser.js';

describe('SSEParser', () => {
  it('should parse a single complete SSE event', () => {
    const parser = new SSEParser();
    const events = parser.push('data: {"text":"hello"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0]?.data).toBe('{"text":"hello"}');
  });

  it('should parse event split across TCP chunks', () => {
    const parser = new SSEParser();
    const events1 = parser.push('event: message\ndata: {"choices":[');
    expect(events1).toHaveLength(0);

    const events2 = parser.push('{"delta":{"content":"Hi"}}]}\n\n');
    expect(events2).toHaveLength(1);
    expect(events2[0]?.event).toBe('message');
    expect(events2[0]?.data).toBe('{"choices":[{"delta":{"content":"Hi"}}]}');
  });

  it('should parse multiple events in a single chunk', () => {
    const parser = new SSEParser();
    const raw = 'data: first\n\ndata: second\n\n';
    const events = parser.push(raw);
    expect(events).toHaveLength(2);
    expect(events[0]?.data).toBe('first');
    expect(events[1]?.data).toBe('second');
  });

  it('should parse multi-line data fields according to WHATWG spec', () => {
    const parser = new SSEParser();
    const raw = 'data: line 1\ndata: line 2\n\n';
    const events = parser.push(raw);
    expect(events).toHaveLength(1);
    expect(events[0]?.data).toBe('line 1\nline 2');
  });

  it('should correctly serialize SSEEvent back to wire format', () => {
    const serialized = SSEParser.serializeEvent({
      event: 'delta',
      id: 'evt_123',
      data: '{"content":"test"}',
      raw: '',
    });
    expect(serialized).toBe('event: delta\nid: evt_123\ndata: {"content":"test"}\n\n');
  });
});
