# Role Creation Prompt

Use this prompt to request a structured Role creation pass.

```text
Create an Agent Role draft for <role-idea-or-domain>.

Ask for missing information before writing if the role id, responsibilities,
non-goals, target catalog level, host targets, expected skills, network posture,
or publication target are unclear.

Design:
- canonical role id and useful aliases
- role.toml metadata, identity, contents inventory, advisory permissions, and
  host adapter display names
- durable memory instructions with no project-specific state
- one or more focused skills with trigger conditions, workflow, forbidden
  actions, and validation
- reusable prompts or references when they improve repeatability
- README and validation notes

If current external skill-construction guidance would materially improve the
skill design, perform public web research first. Prefer official docs and
maintained examples, cite source URLs and access date, and synthesize the
guidance instead of copying examples wholesale.

Return:
1. proposed file tree
2. key design decisions and tradeoffs
3. patch plan or created files
4. verification commands
5. publication risks or open questions
```
