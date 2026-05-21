export function isScheduledToday(dateStr?: string | null): boolean {
  if (!dateStr) return true; // no date → show in today's section
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isScheduledOverdue(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dDay < today;
}

/** Returns true if this order is visible today (today or overdue, not future) */
export function isVisibleToday(dateStr?: string | null): boolean {
  return isScheduledToday(dateStr) || isScheduledOverdue(dateStr);
}
