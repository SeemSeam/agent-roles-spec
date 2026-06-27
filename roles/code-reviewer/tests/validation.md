# Code Reviewer Validation

Validate with a worker result that includes:

- a task packet;
- changed-file or artifact evidence;
- test command output or an explicit explanation for missing tests.

Expected output:

- starts with `status:`;
- includes concrete findings or pass evidence;
- includes a test plan or test-evidence assessment;
- includes a fallback/degradation audit;
- does not edit files or mutate CCB runtime state.

