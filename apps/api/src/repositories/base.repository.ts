export class VersionConflictError extends Error {
  public constructor(
    public readonly expected: number,
    public readonly actual: number
  ) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
  }
}

export function assertVersion(current: number, expected: number): void {
  if (current !== expected) {
    throw new VersionConflictError(expected, current);
  }
}
