# Agent Roles

> Agent Roles เป็น specification แบบ host-neutral สำหรับแพ็กเกจ AI agents เฉพาะทางให้เป็น Roles ที่ portable และ mount ได้

Role รวมทุกอย่างที่ specialist agent ต้องใช้ — skills, memory, tool dependencies, plugin content และ host adapter metadata — ไว้ใน portable unit เดียว สามารถ mount เข้าไปใน agent ของ target project ได้ และ unmount อย่างสะอาดเมื่อไม่ต้องใช้แล้ว โดยไม่กระทบ main environment, user global config หรือ agents อื่น

Specification นี้ออกแบบมาเพื่อผลักดัน multi-agent collaboration ไปสู่โครงสร้างที่ชัดเจนขึ้น:

| Audience | Shift |
|----------|-------|
| **Developers** | จากการสร้าง skill แยกส่วน ไปสู่การส่งมอบ Role ที่สมบูรณ์ |
| **Users** | จากการจัดการ skills/plugins ที่กระจัดกระจาย ไปสู่การจัดการ roles |

> คำแปลนี้อ้างอิงตาม `README.md` หากมีความแตกต่าง ให้ถือเวอร์ชันภาษาอังกฤษเป็นแหล่งอ้างอิงหลัก

---

## ทำไมต้อง Agent Roles

Content ของ specialist agent มักกระจัดกระจายอยู่ในหลาย directories, config files และ runtimes:

- System prompts
- Skills ที่ดึงมาเมื่อต้องใช้
- Project memory และ long-term memory
- Tool dependencies
- Host-specific adapter configuration

การ migrate จึงมักต้อง copy, install และ debug ด้วยมือ ส่วนตอน unmount ก็ยากที่จะรู้ว่าไฟล์ใดเป็นของ agent นั้น และไฟล์ใดเป็นของ main environment หรือ agents อื่น

Agent Roles จัดระเบียบทั้งหมดนี้เป็น Role format มาตรฐาน เพื่อให้ specialist agent ถูก define, distribute, mount และ unmount ได้เหมือน independent unit เดียว

---

## Core Concepts

### Role

Role คือ core object ใน Agent Roles — เป็น complete specialist agent definition ไม่ใช่แค่ prompt และไม่ใช่แค่ skill collection แต่เป็น encapsulation unit ที่พก capabilities, context และ adapter information ของตัวเอง

### Role Definition

Role Definition คือ manifest file ของ Role ใช้อธิบาย responsibilities ของ Role, required skills, tool dependencies, plugin content, Host Adapter configuration และ rules สำหรับ mount/unmount

### Host Adapter

Host Adapter อธิบายว่า Role เข้าไปใน host environment เฉพาะอย่างไร Role เดียวกันสามารถถูกอ่านและ mount โดยหลาย hosts ได้ Host Adapter เก็บความแตกต่างของ directory layout, config format, tool entry points และ plugin projection ของแต่ละ host

### Mount / Unmount

| Operation | Description |
|-----------|-------------|
| **Mount** | Attach Role เข้ากับ target project โดย load content แบบ dynamic ผ่าน index และสร้าง connections ระหว่าง Role, target project และ host environment |
| **Unmount** | Detach Role ออกจาก target project; session files จะถูกเก็บไว้เท่าที่จำเป็น ส่วน content อื่นจะถูกล้างทันที โดยไม่กระทบ main environment, user global config หรือ agents อื่น |

---

## Role พกอะไรได้บ้าง

| Content | Description |
|---------|-------------|
| `role instructions` | Role responsibilities, behavior boundaries และ working style |
| `skills` | Capability modules ที่ role ใช้ |
| `memory` | Memory หรือ project context ที่ role พกไว้ |
| `tools` | Commands, scripts หรือ external tools ที่ role ต้องพึ่งพา |
| `plugins` | Plugin content ที่ role project เข้าไปใน host environment |
| `host adapters` | Adapter metadata สำหรับ host environments ต่างๆ |
| `lifecycle rules` | Rules สำหรับจัดการ mount, update และ unmount |

---

## Design Goals

- Specialist agent roles สามารถ define ได้ชัดเจนและ distribute ได้อย่าง independent
- Roles สามารถ migrate ข้าม projects, mount ตามต้องการ และ unmount อย่างสะอาด
- Role content boundaries ชัดเจน และไม่ interfere กับ main environment หรือ agents อื่น
- ให้ unified specification สำหรับ CLI, role manager และ mount runtime

---

## Roles ที่เผยแพร่แล้ว

นี่คือ Roles ที่ publish แล้วใน catalog ตอนนี้ แต่ละ entry สามารถ install ผ่าน
`agent-roles` และอาจให้ host-specific adapters ได้

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **เวอร์ชัน**: `0.2.3`
- **ระดับ**: `stable`
- **วัตถุประสงค์**: review architecture drift, boundaries, coupling, maintainability และ structural risk.
- **เหมาะสำหรับ**: architecture reviews, dependency-boundary checks, coupling analysis และ practical next-step sequencing.
- **เนื้อหา**: Role instructions, architecture review skills, reusable prompt, tool documentation, plugin content และ host adapters.
- **อะแดปเตอร์**: CCB, Claude Code, Codex, HIVE.
- **ติดตั้ง**: `agent-roles install archi`
- **อัปเดต**: `agent-roles update archi`
- **แหล่งที่มา**: [`roles/archi`](../../roles/archi/)

</details>

<details>
<summary><strong>agentroles.mother</strong> - Role Mother</summary>

- **เวอร์ชัน**: `0.2.0`
- **ระดับ**: `preview`
- **วัตถุประสงค์**: สร้างและ audit Agent Roles ที่ตรงตาม spec รวมถึง web-backed research สำหรับ skill construction เมื่อมีประโยชน์.
- **เหมาะสำหรับ**: draft Roles ใหม่, audit Role source, ปรับ memory, skills และ prompts, ตรวจ catalog readiness, และค้นหา skill construction tools/techniques.
- **การวิจัยสกิล**: ใช้ public web research แบบจำกัดเพื่อหา skill construction tools และ techniques ล่าสุด โดยให้ความสำคัญกับ official docs และ maintained examples.
- **เนื้อหา**: Role authoring memory, Role creation/audit skill, reusable creation/audit prompts, skill construction research reference, validation notes และ host adapter display metadata.
- **อะแดปเตอร์**: CCB, Claude Code, Codex, HIVE.
- **ติดตั้ง**: `agent-roles install mother`
- **อัปเดต**: `agent-roles update mother`
- **แหล่งที่มา**: [`roles/mother`](../../roles/mother/)

</details>

---

## Current Status

> Specification ยังอยู่ใน early design stage

Current focus:

- Role concept boundaries และ Role Definition structure
- วิธี organize skills, memory, tools และ plugins
- วิธี express Host Adapters
- Minimum behavioral constraints สำหรับ mount / unmount

Upcoming: schema, examples, CLI prototype, role manager และ mount runtime

---

## Adapter Roadmap

Host Adapter development จะเริ่มจาก multi-agent projects เหล่านี้:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapters สำหรับ Claude Code, Codex และ major hosts อื่นก็อยู่ในแผนเช่นกัน เราจะทำงานเพื่อผลักดัน native support ของ Role format ในหลายแพลตฟอร์มอย่างจริงจัง
