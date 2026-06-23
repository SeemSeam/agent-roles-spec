# Code Style Contract

- Follow existing repository naming, layout, imports, formatting, and test
  style.
- Prefer small explicit functions over generic frameworks.
- Prefer existing helpers and modules over new abstractions.
- Do not create `utils`, `helpers`, `manager`, or `service` dumping grounds
  unless the repository already uses that pattern and the new file has a clear
  domain responsibility.
- Name modules by behavior or domain concept, not vague technical containers.
- Keep public interfaces small and explicit.
- Hide implementation details inside modules.
- Do not add configuration systems for one or two call sites.
- Do not introduce inheritance, factories, registries, event buses, plugin
  systems, or dependency injection containers unless the current task truly
  requires them.
- Use comments only when they explain non-obvious intent, invariants, or
  tradeoffs.
