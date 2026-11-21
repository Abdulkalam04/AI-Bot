import assert from "node:assert";

// Inline copy or direct import of resolveContext logic for testing
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base, days) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function resolveContext(ctx, now = new Date()) {
  const iso = (ctx.iso || "").trim().toLowerCase();
  const dayOfWeek = now.getDay();

  if (iso === "today") {
    const todayStr = formatLocalDate(now);
    return { label: ctx.label, start: todayStr, end: todayStr };
  }

  if (iso === "tomorrow") {
    const tmrStr = formatLocalDate(addDays(now, 1));
    return { label: ctx.label, start: tmrStr, end: tmrStr };
  }

  if (iso === "weekend" || iso === "thisweekend") {
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
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const mon = addDays(now, daysToMonday);
    const sun = addDays(mon, 6);
    return {
      label: ctx.label,
      start: formatLocalDate(mon),
      end: formatLocalDate(sun),
    };
  }

  const match = ctx.iso?.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const dateStr = match[1];
    return {
      label: ctx.label,
      start: dateStr,
      end: dateStr,
    };
  }

  const fallbackStr = formatLocalDate(now);
  return { label: ctx.label, start: fallbackStr, end: fallbackStr };
}

console.log("Running unit-style sanity checks for resolveContext...");

// Test 1: Normal Weekday (Wednesday, Nov 18, 2026)
{
  const wed = new Date(2026, 10, 18, 12, 0, 0); // Month is 0-indexed: 10 = Nov
  assert.strictEqual(wed.getDay(), 3);

  const today = resolveContext({ label: "Today", iso: "today" }, wed);
  assert.deepStrictEqual(today, { label: "Today", start: "2026-11-18", end: "2026-11-18" });

  const tomorrow = resolveContext({ label: "Tomorrow", iso: "tomorrow" }, wed);
  assert.deepStrictEqual(tomorrow, { label: "Tomorrow", start: "2026-11-19", end: "2026-11-19" });

  const weekend = resolveContext({ label: "This weekend", iso: "weekend" }, wed);
  assert.deepStrictEqual(weekend, { label: "This weekend", start: "2026-11-21", end: "2026-11-22" });

  const nextWeek = resolveContext({ label: "Next week", iso: "next-week" }, wed);
  assert.deepStrictEqual(nextWeek, { label: "Next week", start: "2026-11-23", end: "2026-11-29" });
  console.log("✓ Test 1: Normal Weekday passed");
}

// Test 2: Saturday (Nov 21, 2026)
{
  const sat = new Date(2026, 10, 21, 12, 0, 0);
  assert.strictEqual(sat.getDay(), 6);

  const weekend = resolveContext({ label: "This weekend", iso: "weekend" }, sat);
  assert.deepStrictEqual(weekend, { label: "This weekend", start: "2026-11-21", end: "2026-11-22" });

  const nextWeek = resolveContext({ label: "Next week", iso: "next-week" }, sat);
  assert.deepStrictEqual(nextWeek, { label: "Next week", start: "2026-11-23", end: "2026-11-29" });
  console.log("✓ Test 2: Saturday passed");
}

// Test 3: Sundays (Sunday, Nov 22, 2026)
{
  const sun = new Date(2026, 10, 22, 12, 0, 0);
  assert.strictEqual(sun.getDay(), 0);

  const tomorrow = resolveContext({ label: "Tomorrow", iso: "tomorrow" }, sun);
  assert.deepStrictEqual(tomorrow, { label: "Tomorrow", start: "2026-11-23", end: "2026-11-23" });

  const weekend = resolveContext({ label: "This weekend", iso: "weekend" }, sun);
  assert.deepStrictEqual(weekend, { label: "This weekend", start: "2026-11-28", end: "2026-11-29" });

  // On Sunday, next week begins tomorrow Monday (+1 day, NOT +8 days!)
  const nextWeek = resolveContext({ label: "Next week", iso: "next-week" }, sun);
  assert.deepStrictEqual(nextWeek, { label: "Next week", start: "2026-11-23", end: "2026-11-29" });
  console.log("✓ Test 3: Sundays passed");
}

// Test 4: Year boundary (Thursday, Dec 31, 2026)
{
  const dec31 = new Date(2026, 11, 31, 12, 0, 0); // Dec 31
  assert.strictEqual(dec31.getDay(), 4);

  const today = resolveContext({ label: "Today", iso: "today" }, dec31);
  assert.deepStrictEqual(today, { label: "Today", start: "2026-12-31", end: "2026-12-31" });

  const tomorrow = resolveContext({ label: "Tomorrow", iso: "tomorrow" }, dec31);
  assert.deepStrictEqual(tomorrow, { label: "Tomorrow", start: "2027-01-01", end: "2027-01-01" });

  const weekend = resolveContext({ label: "This weekend", iso: "weekend" }, dec31);
  assert.deepStrictEqual(weekend, { label: "This weekend", start: "2027-01-02", end: "2027-01-03" });

  const nextWeek = resolveContext({ label: "Next week", iso: "next-week" }, dec31);
  assert.deepStrictEqual(nextWeek, { label: "Next week", start: "2027-01-04", end: "2027-01-10" });
  console.log("✓ Test 4: Year boundary Dec 31 passed");
}

// Test 5: Year boundary on Sunday (Sunday, Dec 27, 2026)
{
  const dec27 = new Date(2026, 11, 27, 12, 0, 0);
  assert.strictEqual(dec27.getDay(), 0);

  const nextWeek = resolveContext({ label: "Next week", iso: "next-week" }, dec27);
  // Next week starts Dec 28 and ends Jan 3 of next year
  assert.deepStrictEqual(nextWeek, { label: "Next week", start: "2026-12-28", end: "2027-01-03" });

  const weekend = resolveContext({ label: "This weekend", iso: "weekend" }, dec27);
  assert.deepStrictEqual(weekend, { label: "This weekend", start: "2027-01-02", end: "2027-01-03" });
  console.log("✓ Test 5: Year boundary on Sunday passed");
}

// Test 6: Pick a date (ISO date)
{
  const picked = resolveContext({ label: "Dec 25", iso: "2026-12-25" });
  assert.deepStrictEqual(picked, { label: "Dec 25", start: "2026-12-25", end: "2026-12-25" });
  console.log("✓ Test 6: Pick a date passed");
}

console.log("All resolveContext sanity checks passed successfully!");

