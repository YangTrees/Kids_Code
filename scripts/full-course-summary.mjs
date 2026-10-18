/* global console, URL */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../artifacts/full-course/", import.meta.url);
const baseline = JSON.parse(
  await readFile(
    new URL("../docs/baselines/course-v3.json", import.meta.url),
    "utf8",
  ),
);
const ids = baseline.rows.map((row) => row.taskId);
const assessment = JSON.parse(
  await readFile(new URL("assessment.json", root), "utf8"),
);
assert.equal(assessment.records.length, 256);
const tasks = ids.map((taskId, index) => {
  const records = assessment.records.filter(
    (record) => record.taskId === taskId,
  );
  assert.deepEqual(
    records.map((record) => record.scenario),
    ["reference", "equivalent", "error", "repaired"],
  );
  assert.deepEqual(
    records.map((record) => record.complete),
    [true, true, false, true],
  );
  assert.ok(records.every((record) => record.complete === record.expected));
  assert.ok(records[2].missing.length > 0);
  assert.ok(records.every((record) => record.report.taskVersion === "4"));
  return { number: index + 1, taskId, scenarios: 4, passed: true };
});
const viewports = [];
for (const viewport of ["desktop-1366", "compact-1024", "ipad-landscape"]) {
  const stage = JSON.parse(
    await readFile(new URL("stage-" + viewport + ".json", root), "utf8"),
  );
  assert.deepEqual(
    stage.records.map((record) => record.taskId),
    ids,
  );
  assert.ok(
    stage.records.every((record) => record.passed),
    viewport,
  );
  const geometry = JSON.parse(
    await readFile(new URL("geometry-" + viewport + ".json", root), "utf8"),
  );
  assert.ok(geometry.length >= 17);
  assert.ok(geometry.every((record) => record.pass));
  assert.equal(
    geometry.filter((record) => record.check === "single-step-really-pauses")
      .length,
    1,
  );
  viewports.push({
    viewport,
    stageLessons: 64,
    geometryChecks: geometry.length,
    passed: true,
  });
}
const summary = {
  generatedAt: new Date().toISOString(),
  scope:
    "64 current lessons; automated acceptance, not real-device/child certification",
  courseVersion: "4",
  chapters: 10,
  lessons: 64,
  runtimeScenarios: 256,
  realStageExecutions: 192,
  stageTime: "accelerated; audio muted; data-board actions via public API",
  tasks,
  viewports,
  manualFollowUps: [
    "real iPad",
    "child playtest",
    "30-minute sustained use",
    "commercial asset approval",
  ],
};
await writeFile(
  new URL("summary.json", root),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  "Verified 64 lessons / 256 scenarios / 192 real-stage executions and all geometry checks.",
);
