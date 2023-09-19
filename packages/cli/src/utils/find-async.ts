/**
 * Find the first value in an array that matches the async predicate.
 * The predicate is executed in parallel for each value.
 */
export const findAsync = async <TValues extends readonly any[]>(
  values: TValues,
  predicate: (value: TValues[number], index: number, obj: TValues) => Promise<unknown>,
): Promise<TValues[number] | undefined> => {
  return await Promise.all(
    values.map(async (value, index) => ({ value, isMatch: await predicate(value, index, values) })),
  ).then((entries) => entries.find((entry) => entry.isMatch)?.value);
};
