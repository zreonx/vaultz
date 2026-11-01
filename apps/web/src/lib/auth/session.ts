/**
 * Authentication session foundation (Milestone 2).
 * Security Rule: Never store authentication tokens in browser localStorage.
 * Authentication will use HttpOnly, Secure cookies managed by the ASP.NET Core backend.
 */
export interface AuthSessionState {
  isAuthenticated: boolean;
  milestoneNote: string;
}

export function getInitialAuthSessionState(): AuthSessionState {
  return {
    isAuthenticated: false,
    milestoneNote: "Authentication & User Management is scheduled for Milestone 2.",
  };
}
