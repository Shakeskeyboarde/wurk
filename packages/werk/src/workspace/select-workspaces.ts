export interface WorkspaceFilters {
  readonly workspace?: readonly string[];
  readonly keyword?: readonly string[];
  readonly notKeyword?: readonly string[];
  readonly private?: boolean;
  readonly public?: boolean;
}

export const selectWorkspaces = (
  workspaces: Iterable<{
    readonly name: string;
    readonly private?: boolean;
    readonly keywords?: readonly string[];
    selected?: boolean;
  }>,
  filters: WorkspaceFilters,
): void => {
  for (const workspace of workspaces) {
    const isExcluded =
      Boolean(workspace.keywords?.some((keyword) => filters.notKeyword?.includes(keyword))) ||
      (workspace.private ? filters.private === false : filters.public === false);

    const isIncluded =
      !isExcluded &&
      ((!filters.workspace?.length && !filters.keyword?.length) ||
        Boolean(workspace.name != null && filters.workspace?.includes(workspace.name)) ||
        Boolean(workspace.keywords?.some((keyword) => filters.keyword?.includes(keyword))));

    if (isIncluded) Object.assign(workspace, { selected: true });
  }
};
