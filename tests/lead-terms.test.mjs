import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dpPercent,
  dpRupiah,
  leadTermsError,
  leadDpAmount,
  leadNeedCategory,
  leadNeedDetail,
  leadNeedLabel,
} from "../shared/lead-terms.ts";
test("rupiah and percentage remain consistent for arbitrary amounts, zero RAB and minimum DP", () => {
  const base = {
    estRab: 500000000,
    dp: 20,
    dpAmount: 100000000,
    margin: 8,
    tenorYears: 3,
    collateral: "Non-SHM",
    need: "Rumah",
  };
  assert.equal(leadTermsError(base), null);
  for (const amount of [100000000, 123456789, 200000000, 500000000]) {
    const dp = dpPercent(base.estRab, amount);
    assert.equal(dpRupiah(base.estRab, dp), amount);
    assert.equal(leadTermsError({ ...base, dp, dpAmount: amount }), null);
  }
  assert.equal(dpPercent(0, 20), 0);
  assert.equal(leadTermsError({ ...base, estRab: 0, dpAmount: 0 }), null);
  assert.ok(leadTermsError({ ...base, dp: 19.99, dpAmount: 99950000 }));
  assert.ok(leadTermsError({ ...base, estRab: Infinity }));
  assert.ok(leadTermsError({ ...base, dpAmount: NaN }));
  assert.equal(
    leadDpAmount({ estRab: 500000000, dp: 20, estGambar: 7000000 }),
    100000000,
  );
  assert.equal(
    leadTermsError({ ...base, need: "Other", needDetail: "" }),
    null,
  );
});
test("legacy needs are presented as Other without losing the original description", () => {
  const old = { need: "Ruko 2 Lantai" };
  assert.equal(leadNeedCategory(old), "Other");
  assert.equal(leadNeedDetail(old), "Ruko 2 Lantai");
  assert.equal(leadNeedLabel(old), "Other — Ruko 2 Lantai");
  assert.deepEqual(old, { need: "Ruko 2 Lantai" });
  assert.equal(leadNeedLabel({ need: "Other", needDetail: "" }), "Other");
  assert.equal(leadNeedCategory({ need: "Rumah" }), "Rumah");
});
