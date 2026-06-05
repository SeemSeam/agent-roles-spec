# Agent Roles

> Agent Roles는 전문 AI agent를 portable하고 mount 가능한 Role로 패키징하기 위한 host-neutral 규범입니다.

Role은 전문 agent에 필요한 skills, memory, 도구 의존성, plugin content, host adapter metadata를 하나의 portable한 단위로 묶습니다. 대상 프로젝트의 agent에 mount하여 사용하고, 필요 없어지면 깨끗하게 unmount할 수 있습니다. 메인 환경, 사용자 글로벌 설정, 다른 agent에 영향을 주지 않습니다.

이 규범은 멀티 agent 협업을 더 명확한 구조로 발전시키는 것을 목표로 합니다:

| 대상 | 변화 |
|------|------|
| **개발자** | 개별 skill 개발에서 완전한 Role 개발로 |
| **사용자** | skills/plugins 분산 관리에서 roles 통합 관리로 |

> This translation follows `README.md`. If the two versions differ, the English version is authoritative.

---

## 왜 Agent Roles가 필요한가

전문 agent의 콘텐츠는 보통 여러 디렉토리, 설정 파일, runtime에 분산되어 있습니다:

- 시스템 프롬프트
- 온디맨드로 가져오는 skills
- 프로젝트 memory와 장기 memory
- 도구 의존성
- 각 host 환경의 어댑터 설정

마이그레이션 시 수동으로 복사, 설치, 디버깅이 필요합니다. unmount 시에는 어떤 콘텐츠가 해당 agent의 것인지, 메인 환경이나 다른 agent의 것인지 구분하기 어렵습니다.

Agent Roles는 이를 표준화된 Role 형식으로 정리하여 전문 agent를 독립적인 단위로 정의, 배포, mount, unmount할 수 있게 합니다.

---

## 핵심 개념

### Role

Role은 Agent Roles의 핵심 객체로, 완전한 전문 agent를 나타냅니다. 단순한 프롬프트도 아니고 skill 모음도 아닌, 자체 능력, 컨텍스트, 어댑터 정보를 가진 agent 캡슐화 단위입니다.

### Role Definition

Role Definition은 Role의 매니페스트 파일입니다. Role의 책임, 필요한 skills, 도구 의존성, plugin content, host 어댑터 설정, mount·unmount 시 처리 규칙을 기술합니다.

### Host Adapter

Host Adapter는 Role이 특정 host 환경에 어떻게 진입하는지 기술합니다. 동일한 Role을 여러 host가 읽고 mount할 수 있습니다. Host Adapter는 각 host의 디렉토리 구조, 설정 형식, 도구 진입점, plugin 투영 방식의 차이를 표현합니다.

### Mount / Unmount

| 작업 | 설명 |
|------|------|
| **Mount** | Role을 대상 프로젝트에 mount하여 인덱스 방식으로 콘텐츠를 동적 로드하고, Role과 대상 프로젝트·host 환경 간의 연결을 수립 |
| **Unmount** | Role을 대상 프로젝트에서 unmount. session 파일은 필요에 따라 보존하고 나머지 콘텐츠는 즉시 삭제. 메인 환경, 사용자 글로벌 설정, 다른 agent에 영향 없음 |

---

## Role이 携帶할 수 있는 것

| 콘텐츠 | 설명 |
|--------|------|
| `role instructions` | 역할 책임, 행동 경계, 작업 방식 |
| `skills` | role이 사용하는 능력 모듈 |
| `memory` | role이 가진 memory 또는 프로젝트 컨텍스트 |
| `tools` | role이 의존하는 명령어, 스크립트, 외부 도구 |
| `plugins` | role이 host 환경에 투영하는 plugin content |
| `host adapters` | 각 host 환경을 위한 어댑터 메타데이터 |
| `lifecycle rules` | mount, 업데이트, unmount 시 처리 규칙 |

---

## 설계 목표

- 전문 agent 역할을 명확히 정의하고 독립적으로 배포 가능
- Role을 프로젝트 간 이동, 온디맨드 mount, 깨끗한 unmount 가능
- Role의 콘텐츠 경계가 명확하여 메인 환경과 다른 agent를 방해하지 않음
- CLI, role manager, mount runtime에 통일된 규범 제공

---

## 게시된 Roles

현재 catalog에 게시된 Roles입니다. 각 항목은 `agent-roles`로 설치할 수
있고, host별 adapter를 제공할 수 있습니다.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Version**: `0.2.1`
- **Purpose**: 아키텍처 drift, 경계, coupling, maintainability, 구조적 위험을 review합니다.
- **Best for**: 아키텍처 리뷰, dependency boundary 점검, coupling 분석, 실용적인 다음 단계 정리.
- **Contents**: Role instructions, 아키텍처 review skills, 재사용 가능한 prompt, tool documentation, plugin content, host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Install**: `agent-roles install archi`
- **Update**: `agent-roles update archi`
- **Source**: [`roles/archi`](../../roles/archi/)

</details>

---

## 현재 상태

> 규범은 아직 초기 설계 단계에 있습니다.

현재 중점 사항:

- Role의 개념 경계와 Role Definition 구조
- skills, memory, tools, plugins의 정리 방식
- Host Adapter의 표현 방식
- mount / unmount의 최소 행동 제약

향후: schema, examples, CLI 프로토타입, role manager, mount runtime 추가 예정.

---

## 어댑터 로드맵

Host Adapter 개발은 다음 멀티 agent 프로젝트를 우선으로 시작합니다:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Claude Code, Codex 등 주요 host 어댑터도 개발 예정입니다. 각 플랫폼의 Role 형식 네이티브 지원을 적극적으로 추진할 것입니다.
