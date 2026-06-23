# CCB Adapter Notes

Mount `agentroles.coder` as `coder`.

Use this role for bounded implementation work inside a CCB-managed project.
Route architecture, review, frontend, mobile, security, role-spec, and release
requests to the owning agents rather than expanding `coder`.

Generated provider memory, projected skills, runtime progress, panes, logs, and
task state are CCB-owned runtime state and must not be written back into this
Role source.
