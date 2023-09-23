import { type PackageJsonBase } from '../utils/package-json.js';

export interface WorkspacePackage extends PackageJsonBase {
  readonly dir: string;
  readonly name: string;
  readonly version: string;
}
