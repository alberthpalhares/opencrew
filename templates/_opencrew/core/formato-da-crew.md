# Crew file format (formato da crew)

The single definition of the files that make a crew. The Build phase writes them, the Pipeline
Runner and the scripts read them, `/opencrew repair` checks them. When another prompt and this
file disagree, this file wins.

```
crews/{code}/
├── crew.yaml               the crew: identity, sources, limits
├── crew-party.csv          one row per agent (the names shown to the user)
├── agents/{agent-id}.agent.md
├── agents/{agent-id}/tasks/   the task files of an agent that declares `tasks:` (optional)
├── pipeline/
│   ├── pipeline.yaml       the order of the steps
│   ├── steps/step-NN-{name}.md
│   └── data/               reference material (never an output)
├── _memory/                memories.md, runs.md
└── output/{run_id}/        what each run produces
```

A folder under `crews/` without a `crew.yaml` is not a crew (the template folders installed with
the product only carry `discovery.template.yaml`).

## crew.yaml

```yaml
crew:
  code: "atas-do-conselho"          # the folder name
  name: "Atas do Conselho"          # shown in lists
  description: "Da pauta à ata pronta para assinar"
  icon: "📄"
  tier: "standard"                  # express | standard | full

pipeline:
  entry: "pipeline/pipeline.yaml"
  steps_dir: "pipeline/steps"

skills:                             # every skill the agents use
  - web_search
  - web_fetch

data:                               # reference material the steps load
  - pipeline/data/domain-framework.md
  - pipeline/data/quality-criteria.md

fontes:                             # files of the user's project the crew must read
  - caminho: Regras/estatuto.md     # relative to the project root, never absolute
    para_que: regras que mandam no texto

agent_dependencies:                 # only when an agent can be left out (see below)
  rita-redacao: []
  vito-veredito: [rita-redacao]

max_review_cycles: 2                # express 1 · standard 2 · full 3
```

| Field | Written by | Read by |
|---|---|---|
| `crew.code`, `name`, `description`, `icon` | Build, from `design.yaml` | crew lists (Architect) |
| `crew.tier` | Build, from `design.yaml → crew.tier` | Runner (run header) |
| `pipeline.entry`, `steps_dir` | Build, always these two values | a reference for people; the Runner reads these two paths directly |
| `skills` | Build | Runner, Skills Engine |
| `data` | Build; the template designer appends | Runner |
| `fontes` (`caminho`, `para_que`) | Build, from `discovery.yaml → project_sources`; `/opencrew repair` | Runner (reads the sources at the start of the run), `conferir-fontes.mjs` |
| `agent_dependencies` | Build | Runner (Pre-Execution Agent Selection) |
| `max_review_cycles` | Build | Runner (Review Loops) |
| `entrega.destino` | `entregar.mjs --lembrar-destino` only | `entregar.mjs` |

- **`fontes`** is omitted only when the discovery found no project source.
- **`agent_dependencies`** is written when at least one agent can be left out of a run without
  breaking another (for example, one writer per channel). Each key is an agent `id`; its value
  lists the agents whose output it reads. When every agent is needed in every run, omit the
  field: the Runner then runs all agents and shows no selection step.
- **`max_review_cycles`** — the Runner uses the value of the review step when the step declares
  one, then this one, then 3.
- Old crews carry `name`, `code`, `description` and `tier` loose at the top level, without the
  `crew:` block. Readers accept both; new crews use the block.

## pipeline.yaml

```yaml
steps:
  - step: 1
    file: "step-01-checkpoint-pauta.md"   # relative to pipeline/steps
  - step: 2
    file: "step-02-redigir-ata.md"
  - step: 3
    file: "step-03-revisar.md"
  - step: 4
    file: "step-04-checkpoint-final.md"
```

The steps run in the order of the list. `step` is the number other steps refer to (`on_reject`);
without it, the number is the position in the list. Old crews write `file: steps/step-…md`;
readers accept both. Nothing else is read from this file.

## Step files

The frontmatter of `pipeline/steps/step-NN-{name}.md` says how the Runner executes the step.

**Creation step**
```yaml
---
execution: inline            # inline | subagent
agent: rita-redacao          # the agent id (see "Agent id")
format: documento-oficial    # the kind of text this step produces (a best-practices id)
inputFile: crews/atas-do-conselho/output/pauta.md
outputFile: crews/atas-do-conselho/output/ata.md
---
```

**Review step** — the one with `on_reject`
```yaml
---
execution: inline
agent: vito-veredito
inputFile: crews/atas-do-conselho/output/ata.md
outputFile: crews/atas-do-conselho/output/revisao.md
on_reject: 2                 # the number of the step the pipeline goes back to on a rejection
---
```

**Checkpoint**
```yaml
---
type: checkpoint
agent: rita-redacao          # optional: skipped together with that agent
outputFile: crews/atas-do-conselho/output/pauta.md   # optional: the user's answer is saved here
---
```

| Field | Rule |
|---|---|
| `execution` | `subagent` runs in the background; `inline` runs in the conversation. A step that publishes or sends is always `inline` |
| `agent` | the agent id |
| `format` | every step whose text is checked before the review (from the `on_reject` step up to the review) declares one; without it the writer does not get the guide of that kind of text and the checker looks in the file for pieces of a network (caption, post, blog title). A text to print, sign or file is `documento-oficial`; a text with no channel and no Word file (a proposal, a draft that becomes HTML or PDF, a plan) is `texto-livre`. Omit only for research, analysis and the review itself |
| `inputFile`, `outputFile` | always under `crews/{code}/output/`; never `pipeline/data/` |
| `model_tier` | `fast` or `powerful`, only on `subagent` steps. Express: `fast`. Standard: `fast` for research and data gathering, `powerful` for the rest. Full: `powerful`. Inline steps do not carry it |
| `side_effects: irreversible` | every step that publishes, posts or sends outside the project; such steps come after the review and the final approval |
| `on_reject` | marks the review step; its value is a step number |
| `max_review_cycles` | optional on the review step, when it must differ from the crew's |
| `skills_needed` | optional list of skills whose full instructions the step needs from the start |
| `type: checkpoint` | a pause for the user; no `execution` |

Every crew has a review step, followed by a final approval checkpoint. In the Express tier the
review step is done by the writer agent itself; Standard and Full have a dedicated reviewer agent.

## Agent id

One definition: the agent `id` is the file name without `.agent.md`
(`agents/rita-redacao.agent.md` → `rita-redacao`). The same text goes in the `id` column of
`crew-party.csv`, in `agent:` of the steps and in `agent_dependencies`. Old agent files carry
`id: "crews/{code}/agents/{id}"` in the frontmatter; readers use the last segment.

## crew-party.csv

```
id,displayName,title,icon,path,execution
rita-redacao,"Rita Redação","Redatora de Atas",📝,./agents/rita-redacao.agent.md,inline
```

`displayName` is the agent's `name:` (the two-word persona name), never the role. Quote any field
with a space or a comma.
