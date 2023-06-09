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
    this.#send(this.#decoder.write(chunk), false);
    callback();
  }

  _flush(callback?: TransformCallback): void {
    this.#send(this.#decoder.end(), true);
    callback?.();
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    this.#isDestroyed = true;
    clearTimeout(this.#timeout);
    process.removeListener('exit', this.#onExit);
    super._destroy(error, callback);
  }

  readonly #send = (chunk: string, flush: boolean): void => {
    if (!chunk || this.#isDestroyed) return;

    clearTimeout(this.#timeout);

    const value = this.#buffer + chunk;
    const rx = /(.*?)\r?\n/gu;
    let line: RegExpExecArray | null;
    let lastIndex = 0;

    while ((line = rx.exec(value))) {
      line[1]?.split('\r').forEach((part) => this.push(part));
      lastIndex = rx.lastIndex;
    }

    const trailer = value.slice(lastIndex);

    if (flush && trailer) {
      this.push(trailer);
      this.#buffer = '';
    } else {
      this.#buffer = trailer;

      if (this.#buffer) {
        this.#timeout = setTimeout(() => {
          this.#timeout = undefined;
          this.flush();
        }, 10);
      }
    }
  };

  readonly #onExit = (): void => {
    this.destroy();
  };
}
