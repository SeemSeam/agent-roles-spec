#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export { assertInitializedProject, initProjectScaffold } from "../../../lib/su-init/index.mjs";
import { assertInitializedProject, initProjectScaffold } from "../../../lib/su-init/index.mjs";

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) return null;
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const projectRoot = resolve(readArg(args, "--project-root") ?? process.cwd());
  const summary = await initProjectScaffold({ projectRoot });
  const verification = await assertInitializedProject(projectRoot);
  console.log(
    `[CCB_SU_INIT_COMPLETED] ${JSON.stringify({
      project_root: projectRoot,
      created_count: summary.created.length,
      skipped_count: summary.skipped.length,
      warnings: summary.warnings,
      architectureCandidates: summary.architectureCandidates,
      verification
    })}`
  );
  if (!verification.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
