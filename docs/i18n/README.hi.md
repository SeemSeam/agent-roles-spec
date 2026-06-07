# Agent Roles

> Agent Roles एक host-neutral specification है, जो specialist AI agents को portable और mountable Roles के रूप में package करती है.

एक Role वह सब कुछ एक portable unit में बांधता है जिसकी किसी specialist agent को जरूरत होती है — skills, memory, tool dependencies, plugin content और host adapter metadata. इसे target project के agent में mount किया जा सकता है, और जरूरत खत्म होने पर साफ तरीके से unmount किया जा सकता है, बिना main environment, user global config या दूसरे agents को प्रभावित किए.

यह specification multi-agent collaboration को अधिक स्पष्ट structure की ओर ले जाने के लिए बनाई गई है:

| Audience | Shift |
|----------|-------|
| **Developers** | अलग-अलग skills बनाने से complete Roles ship करने तक |
| **Users** | बिखरे हुए skills/plugins संभालने से roles संभालने तक |

> यह अनुवाद `README.md` का अनुसरण करता है. यदि दोनों में अंतर हो, तो English version authoritative है.

---

## Agent Roles क्यों

किसी specialist agent का content आम तौर पर कई directories, config files और runtimes में फैला होता है:

- System prompts
- जरूरत पर खींचे जाने वाले skills
- Project memory और long-term memory
- Tool dependencies
- Host-specific adapter configuration

Migration का मतलब अक्सर manual copying, installing और debugging होता है. Unmount करते समय यह पहचानना मुश्किल हो जाता है कि कौन-सी files agent की हैं और कौन-सी main environment या दूसरे agents की.

Agent Roles इन सबको standard Role format में व्यवस्थित करता है, ताकि specialist agent को एक independent unit की तरह define, distribute, mount और unmount किया जा सके.

---

## Core Concepts

### Role

Role, Agent Roles का core object है — एक complete specialist agent definition. यह सिर्फ prompt नहीं है और सिर्फ skill collection भी नहीं है; यह एक encapsulation unit है जो अपनी capabilities, context और adapter information साथ रखता है.

### Role Definition

Role Definition किसी Role की manifest file है. यह Role की responsibilities, required skills, tool dependencies, plugin content, Host Adapter configuration और mount/unmount के rules बताती है.

### Host Adapter

Host Adapter बताता है कि कोई Role किसी specific host environment में कैसे प्रवेश करता है. वही Role कई hosts द्वारा पढ़ा और mount किया जा सकता है. Host Adapter हर host के directory layout, config format, tool entry points और plugin projection में अंतर को दर्ज करता है.

### Mount / Unmount

| Operation | Description |
|-----------|-------------|
| **Mount** | Role को target project से attach करना, index के जरिए उसका content dynamically load करना, और Role, target project तथा host environment के बीच connections स्थापित करना |
| **Unmount** | Role को target project से detach करना; session files जरूरत के अनुसार रखी जाती हैं, बाकी content तुरंत साफ किया जाता है, बिना main environment, user global config या दूसरे agents को प्रभावित किए |

---

## Role क्या-क्या ले जा सकता है

| Content | Description |
|---------|-------------|
| `role instructions` | Role responsibilities, behavior boundaries और working style |
| `skills` | Capability modules जिन्हें role इस्तेमाल करता है |
| `memory` | Role द्वारा carried memory या project context |
| `tools` | Commands, scripts या external tools जिन पर role निर्भर करता है |
| `plugins` | Plugin content जिसे role host environment में project करता है |
| `host adapters` | अलग-अलग host environments के लिए adapter metadata |
| `lifecycle rules` | Mount, update और unmount संभालने के rules |

---

## Design Goals

- Specialist agent roles को साफ तरीके से define और independently distribute किया जा सके
- Roles projects के बीच migrate कर सकें, demand पर mount हों और cleanly unmount हों
- Role content boundaries स्पष्ट हों और main environment या दूसरे agents में हस्तक्षेप न करें
- CLI, role manager और mount runtime के लिए unified specification देना

---

## प्रकाशित Roles

ये catalog में अभी प्रकाशित Roles हैं। हर entry को `agent-roles` से install
किया जा सकता है और यह host-specific adapters दे सकती है।

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **संस्करण**: `0.2.2`
- **स्तर**: `stable`
- **उद्देश्य**: Architecture drift, boundaries, coupling, maintainability और structural risk की review करता है।
- **सबसे उपयुक्त**: architecture reviews, dependency-boundary checks, coupling analysis और practical next-step sequencing.
- **सामग्री**: Role instructions, architecture review skills, reusable prompt, tool documentation, plugin content और host adapters.
- **एडेप्टर**: CCB, Claude Code, Codex, HIVE.
- **इंस्टॉल**: `agent-roles install archi`
- **अपडेट**: `agent-roles update archi`
- **स्रोत**: [`roles/archi`](../../roles/archi/)

</details>

---

## Current Status

> Specification अभी early design stage में है.

Current focus:

- Role concept boundaries और Role Definition structure
- Skills, memory, tools और plugins को organize करने का तरीका
- Host Adapters को express करने का तरीका
- Mount / unmount के लिए minimum behavioral constraints

Upcoming: schema, examples, CLI prototype, role manager और mount runtime.

---

## Adapter Roadmap

Host Adapter development इन multi-agent projects से शुरू होगा:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Claude Code, Codex और दूसरे major hosts के लिए adapters भी planned हैं. हम platforms पर Role format के native support की दिशा में सक्रिय रूप से काम करेंगे.
