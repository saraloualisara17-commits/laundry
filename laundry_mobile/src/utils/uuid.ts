/**
 * RFC-4122 v4 UUID.
 * Uses Math.random — sufficient entropy for idempotency keys (not for security tokens).
 * Replaces `crypto.randomUUID()` which is unavailable in the Hermes JS engine.
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
