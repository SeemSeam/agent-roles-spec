# Agent Roles

> Agent Roles é uma especificação host-neutral para empacotar agentes de IA especializados como Roles portáteis e montáveis.

Um Role agrupa tudo que um agente especializado precisa — skills, memory, dependências de ferramentas, plugin content e host adapter metadata — em uma única unidade portátil. Pode ser montado em um agente de um projeto-alvo e desmontado de forma limpa quando não for mais necessário, sem afetar o ambiente principal, as configurações globais do usuário ou outros agentes.

Esta especificação visa impulsionar a colaboração multi-agente rumo a uma estrutura mais clara:

| Público | Mudança |
|---------|---------|
| **Desenvolvedores** | Do desenvolvimento de skills isolados para o desenvolvimento de Roles completos |
| **Usuários** | Da gestão dispersa de skills/plugins para a gestão unificada de roles |

> Esta tradução segue `README.md`. Em caso de divergência, a versão em inglês prevalece.

---

## Por que Agent Roles

O conteúdo de um agente especializado costuma estar disperso em múltiplos diretórios, arquivos de configuração e runtimes:

- Prompts do sistema
- Skills recuperados sob demanda
- Memory de projeto e memória de longo prazo
- Dependências de ferramentas
- Configurações de adaptadores para diferentes ambientes host

A migração requer cópia, instalação e depuração manuais. Na desmontagem, é difícil distinguir quais conteúdos pertencem ao agente e quais pertencem ao ambiente principal ou a outros agentes.

Agent Roles organiza tudo isso em um formato Role padronizado, para que agentes especializados possam ser definidos, distribuídos, montados e desmontados como unidades independentes.

---

## Conceitos fundamentais

### Role

Um Role é o objeto central do Agent Roles — um agente especializado completo. Não é apenas um prompt nem uma coleção de skills, mas uma unidade de encapsulamento que carrega suas próprias capacidades, contexto e informações de adaptação.

### Role Definition

Uma Role Definition é o arquivo de manifesto de um Role. Descreve as responsabilidades do Role, os skills necessários, as dependências de ferramentas, o plugin content, a configuração de adaptadores host e as regras de montagem e desmontagem.

### Host Adapter

Um Host Adapter descreve como um Role entra em um ambiente host específico. O mesmo Role pode ser lido e montado por múltiplos hosts. O Host Adapter captura as diferenças em estrutura de diretórios, formato de configuração, pontos de entrada de ferramentas e projeção de plugins.

### Mount / Unmount

| Operação | Descrição |
|----------|-----------|
| **Mount** | Montar um Role no projeto-alvo carregando dinamicamente os conteúdos via índice, estabelecendo conexões entre o Role, o projeto-alvo e o ambiente host |
| **Unmount** | Desmontar um Role do projeto-alvo; arquivos de sessão são mantidos conforme necessário, demais conteúdos são apagados imediatamente, sem afetar o ambiente principal, configurações globais ou outros agentes |

---

## O que um Role pode conter

| Conteúdo | Descrição |
|----------|-----------|
| `role instructions` | Responsabilidades do papel, limites de comportamento e estilo de trabalho |
| `skills` | Módulos de capacidade usados pelo role |
| `memory` | Memory ou contexto de projeto do role |
| `tools` | Comandos, scripts ou ferramentas externas das quais o role depende |
| `plugins` | Conteúdo plugin que o role projeta no ambiente host |
| `host adapters` | Metadados de adaptador para diferentes ambientes host |
| `lifecycle rules` | Regras de processamento para mount, atualização e unmount |

---

## Objetivos de design

- Roles de agentes especializados podem ser claramente definidos e distribuídos de forma independente
- Roles podem migrar entre projetos, ser montados sob demanda e desmontados de forma limpa
- Os limites de conteúdo dos Roles são explícitos e não interferem no ambiente principal nem em outros agentes
- Fornecer uma especificação unificada para CLI, role manager e mount runtime

---

## Roles publicados

Estes são os Roles publicados atualmente no catalog. Cada entrada pode ser
instalada com `agent-roles` e pode expor adapters específicos de host.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Versão**: `0.2.1`
- **Propósito**: Revisa drift de arquitetura, limites, acoplamento, manutenibilidade e risco estrutural.
- **Indicado para**: revisões de arquitetura, checagens de limites de dependências, análise de acoplamento e sequenciamento prático de próximos passos.
- **Conteúdo**: instruções de Role, skills de revisão arquitetural, prompt reutilizável, documentação de ferramentas, conteúdo de plugins e host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Instalar**: `agent-roles install archi`
- **Atualizar**: `agent-roles update archi`
- **Fonte**: [`roles/archi`](../../roles/archi/)

</details>

---

## Status atual

> A especificação ainda está em fase inicial de design.

Foco atual:

- Limites conceituais dos Roles e estrutura da Role Definition
- Organização de skills, memory, tools e plugins
- Expressão dos Host Adapters
- Restrições mínimas de comportamento para mount / unmount

Em breve: schema, exemplos, protótipo CLI, role manager e mount runtime.

---

## Roadmap de adaptadores

O desenvolvimento de Host Adapters começará prioritariamente com estes projetos multi-agente:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adaptadores para Claude Code, Codex e outros hosts principais também estão planejados. Trabalharemos ativamente para promover o suporte nativo ao formato Role em todas as plataformas.
