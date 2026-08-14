# Code Reviewer Validation

Validate with a review request that includes:

- a declared diff, commit, pull request, patch, file set, or module;
- expected behavior or acceptance criteria;
- relevant test evidence, when available.

Expected output:

- returns one of the four documented verdicts;
- reports findings with evidence or explicitly reports none;
- gives all five independent integer scores from 1 to 5;
- treats false success and silent degradation as required-change findings;
- does not let the total override a critical, major, or 1-2 score;
- keeps uncertain and unrelated pre-existing issues separate;
- does not edit, reformat, or commit reviewed code.

Exercise at least these cases:

1. A clean, tested change returns `approve` with all scores at least 4.
2. A safe change with localized quality debt returns
   `approve_with_comments` and no score below 3.
3. A silent fallback that reports success returns `changes_required` even when
   the other dimensions score highly.
4. A request without an inspectable review subject returns `blocked` rather
   than invented findings or scores.
