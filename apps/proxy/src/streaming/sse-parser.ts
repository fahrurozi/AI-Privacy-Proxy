export interface SSEEvent {
  id?: string | undefined;
  event?: string | undefined;
  data: string;
  retry?: number | undefined;
  raw: string;
}

export class SSEParser {
  private buffer = '';

  push(chunk: string): SSEEvent[] {
    this.buffer += chunk;
    const events: SSEEvent[] = [];

    // Normalize \r\n to \n
    this.buffer = this.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split on double newline which denotes end of SSE event
    let delimiterIndex: number;
    while ((delimiterIndex = this.buffer.indexOf('\n\n')) !== -1) {
      const rawBlock = this.buffer.slice(0, delimiterIndex);
      this.buffer = this.buffer.slice(delimiterIndex + 2);

      const parsed = this.parseEventBlock(rawBlock);
      if (parsed) {
        events.push(parsed);
      }
    }

    return events;
  }

  flush(): SSEEvent[] {
    const events: SSEEvent[] = [];
    if (this.buffer.trim().length > 0) {
      const parsed = this.parseEventBlock(this.buffer);
      if (parsed) {
        events.push(parsed);
      }
      this.buffer = '';
    }
    return events;
  }

  private parseEventBlock(block: string): SSEEvent | null {
    const lines = block.split('\n');
    let eventName: string | undefined = undefined;
    let id: string | undefined = undefined;
    let retry: number | undefined = undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':') || line.trim() === '') {
        // Comment or empty line
        continue;
      }

      const colonIndex = line.indexOf(':');
      let field = line;
      let value = '';

      if (colonIndex !== -1) {
        field = line.slice(0, colonIndex);
        value = line.slice(colonIndex + 1);
        if (value.startsWith(' ')) {
          value = value.slice(1);
        }
      }

      switch (field) {
        case 'event':
          eventName = value;
          break;
        case 'data':
          dataLines.push(value);
          break;
        case 'id':
          id = value;
          break;
        case 'retry':
          const parsedRetry = parseInt(value, 10);
          if (!isNaN(parsedRetry)) retry = parsedRetry;
          break;
      }
    }

    if (dataLines.length === 0 && !eventName && !id) {
      return null;
    }

    return {
      event: eventName,
      id,
      retry,
      data: dataLines.join('\n'),
      raw: block,
    };
  }

  static serializeEvent(evt: SSEEvent): string {
    let result = '';
    if (evt.event) {
      result += `event: ${evt.event}\n`;
    }
    if (evt.id) {
      result += `id: ${evt.id}\n`;
    }
    if (evt.retry !== undefined) {
      result += `retry: ${evt.retry}\n`;
    }
    const lines = evt.data.split('\n');
    for (const line of lines) {
      result += `data: ${line}\n`;
    }
    result += '\n';
    return result;
  }
}
