# Large File Control

Before adding significant logic to an existing large or mixed-purpose file:

- Check whether the new logic has a separable domain concept.
- Prefer extracting a focused helper or module when extraction reduces current
  complexity.
- Keep the simple inline version when extraction would add indirection without
  reducing complexity.
- Do not split files mechanically just to lower line count.

Warning signs:

- the file is already hard to scan;
- unrelated responsibilities share local state;
- repeated conditionals handle modes, kinds, or types;
- new code requires edits in distant sections of the file;
- testing the new behavior requires patching internals.

Report the decision: inline, extract now, or defer with reason.
