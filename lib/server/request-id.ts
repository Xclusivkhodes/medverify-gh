const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function acceptRequestId(header: string | null | undefined): string {
  const value = header?.trim() ?? "";
  if (UUID.test(value)) return value;
  return crypto.randomUUID();
}
