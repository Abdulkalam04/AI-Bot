export type ContextInput = {
  label: string;
  iso: string;
};

export type ResolvedContext = {
  label: string;
  start: string;
  end: string;
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

/**
 * Converts a UI context value ("today", "tomorrow", "weekend", "next-week", or ISO date)
 * to a resolved start and end ISO date string (YYYY-MM-DD) based on local time.
 */
export function resolveContext(
  ctx: ContextInput,
  now: Date = new Date()
): ResolvedContext {
  const iso = (ctx.iso || "").trim().toLowerCase();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (iso === "today") {
    const todayStr = formatLocalDate(now);
    return { label: ctx.label, start: todayStr, end: todayStr };
  }

  if (iso === "tomorrow") {
    const tmrStr = formatLocalDate(addDays(now, 1));
    return { label: ctx.label, start: tmrStr, end: tmrStr };
  }

  if (iso === "weekend" || iso === "thisweekend") {
    // The coming Saturday-Sunday
    // If today is Saturday (6), Saturday is today (0 days away)
    // If today is Sunday (0), coming Saturday is 6 days away
    // For Mon-Fri (1..5), Saturday is 6 - dayOfWeek days away
    const daysToSaturday = (6 - dayOfWeek + 7) % 7;
    const sat = addDays(now, daysToSaturday);
    const sun = addDays(sat, 1);
    return {
      label: ctx.label,
      start: formatLocalDate(sat),
      end: formatLocalDate(sun),
    };
  }

  if (iso === "next-week" || iso === "nextweek") {
    // Next Monday-Sunday
    // If today is Sunday (0), next Monday is tomorrow (1 day away)
    // For other days (1..6), next Monday is 8 - dayOfWeek days away
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const mon = addDays(now, daysToMonday);
    const sun = addDays(mon, 6);
    return {
      label: ctx.label,
      start: formatLocalDate(mon),
      end: formatLocalDate(sun),
    };
  }

  // If iso is an ISO date string (e.g. "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss")
  const match = ctx.iso?.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const dateStr = match[1];
    return {
      label: ctx.label,
      start: dateStr,
      end: dateStr,
    };
  }

  // Fallback to today
  const fallbackStr = formatLocalDate(now);
  return { label: ctx.label, start: fallbackStr, end: fallbackStr };
}

/*
 ============================================================================
 Unit-Style Sanity Checks
 ============================================================================

 1. Normal Weekday (Wednesday, Nov 18, 2026):
    - today:       { start: "2026-11-18", end: "2026-11-18" }
    - tomorrow:    { start: "2026-11-19", end: "2026-11-19" }
    - weekend:     { start: "2026-11-21", end: "2026-11-22" } (coming Sat-Sun)
    - next-week:   { start: "2026-11-23", end: "2026-11-29" } (next Mon-Sun)

 2. Saturday (Nov 21, 2026):
    - weekend:     { start: "2026-11-21", end: "2026-11-22" } (starts today!)
    - next-week:   { start: "2026-11-23", end: "2026-11-29" } (starts in 2 days)

 3. Sunday Behavior (Sunday, Nov 22, 2026):
    - tomorrow:    { start: "2026-11-23", end: "2026-11-23" } (Monday)
    - weekend:     { start: "2026-11-28", end: "2026-11-29" } (coming Saturday-Sunday, +6 days)
    - next-week:   { start: "2026-11-23", end: "2026-11-29" } (starts tomorrow Monday! +1 day, not +8)

 4. Year Boundary (Thursday, Dec 31, 2026):
    - today:       { start: "2026-12-31", end: "2026-12-31" }
    - tomorrow:    { start: "2027-01-01", end: "2027-01-01" } (rolls over year!)
    - weekend:     { start: "2027-01-02", end: "2027-01-03" } (rolls over year!)
    - next-week:   { start: "2027-01-04", end: "2027-01-10" } (rolls over year!)

 5. Year Boundary on Sunday (Sunday, Dec 27, 2026):
    - next-week:   { start: "2026-12-28", end: "2027-01-03" } (Monday in 2026 to Sunday in 2027)
    - weekend:     { start: "2027-01-02", end: "2027-01-03" } (coming Sat-Sun in 2027)

 6. Pick a Date:
    - custom ISO:  resolveContext({ label: "Dec 25", iso: "2026-12-25" })
                   => { start: "2026-12-25", end: "2026-12-25" }
 ============================================================================
*/

