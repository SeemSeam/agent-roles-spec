#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export {
  applyRequirementAnalysis,
  extractSection,
  extractTitle,
  findRequirementMarkdown,
  replaceSection,
  upsertAnalysisFrontmatter
} from "../../../lib/requirement-analysis/index.mjs";
import { applyRequirementAnalysis } from "../../../lib/requirement-analysis/index.mjs";

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) {
    return null;
  }
  return args[index + 1];
}

function hasFlag(args, name) {
  return args.includes(name);
}

async function main() {
  const args = process.argv.slice(2);
  const requirementId = readArg(args, "--requirement-id");
  const projectRoot = readArg(args, "--project-root");
  const analysisFile = readArg(args, "--analysis-file");
  if (!requirementId || !projectRoot || !analysisFile) {
    throw new Error("usage: apply-analysis.mjs --requirement-id <id> --project-root <path> --analysis-file <path> [--skip-console]");
  }

  const summary = await applyRequirementAnalysis({
    requirementId,
    projectRoot,
    analysisFile,
    skipConsole: hasFlag(args, "--skip-console")
  });
  console.log(`[CCB_TASK_COMPLETED] ${JSON.stringify(summary)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
