import { Transform, type TransformCallback } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';

export class LogStream extends Transform {
  readonly #decoder = new StringDecoder('utf-8');

  #buffer = '';

  constructor() {
    super({
      autoDestroy: false,
      emitClose: false,
      decodeStrings: true,
      writableObjectMode: false,
      readableObjectMode: true,
    });
  }

  flush(): void {
    this.#update(this.#decoder.end());
    if (this.#buffer === '') return;
    this.push(this.#buffer);
    this.#buffer = '';
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.#update(this.#decoder.write(chunk));
    callback();
  }

  _flush(callback: TransformCallback): void {
    this.flush();
    callback();
  }

  readonly #update = (chunk: string): void => {
    const value = this.#buffer + chunk;
    const rx = /(.*?)\r?\n/gu;
    let line: RegExpExecArray | null;
    let lastIndex = 0;

    while ((line = rx.exec(value))) {
      line[1]?.split('\r').forEach((part) => this.push(part));
      lastIndex = rx.lastIndex;
    }

    this.#buffer = value.slice(lastIndex);
  };
}
