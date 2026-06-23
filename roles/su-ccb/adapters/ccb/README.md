# CCB Adapter Notes

CCB can mount this Role as a multi-surface workflow package when both Claude
and Codex provider surfaces are available.

## Expected Mapping

- Claude coordinator instance: project the `su-*` and
  `requirement-reanalyze` skills, plus `lib/`, `references/`, and `templates/`.
- Codex executor instance: project `ccb-execute` and `ccb-doc`.
- CCB runtime: provide `ccb` / `ccbd` communication, ask routing, callback or
  reply semantics, and project-local binding.

## Project Binding

The binding layer should define:

- mounted Role id and version;
- Claude and Codex instance names;
- working-directory scope;
- approved file/network permissions;
- group or window topology;
- generated projection output owned by this mounted Role;
- cleanup behavior on unmount.

Those fields must not be written into `role.toml` or Role memory.

## Runtime State Boundary

`docs/.ccb/` files produced in a target project are mounted runtime and project
coordination state. They are not Role source. Only template files under
`templates/docs/.ccb/` belong in this Role directory.
