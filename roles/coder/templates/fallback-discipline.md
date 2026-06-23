# Fallback Discipline

Do not add fallback behavior unless one is explicitly required by the task or
existing contract.

Forbidden by default:

- empty catch blocks;
- returning empty objects, empty lists, `null`, `false`, or success to hide a
  failure;
- defaulting unknown states to happy paths;
- broad compatibility shims;
- silent retries without reporting failure;
- swallowing validation errors;
- catch blocks around large unrelated regions.

If fallback is necessary, state:

- what failure it handles;
- why the caller should continue;
- how the failure is logged, returned, or surfaced;
- which test proves the fallback path;
- what review owner should inspect it.
