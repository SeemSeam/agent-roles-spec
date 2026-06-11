# A Note on Advancing an Open Agent Roles Specification

Hello,

I am an open-source author. Since late last year, I have been building
[`claude_codex_bridge`](https://github.com/SeemSeam/claude_codex_bridge), an
open-source project for multi-agent collaboration. The project has been updated
at a pace close to one release per day.

I mention this not to promote that project, but to give some context. I have
spent a long time working directly on multi-agent systems, subagents, agent
collaboration boundaries, and the engineering problems around reusable agent
capabilities. When I started, these patterns were much less widely discussed
than they are today. Through that work, I have become increasingly convinced
that we need a more complete way to package agent capabilities than a single
prompt or a single skill.

Recently, I started working on an open specification called
[`Agent Roles`](https://github.com/SeemSeam/agent-roles-spec).

I believe `skill` is an important abstraction. It lets an agent reuse a
capability, body of knowledge, workflow, or tool interaction pattern. But as the
number of skills grows, several problems become clear: skills are easy to mix
together, hard to manage, unclear at their invocation boundaries, difficult to
constrain in terms of permissions and tool dependencies, and often insufficient
for expressing the full context a specialized agent needs.

As multi-agent systems and subagents become more common, I think it is time to
develop a higher-level abstraction above skills: the `Agent Role`.

In simple terms, a Role can be understood as:

```text
role memory + skills + tool dependencies + permission boundaries + host adapter metadata
```

A Role is not a single skill. It is a complete capability package for a
specialized agent. A Role should be mountable onto an agent in Codex, Claude
Code, or another agent host, while remaining isolated from the main environment,
the user's global configuration, and other agents' state where possible. This
would let developers publish complete specialized roles instead of scattered
skills, and let users install, update, mount, or unmount a Role on demand
instead of manually assembling prompts, skills, tools, and permissions.

The idea of a `Role` itself is not new. Custom GPTs in the ChatGPT Store, and
earlier character cards or personas in AI role-playing communities, already
express a similar need: people want to package a stable identity, behavior
pattern, knowledge background, and interaction style so that a model can operate
as a particular role.

What feels urgent now is not inventing the term "role" again, but rebuilding
this idea at the specification and engineering level.

Today, we are no longer satisfied with writing a long prompt every time we open
a subagent. Nor should every skill be exposed through one global, mixed skill
library and left for the agent to choose from. As agents become more
specialized, capability boundaries, tool dependencies, permission scopes,
contextual memory, and host integration need to be packaged, declared, and
managed more explicitly.

This is why I think a portable, installable, updateable Role package
specification, with clear mount and unmount semantics, matters. It is somewhat
related in spirit to the idea of Claude plugins, but the goal is not a plugin
system for one platform. The goal is an open role package specification for the
broader multi-agent ecosystem, where a specialized agent's memory, skills,
tools, permissions, and host adapters can be distributed and used as one
coherent unit.

That is the motivation behind `Agent Roles`. It is not meant to be just another
marketplace, nor a copy of Custom GPTs. The goal is to move "roles" from a
product feature or community convention toward an engineering standard that
different agent hosts can understand and implement.

I have limited capacity to push this specification forward on my own. I hope
more people can take a look at this direction, and I especially hope leading
agent companies such as OpenAI, together with the broader open-source community,
can help discuss and advance similar Role specifications. My goal is not to
make everyone adopt one specific implementation, but to help this concept be
debated, improved, and eventually standardized in an open way.

If you are open to it, I would be very interested in hearing your thoughts on
this direction. Suggestions on the `Agent Roles` specification would also be
very welcome.

Thank you.

