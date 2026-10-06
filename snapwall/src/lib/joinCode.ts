const CODE_PATTERN = /^[A-Z0-9]{6}$/;

// Accepts "snapwall://join/ABC123", any URL ending in /join/ABC123, or a bare code.
export function parseJoinCode(raw: string): string | null {
  const match = raw.trim().match(/join\/([A-Za-z0-9]{6})/);
  const code = (match ? match[1] : raw.trim()).toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}
