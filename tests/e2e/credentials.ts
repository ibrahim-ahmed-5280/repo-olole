/**
 * TEST-ONLY accounts, created exclusively in the throwaway *_e2e database by scripts/e2e-reset.ts.
 * They never exist in development or production databases.
 */
export const E2E_USERS = [
  { username: 'e2e-owner', role: 'owner' as const, password: 'E2e-Owner-Pass-123' },
  { username: 'e2e-reviewer', role: 'reviewer' as const, password: 'E2e-Reviewer-Pass-123' },
];
