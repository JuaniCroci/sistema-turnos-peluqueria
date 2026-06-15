export const flattenRow = <T>(row: Record<string, unknown>, prefix = ''): T => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenRow(value as Record<string, unknown>, `${prefix}${key}_`),
      );
    } else {
      result[`${prefix}${key}`] = value;
    }
  }
  return result as unknown as T;
};
