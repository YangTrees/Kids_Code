/* global console, URL */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../artifacts/pilot-acceptance/", import.meta.url);
const ids = [
  "speak",
  "move",
  "sequence",
  "repeat",
  "collision",
  "path_turn",
  "path_repeat",
  "data_compare",
];
const tasks = [];
for (const taskId of ids) {
  const file = taskId + "-desktop-1366.json";
  const value = JSON.parse(await readFile(new URL(file, root), "utf8"));
  assert.deepEqual(
    value.records.map((record) => record.scenario),
    ["correct", "equivalent", "typical-error", "repaired"],
  );
  assert.deepEqual(
    value.records.map((record) => record.completed),
    [true, true, false, true],
  );
  assert.ok(
    value.records.every(
      (record) =>
        record.taskId === taskId &&
        record.contentVersion === "4" &&
        record.actor === "spr_story_tuantuan",
    ),
  );
  tasks.push({ taskId, file, scenarios: 4, passed: true });
}
const geometry = [];
for (const viewport of ["desktop-1366", "compact-1024", "ipad-landscape"]) {
  const file = "geometry-" + viewport + ".json";
  const records = JSON.parse(await readFile(new URL(file, root), "utf8"));
  assert.ok(records.length >= 33, file);
  assert.ok(
    records.every((record) => record.pass),
    file,
  );
  assert.equal(
    records.filter((record) => record.check === "single-step-really-pauses")
      .length,
    2,
    file,
  );
  geometry.push({ viewport, file, checks: records.length, passed: true });
}
const summary = {
  scope:
    "P1-08 automated pilot acceptance only; not real-device or child usability certification",
  courseVersion: "4",
  pilotTasks: 8,
  programScenarios: 32,
  tasks,
  geometry,
  manualFollowUps: [
    "real iPad",
    "child playtest",
    "30-minute sustained session",
  ],
};
await writeFile(
  new URL("summary.json", root),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  "Verified eight pilots / 32 program scenarios including equivalent solutions, and 33 real geometry checks on each of three viewports.",
);
