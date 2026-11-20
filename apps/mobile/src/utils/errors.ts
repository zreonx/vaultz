/**
 * Utility to convert raw errors, network failures, and API errors into calm,
 * professional, user-friendly messages for mobile display.
 */
export function getFriendlyErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!err) {
    return fallback;
  }

  if (typeof err === "string") {
    return cleanMessage(err);
  }

  if (err instanceof Error) {
    return cleanMessage(err.message);
  }

  return fallback;
}

function cleanMessage(raw: string): string {
  if (!raw) return "An unexpected error occurred. Please try again.";

  // Strip technical network/driver prefixes
  if (
    raw.includes("Network request failed") ||
    raw.includes("Failed to fetch") ||
    raw.includes("Cannot connect to Vaultz API")
  ) {
    return "Unable to connect. Please check your internet connection.";
  }

  if (raw.includes("AbortError") || raw.includes("timed out")) {
    return "The request took too long. Please check your connection and try again.";
  }

  if (raw.includes("JSON Parse error") || raw.includes("Unexpected token")) {
    return "Received an unexpected response from the server. Please try again.";
  }

  // Strip database constraint codes
  if (raw.includes("23505") || raw.includes("unique constraint")) {
    return "A record with this information already exists.";
  }

  if (raw.includes("23503") || raw.includes("foreign key")) {
    return "A referenced item could not be found.";
  }

  return raw;
}
