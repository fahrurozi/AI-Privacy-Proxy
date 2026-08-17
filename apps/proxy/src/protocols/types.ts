export type ProtocolType = 'openai' | 'anthropic' | 'unknown';

export interface ExtractedField {
  path: string; // e.g. "messages[0].content"
  text: string;
  setter: (newText: string) => void;
}

export interface ProtocolAdapter {
  type: ProtocolType;
  matches(url: string, headers: Record<string, string | string[] | undefined>, body: any): boolean;
  extractRequestFields(body: any): ExtractedField[];
  extractResponseFields(body: any): ExtractedField[];
  extractStreamChunk(eventData: string): {
    streamKeySuffix: string;
    textToProcess: string;
    rebuildChunk: (detokenizedText: string) => string;
  } | null;
}
