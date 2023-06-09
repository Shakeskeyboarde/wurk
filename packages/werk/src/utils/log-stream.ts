import { Transform, type TransformCallback } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export class LogStream extends Transform {
  readonly #decoder = new StringDecoder('utf-8');

  #buffer = '';
  #timeout?: NodeJS.Timeout;
  #isDestroyed = false;

  constructor() {
    super({
      autoDestroy: false,
      emitClose: false,
      decodeStrings: true,
      writableObjectMode: false,
      readableObjectMode: true,
    });

    process.setMaxListeners(process.getMaxListeners() + 1);
    process.on('exit', this.#onExit);
  }

  flush(): void {
    this._flush();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.#send(chunk);
    callback();
  }

  _flush(callback?: TransformCallback): void {
    this.#sendImmediate();
    callback?.();
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.#isDestroyed = true;
    clearTimeout(this.#timeout);
    process.removeListener('exit', this.#onExit);
    super._destroy(error, callback);
  }

  readonly #send = (chunk: Buffer): void => {
    if (!chunk || this.#isDestroyed) return;

    this.#buffer += this.#decoder.write(chunk);
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(this.#sendImmediate, 10);
  };

  readonly #sendImmediate = (): void => {
    if (this.#isDestroyed) return;

    const value = this.#buffer + this.#decoder.end();
    this.#buffer = '';

    if (!value) return;

    const rx = /(.*?)\r?\n/gu;
    let line: RegExpExecArray | null;
    let lastIndex = 0;

    while ((line = rx.exec(value))) {
      line[1]?.split('\r').forEach((part) => this.push(part));
      lastIndex = rx.lastIndex;
    }

    if (lastIndex < value.length) {
      this.push(value.slice(lastIndex));
    }
  };

  readonly #onExit = (): void => {
    this.destroy();
  };
}
