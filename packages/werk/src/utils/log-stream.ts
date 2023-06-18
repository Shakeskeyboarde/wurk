import { Transform, type TransformCallback } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export class LogStream extends Transform {
  readonly #decoder = new StringDecoder('utf-8');

  #buffer = '';
  #timeout?: NodeJS.Timeout;
  #isFinalized = false;

  constructor() {
    super({
      decodeStrings: true,
      writableObjectMode: false,
      readableObjectMode: true,
    });

    process.setMaxListeners(process.getMaxListeners() + 1);
    process.on('exit', this.#finalize);
  }

  end(...args: [unknown?, (BufferEncoding | (() => void))?, (() => void)?]): this {
    if (this.#isFinalized) return this;
    if (args.length > 0) {
      this.write.call(this, ...(args as Parameters<this['write']>));
    }

    this.#send(true);

    return this;
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    if (this.#isFinalized) {
      throw new Error('LogStream.write() called after stream was finalized.');
    }

    super._write(chunk, encoding, callback);
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.#append(chunk);
    callback();
  }

  _flush(callback: TransformCallback): void {
    this.#send(true);
    callback();
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.#finalize();
    super._destroy(error, callback);
  }

  readonly #append = (chunk: Buffer): void => {
    if (this.#isFinalized || chunk.length === 0) return;

    this.#buffer += this.#decoder.write(chunk);

    // Flush completed lines if the buffer is getting too big.
    if (this.#buffer.length > 40_000) this.#send(false);

    // Delay flushing the buffer as long as we're receiving data, so that
    // related lines stay together.
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(() => this.#send(true), 10);
  };

  readonly #send = (flush: boolean): void => {
    if (this.#isFinalized) return;

    const value = this.#buffer + this.#decoder.end();
    this.#buffer = '';

    if (!value) return;

    // The exec() regex doesn't match "\r", because it could be half of an
    // incomplete "\r\n" line ending. If we match it here, we might end
    // up with an extra blank line.
    const rx = /(.*?)\r?\n/gu;
    let line: RegExpExecArray | null;
    let lastIndex = 0;

    while ((line = rx.exec(value))) {
      // Split on "\r" (which we now know is not followed by a "\n") in
      // case someone is trying to overwrite lines.
      line[1]?.split('\r').forEach((part) => this.push(part));
      lastIndex = rx.lastIndex;
    }

    if (lastIndex >= value.length) return;

    if (flush) {
      // If we're flushing, write the last unterminated line.
      this.push(value.slice(lastIndex));
    } else {
      this.#buffer = value.slice(lastIndex);
    }
  };

  readonly #finalize = (): void => {
    if (this.#isFinalized) return;

    try {
      this.#send(true);
      clearTimeout(this.#timeout);
      process.removeListener('exit', this.#finalize);
      process.setMaxListeners(process.getMaxListeners() - 1);
    } finally {
      this.#isFinalized = true;
    }
  };
}
