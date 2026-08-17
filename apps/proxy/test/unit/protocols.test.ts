import { describe, it, expect } from 'vitest';
import { openAIAdapter } from '../../src/protocols/openai.js';
import { anthropicAdapter } from '../../src/protocols/anthropic.js';

describe('Protocol Adapters', () => {
  describe('OpenAI Adapter', () => {
    it('should extract messages and modify content via setter', () => {
      const body = {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an assistant.' },
          { role: 'user', content: 'Hello from Satoshi' },
        ],
      };

      const fields = openAIAdapter.extractRequestFields(body);
      expect(fields).toHaveLength(2);
      expect(fields[1]?.text).toBe('Hello from Satoshi');

      fields[1]?.setter('Hello from [TOKEN_001]');
      expect(body.messages[1]?.content).toBe('Hello from [TOKEN_001]');
    });

    it('should extract delta content from streaming chunk', () => {
      const chunk = JSON.stringify({
        id: 'chatcmpl-123',
        choices: [{ index: 0, delta: { content: 'Nice to meet you' } }],
      });

      const extracted = openAIAdapter.extractStreamChunk(chunk);
      expect(extracted).not.toBeNull();
      expect(extracted?.textToProcess).toBe('Nice to meet you');

      const rebuilt = extracted?.rebuildChunk('Nice to meet [PERSON_001]');
      expect(rebuilt).toContain('Nice to meet [PERSON_001]');
    });
  });

  describe('Anthropic Adapter', () => {
    it('should extract system and messages content blocks', () => {
      const body = {
        model: 'claude-3-5-sonnet',
        system: 'System instructions',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'My email is bob@domain.com' },
            ],
          },
        ],
      };

      const fields = anthropicAdapter.extractRequestFields(body);
      expect(fields).toHaveLength(2);
      expect(fields[0]?.text).toBe('System instructions');
      expect(fields[1]?.text).toBe('My email is bob@domain.com');

      fields[1]?.setter('My email is [EMAIL_001]');
      expect(body.messages[0]?.content[0]?.text).toBe('My email is [EMAIL_001]');
    });

    it('should extract text_delta from Anthropic streaming chunk', () => {
      const chunk = JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Confirmed order for ' },
      });

      const extracted = anthropicAdapter.extractStreamChunk(chunk);
      expect(extracted).not.toBeNull();
      expect(extracted?.textToProcess).toBe('Confirmed order for ');
    });
  });
});
