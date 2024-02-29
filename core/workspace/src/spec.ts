import semver from 'semver';

export type DependencySpec =
  | {
      /**
       * The spec type.
       */
      readonly type: 'tag';
      /**
       * The unmodified `package.json` dependencies map value.
       */
      readonly raw: string;
    }
  | {
      /**
       * The spec type.
       */
      readonly type: 'npm';
      /**
       * The unmodified `package.json` dependencies map value.
       */
      readonly raw: string;
      /**
       * The name of the npm package.
       */
      readonly name: string;
      /**
       * The required semver version range for the package. This is guaranteed
       * to be a valid semver range.
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

export const getSpec = (id: string, raw: string): DependencySpec => {
  const [, protocol = '', suffix = ''] = raw.match(/^(?:([^:]*):)?(.*)$/u)!;

  if ((!protocol || protocol === 'npm') && (!raw || semver.validRange(raw))) {
    return { type: 'npm', name: id, range: raw || '*', raw };
  }

  if (!protocol && /^[./~]/u.test(suffix)) {
    return { type: 'url', raw, protocol: 'file', suffix };
  }

  if (!protocol && /^[^/]+\/[^/]+/u.test(suffix)) {
    return {
      type: 'url',
      raw,
      protocol: 'git',
      suffix: `github.com/${suffix}`,
    };
  }

  if (!protocol) {
    return { type: 'tag', raw };
  }

  if (protocol) {
    return { type: 'url', raw, protocol, suffix };
  }

  throw new Error(`invalid dependency spec "${raw}"`);
};
