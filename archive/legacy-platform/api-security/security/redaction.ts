const sensitive = /password|secret|token|authorization|cookie/i;
export const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitive.test(key) ? '[REDACTED]' : redact(item),
      ]),
    );
  return value;
};
