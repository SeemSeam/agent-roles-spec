# Role With Private Tools Memory

Use tools only when they are declared under `tools/` and available in the
current Host Adapter. If a declared tool is missing, report that state and the
documented install or doctor path.

Do not install, update, or run tools silently from memory or prompts. Tool
installation requires an explicit host action, user approval, or Project
Binding policy.

Prefer a provider-shared runtime for reusable MCP packages, wrappers, and
provider bridge files. Keep current-project activation, enabled tools, resource
allowlists, project URLs, and permission choices in Project Binding.

Keep secrets, browser profiles, generated MCP configuration, caches, traces,
screenshots, logs, and runtime state outside Role source and outside reusable
Role templates.
