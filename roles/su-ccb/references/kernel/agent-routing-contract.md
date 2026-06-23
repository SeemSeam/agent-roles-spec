# Agent Routing Contract

> status: active
> scope: CCB consult / dispatch target selection
> authority: provider-neutral routing rule; `ccb.config [windows]` remains the group membership data source.

## 1. Core Rule

CCB workflow routing must resolve identity before choosing a target:

1. Anchor the current actor: determine the current agent name.
2. Locate the actor window: find the `[windows]` entry in `ccb.config` that contains that agent.
3. Resolve the same-group peer: within that window, exclude the actor and select the unique complementary-provider member.
4. Require an explicit target when resolution is not unique.

The agent group is the member set of one `ccb.config [windows]` window. Implementations must not infer groups from name prefixes such as `slot`.

## 2. Result Semantics

The same-group peer resolver returns one of:

| kind | Meaning | Required behavior |
|---|---|---|
| `peer` | Exactly one complementary-provider member exists in the actor window. | The workflow may use that peer as the default target. |
| `ambiguous` | More than one eligible complementary-provider member exists, or the actor appears in multiple windows. | The workflow must require an explicit target. |
| `no_peer` | The actor is not found, has no known complementary provider, or no eligible same-window peer exists. | The workflow must require an explicit target. |

Resolver functions must be deterministic and side-effect free.

## 3. Default Target Scope

The default same-group peer applies only to workflow consult / dispatch flows that have no explicit target.

Explicit cross-group collaboration remains valid. When the target is outside the actor window, the sender must keep the target explicit and provide a reason or warning signal so the route is not silent.

## 4. Boundaries

- This contract does not change the `ccb.config` format.
- This contract does not introduce pairing or role schema.
- This contract does not require the `ccb ask` runtime to enforce routing yet; runtime enforcement is a separate upstream contract.
- Provider-specific implementations may define the complementary-provider relation for their supported providers. If the relation is unknown or non-unique, they must fall back to explicit target selection.
