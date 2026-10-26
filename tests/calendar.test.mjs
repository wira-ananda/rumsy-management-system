import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarDays,
  calendarDate,
  isoDay,
  matchesDate,
} from "../web/src/lib/utils/calendar.ts";
test("calendar handles leap days and year boundaries using local date values", () => {
  const leap = calendarDays(2024, 1);
  assert.equal(leap.filter((d) => d.month === 1).length, 29);
  assert.ok(leap.some((d) => d.value === "2024-02-29"));
  assert.equal(calendarDays(2025, 1).filter((d) => d.month === 1).length, 28);
  assert.ok(calendarDays(2026, 0).some((d) => d.value === "2025-12-29"));
  assert.ok(calendarDays(2026, 11).some((d) => d.value === "2027-01-01"));
  assert.equal(isoDay(calendarDate(2026, 1, 29)), "2026-03-01");
  assert.equal(isoDay(calendarDate(24, 1, 29)), "0024-02-29");
});
test("exact lead date and month intersect without matching another year", () => {
  assert.equal(matchesDate("2026-08-04", "2026-08", "2026-08-04"), true);
  assert.equal(matchesDate("2026-08-05", "2026-08", "2026-08-04"), false);
  assert.equal(matchesDate("2025-08-04", "2026-08", ""), false);
  assert.equal(matchesDate("2026-08-04", "", "2026-08-04"), true);
  assert.equal(matchesDate("", "2026-08", ""), false);
  assert.equal(matchesDate("", "", ""), true);
});
