export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatTime(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return "";
  try {
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function isOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  try {
    const today = new Date().toISOString().split("T")[0];
    return dateString < today;
  } catch {
    return false;
  }
}
