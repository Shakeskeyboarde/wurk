import { type JsonAccessor } from '@wurk/json';

export interface SpawnResult {
  readonly stdout: Buffer;
  readonly stdoutText: string;
  readonly stdoutJson: JsonAccessor;
  readonly stderr: Buffer;
  readonly stderrText: string;
  readonly stderrJson: JsonAccessor;
  readonly combined: Buffer;
  readonly combinedText: string;
  readonly exitCode: number;
  readonly signalCode: NodeJS.Signals | null;
  readonly ok: boolean;
}
