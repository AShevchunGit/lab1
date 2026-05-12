import { Request } from 'express';

// Passport's isAuthenticated is a type-predicate; this cast satisfies TypeScript in tests
export function setTestUser(req: Request, user: object | null): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = user;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).isAuthenticated = () => !!user;
}
