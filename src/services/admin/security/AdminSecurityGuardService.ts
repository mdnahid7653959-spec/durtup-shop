export class AdminSecurityGuardService {
  private static FAILED_LOGIN_KEY = "admin_failed_logins";
  private static LOCKOUT_TIME_KEY = "admin_lockout_until";
  private static MAX_FAILED_ATTEMPTS = 5;
  private static LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Check if login attempt is currently locked out due to brute force protection
   */
  public static isLockedOut(): { locked: boolean; remainingSeconds: number } {
    const lockoutUntilStr = localStorage.getItem(this.LOCKOUT_TIME_KEY);
    if (!lockoutUntilStr) return { locked: false, remainingSeconds: 0 };

    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    const now = Date.now();

    if (now < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }

    // Lockout expired, clear keys
    localStorage.removeItem(this.LOCKOUT_TIME_KEY);
    localStorage.removeItem(this.FAILED_LOGIN_KEY);
    return { locked: false, remainingSeconds: 0 };
  }

  /**
   * Record a failed login attempt for rate limiting
   */
  public static recordFailedAttempt(): number {
    const current = parseInt(localStorage.getItem(this.FAILED_LOGIN_KEY) || "0", 10) + 1;
    localStorage.setItem(this.FAILED_LOGIN_KEY, current.toString());

    if (current >= this.MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      localStorage.setItem(this.LOCKOUT_TIME_KEY, lockoutUntil.toString());
    }

    return current;
  }

  /**
   * Clear failed login attempts on successful login
   */
  public static clearFailedAttempts(): void {
    localStorage.removeItem(this.FAILED_LOGIN_KEY);
    localStorage.removeItem(this.LOCKOUT_TIME_KEY);
  }

  /**
   * Validate strong enterprise password requirements
   */
  public static validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: "Password must contain at least one uppercase letter." };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: "Password must contain at least one number." };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, error: "Password must contain at least one special character." };
    }
    return { valid: true };
  }

  /**
   * XSS Input Sanitization
   */
  public static sanitizeInput(input: string): string {
    if (!input) return "";
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
}
