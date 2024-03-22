import semver from 'semver';

/**
 * A dependency specification parsed from a `package.json` file.
 */
export type WorkspaceDependencySpec =
  | {
    /**
     * The spec type.
     */
    readonly type: 'npm' | 'workspace';
    /**
     * The unmodified `package.json` dependencies map value.
     */
    readonly raw: string;
    /**
     * The name of the npm package.
     */
    readonly name: string;
    /**
     * The required version range for the package. This could be a semver
     * range, a tag, or a single `^` or `~` character (for `workspace` types).
     */
    readonly range: string;
  }
  | {
    /**
     * The spec type.
     */
    readonly type: 'url';
    /**
     * The unmodified `package.json` dependencies map value.
     */
    readonly raw: string;
    /**
     * The URL protocol.
     */
    readonly protocol: string;
    /**
     * Everything that follows the protocol prefix.
     */
    readonly suffix: string;
  };

/**
 * Get the dependency spec for a dependency key/value pair from a
 * `package.json` file dependency map.
 */
export const getWorkspaceDependencySpec = (id: string, raw: string): WorkspaceDependencySpec => {
  const [, protocol = '', suffix = ''] = raw.match(/^(?:([^:]*):)?(.*)$/u)!;

  if (protocol === 'npm' || protocol === 'workspace') {
    const [, name = id, range = ''] = suffix.match(/^(?:((?:@[^@/]+\/)?[^@/]+)@)?(.*)$/u)!;

    return { type: protocol, raw, name, range };
  }
  else if (!protocol) {
    // Simple semver spec.
    if (semver.validRange(suffix)) {
      return { type: 'npm', raw, name: id, range: suffix };
    }

    // Implicit file protocol URL.
    if (/^[./~]/u.test(suffix)) {
      return { type: 'url', raw, protocol: 'file', suffix };
    }

    // Implicit git protocol URL.
    if (/^[^/]+\/[^/]+/u.test(suffix)) {
      return { type: 'url', raw, protocol: 'git', suffix: `github.com/${suffix}` };
    }

    // Probably a tag.
    return { type: 'npm', raw, name: id, range: suffix };
  }
  // Other URL types.
  else if (suffix) {
    return { type: 'url', raw, protocol, suffix };
  }

  throw new Error(`invalid dependency spec "${raw}"`);
};
