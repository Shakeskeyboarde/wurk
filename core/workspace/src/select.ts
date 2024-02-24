import { minimatch } from 'minimatch';

import { type Workspace } from './workspace.js';

export interface SelectResult {
  readonly isSelected: boolean;
  readonly includeDependencies?: boolean;
  readonly includeDependents?: boolean;
}

export type SelectPredicate = (
  workspace: Workspace,
) => SelectResult | boolean | null;

export type SelectCondition =
  | string
  | SelectPredicate
  | readonly (string | SelectPredicate)[];

export const select = (
  workspaces: Iterable<Workspace>,
  condition: SelectCondition,
): Map<Workspace, boolean> => {
  const matchers = createMatchers(condition);
  const selected = new Map<Workspace, boolean>();

  for (const workspace of workspaces) {
    for (const match of matchers) {
      const result = match(workspace);

      if (result == null) continue;

      selected.set(workspace, result.isSelected);

      if (result.includeDependencies) {
        workspace
          .getDependencyLinks({ recursive: true })
          .forEach((link) => (link.dependency.isSelected = result.isSelected));
      }

      if (result.includeDependents) {
        workspace
          .getDependentLinks({ recursive: true })
          .forEach((link) => (link.dependent.isSelected = result.isSelected));
      }
    }
  }

  return selected;
};

const createMatchers = (
  condition: SelectCondition,
): ((workspace: Workspace) => Required<SelectResult> | null)[] => {
  const matchers: ((workspace: Workspace) => Required<SelectResult> | null)[] =
    [];
  const conditions = (Array.isArray(condition) ? condition : [condition]) as (
    | string
    | SelectPredicate
  )[];

  conditions.forEach((value: string | SelectPredicate) => {
    if (typeof value === 'string') {
      matchers.push(createExpressionMatcher(value));
      return;
    }

    matchers.push(
      ((predicate: SelectPredicate, workspace: Workspace) => {
        const result = predicate(workspace);

        if (result == null) {
          return null;
        }

        if (typeof result === 'boolean') {
          return {
            isSelected: result,
            includeDependencies: false,
            includeDependents: false,
          };
        }

        return {
          isSelected: result.isSelected,
          includeDependencies: result.includeDependencies ?? false,
          includeDependents: result.includeDependents ?? false,
        };
      }).bind(null, value),
    );
  });

  return matchers;
};

const createExpressionMatcher = (
  expression: string,
): ((workspace: Workspace) => Required<SelectResult> | null) => {
  const [, leadingEllipses, scope = '', pattern = '', trailingEllipses] =
    expression.match(/^(\.{3})?(?:([^:]*):)?(.*?)(\.{3})?$/u)!;
  const [, negated, scopeName = ''] = scope.match(/^(not)?(.*)$/u)!;
  const isSelected = !negated;
  const includeDependencies = Boolean(leadingEllipses);
  const includeDependents = Boolean(trailingEllipses);

  let match: (workspace: Workspace) => boolean;

  switch (scopeName) {
    case '':
    case 'n':
    case 'name':
      match = ((
        predicate: (value: string) => boolean,
        workspace: Workspace,
      ) => {
        return predicate(workspace.name);
      }).bind(null, minimatch.filter(pattern));
      break;
    case 'k':
    case 'keyword':
      match = ((
        predicate: (value: string) => boolean,
        workspace: Workspace,
      ) => {
        return workspace.config
          .at('keywords')
          .as('array', [] as unknown[])
          .filter((value): value is string => typeof value === 'string')
          .some(predicate);
      }).bind(null, minimatch.filter(pattern));
      break;
    case 'd':
    case 'dir':
    case 'directory':
      match = ((
        predicate: (value: string) => boolean,
        workspace: Workspace,
      ) => {
        return predicate(workspace.relativeDir);
      }).bind(null, minimatch.filter(pattern));
      break;
    case 'p':
    case 'private':
      match = (workspace) =>
        String(workspace.isPrivate) === pattern.toLocaleLowerCase();
      break;
    default:
      throw new Error(`invalid expression scope "${scope}"`);
  }

  return (workspace) =>
    match(workspace)
      ? { isSelected, includeDependencies, includeDependents }
      : null;
};
