export function createId(prefix: string) {
  const random = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}
