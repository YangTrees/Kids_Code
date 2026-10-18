/* global console, process, URL */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const taskRoot = "apps/web/src/features/tasks/";
const output = path.join(root, "docs/baselines/course-v3.json");
const requireWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { createServer } = await import(
  pathToFileURL(requireWeb.resolve("vite"))
);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const mode = process.argv[2] ?? "--check";
assert.ok(["--capture", "--check"].includes(mode), "Use --capture or --check");
const server = await createServer({
  configFile: false,
  cacheDir: path.join(root, "node_modules/.cache/course-baseline"),
  optimizeDeps: { noDiscovery: true, include: [] },
  root: path.join(root, "apps/web"),
  server: { middlewareMode: true, watch: null },
  appType: "custom",
  ssr: { noExternal: [/^@kids-code\//] },
});

try {
  const { creationTasks } = await server.ssrLoadModule(
    "/src/features/tasks/task-catalog.ts",
  );
  const { creationTasks: historicalTasks } = await server.ssrLoadModule(
    "/src/features/tasks/versions/v3/task-catalog.ts",
  );
  const { createTaskProject } = await server.ssrLoadModule(
    "/src/features/tasks/versions/v3/task-project.ts",
  );
  const { getTaskSetupProblem } = await server.ssrLoadModule(
    "/src/features/tasks/task-contract.ts",
  );
  const referenceFile = `${taskRoot}curriculum-progression.test.ts`;
  const referenceSource = await readFile(
    path.join(root, referenceFile),
    "utf8",
  );
  const referenceList =
    referenceSource.match(/it\.each<TaskId>\(\[([\s\S]*?)\]\)/)?.[1] ?? "";
  const referenceIds = new Set(
    [...referenceList.matchAll(/"([a-z_]+)"/g)].map((match) => match[1]),
  );
  const pilots = new Set([
    "speak",
    "move",
    "sequence",
    "repeat",
    "collision",
    "path_turn",
    "path_repeat",
    "data_compare",
  ]);
  const rows = creationTasks.map((currentTask, index) => {
    const task = historicalTasks.find(
      (task) => task.taskId === currentTask.taskId,
    );
    assert.ok(task, `Missing frozen v3 task: ${currentTask.taskId}`);
    const project = createTaskProject(task);
    assert.equal(getTaskSetupProblem(project), null, task.taskId);
    return {
      number: index + 1,
      taskId: task.taskId,
      contentVersion: task.contentVersion,
      chapter: task.chapter,
      title: task.title,
      description: task.description,
      projectMode: task.projectMode,
      difficulty: task.difficulty,
      blockGuide: task.blockGuide,
      rules: task.rules,
      runtimeGoal: task.runtimeGoal.label,
      programGoal: task.programGoal?.label ?? null,
      hints: task.hints,
      bindings: project.course.bindings,
      settings: project.settings,
      sprites: project.sprites,
      variables: project.variables,
      scenes: project.scenes,
      assets: project.assets,
      pathMap: project.pathMap ?? null,
      setup: project.course.setup,
      migration: {
        oldWork: "retain-v3-and-original-assets",
        nextBatch: pilots.has(task.taskId)
          ? "eight-lesson-pilot"
          : "after-pilot-acceptance",
        actor: "spr_story_tuantuan",
        mentor: "ui-only-diandian",
        newVersion: "not-activated",
      },
      verification: {
        template: `${taskRoot}task-project-integrity.test.ts`,
        compiledReference: referenceIds.has(task.taskId) ? referenceFile : null,
        referenceStatus: referenceIds.has(task.taskId)
          ? "existing-reference-to-run"
          : "individual-reference-coverage-to-review",
      },
    };
  });
  assert.equal(rows.length, 64);
  assert.equal(new Set(rows.map((row) => row.taskId)).size, 64);
  const chapters = [...new Set(rows.map((row) => row.chapter))];
  assert.equal(chapters.length, 10);
  const sources = {};
  const freezeIndex = JSON.parse(
    await readFile(
      path.join(root, "docs/baselines/course-v3-freeze.json"),
      "utf8",
    ),
  );
  for (const file of freezeIndex.files) {
    assert.equal(
      hash(await readFile(path.join(root, file.path))),
      file.sha256,
      `Frozen source changed: ${file.path}`,
    );
  }
  for (const relative of [
    "task-catalog.ts",
    "task-catalog-basics.ts",
    "task-catalog-ai.ts",
    "task-project.ts",
    "task-contract.ts",
    "task-versions.ts",
  ])
    sources[taskRoot + relative] = hash(
      await readFile(path.join(root, taskRoot, "versions/v3", relative)),
    );
  const snapshot = {
    schemaVersion: 1,
    courseVersion: "3",
    chapters,
    sources,
    rows,
  };
  if (mode === "--capture") {
    try {
      await readFile(output);
      throw new Error(
        "Baseline already exists. Capture never overwrites a frozen baseline.",
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(
      "Captured course v3: 64 lessons, 10 chapters; old baseline will not be overwritten.",
    );
  } else {
    const frozen = JSON.parse(await readFile(output, "utf8"));
    // Lock both observable templates and assessment sources. A future version
    // must first preserve the old implementation and explicitly update its resolver.
    assert.deepEqual(
      JSON.parse(JSON.stringify(rows)),
      frozen.rows,
      "Frozen v3 curriculum or template changed",
    );
    assert.deepEqual(chapters, frozen.chapters, "Chapter order changed");
    assert.deepEqual(
      sources,
      frozen.sources,
      "Version 3 assessment sources changed; freeze the old implementation before introducing a new course version",
    );
    console.log(
      "Verified all 64 v3 lessons: order, goals, rules, bindings, geometry and assets unchanged.",
    );
  }
} finally {
  await server.close();
}
