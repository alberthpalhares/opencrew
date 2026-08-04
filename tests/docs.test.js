// Lightweight content assertions on the markdown files that drive agent behavior
// at runtime. These aren't executable code, but they encode real contracts (e.g.
// "the dashboard must be opt-in") that are easy to silently regress on a future edit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { templatesDir } from '../src/lib/paths.js';

async function read(relPath) {
  return fs.readFile(path.join(templatesDir, relPath), 'utf8');
}

test('runner.pipeline.md: dashboard state.json writes are opt-in, not mandatory', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));

  assert.match(runner, /dashboard_enabled/, 'runner should gate state.json writes on a dashboard_enabled flag');
  assert.doesNotMatch(
    runner,
    /Wait 10 seconds/,
    'the runner should never force a blocking delay for the dashboard'
  );
  assert.doesNotMatch(
    runner,
    /State writes are always mandatory/,
    'state.json writes must be conditional, not always mandatory'
  );
});

test('preferences.md template declares a Dashboard toggle, default disabled', async () => {
  const prefs = await read(path.join('_opencrew', '_memory', 'preferences.md'));
  assert.match(prefs, /\*\*Dashboard:\*\*\s*disabled/);
});

test('AGENTS.md documents the Dashboard as optional and loads preferences.md before running a pipeline', async () => {
  const agents = await read('AGENTS.md');
  assert.match(agents, /## Dashboard \(Optional\)/);
  assert.match(agents, /disabled by default/);
  assert.match(agents, /_opencrew\/_memory\/preferences\.md/);
});

test('AGENTS.md no longer warns about squads/ naming limitation', async () => {
  const agents = await read('AGENTS.md');
  assert.doesNotMatch(agents, /squads\//, 'should no longer reference the old squads/ directory');
});

test('skills.engine.md documents catalog.json as the primary discovery source', async () => {
  const engine = await read(path.join('_opencrew', 'core', 'skills.engine.md'));
  assert.match(engine, /catalog\.json/, 'skills engine should reference catalog.json');
  assert.match(engine, /baseUrl/, 'skills engine should support configurable base URL');
  assert.match(engine, /minVersion/, 'skills engine should validate minimum opencrew version');
});

test('catalog.json is valid and every skill has required fields', async () => {
  const raw = await read(path.join('skills', 'catalog.json'));
  const catalog = JSON.parse(raw);

  assert.equal(typeof catalog.version, 'string');
  assert.equal(typeof catalog.baseUrl, 'string');
  assert.ok(catalog.baseUrl.length > 0);
  assert.equal(typeof catalog.skills, 'object');

  const validTypes = new Set(['mcp', 'script', 'hybrid', 'prompt']);
  for (const [name, skill] of Object.entries(catalog.skills)) {
    assert.equal(typeof skill.type, 'string', `${name}: missing type`);
    assert.ok(validTypes.has(skill.type), `${name}: unknown type "${skill.type}"`);
    assert.equal(typeof skill.description, 'string', `${name}: missing description`);
    assert.ok(skill.description.length > 0, `${name}: empty description`);
    assert.equal(typeof skill.minVersion, 'string', `${name}: missing minVersion`);
    assert.match(skill.minVersion, /^\d+\.\d+\.\d+/, `${name}: minVersion should be semver`);
  }
});

test('catalog.json and README.md list the same skills', async () => {
  const raw = await read(path.join('skills', 'catalog.json'));
  const catalog = JSON.parse(raw);
  const readme = await read(path.join('skills', 'README.md'));

  for (const name of Object.keys(catalog.skills)) {
    assert.match(readme, new RegExp(`\`${name}\``),
      `README.md should mention skill "${name}" that is in catalog.json`);
  }
});

test('build.prompt.md specifies the crew-party.csv displayName column and gate', async () => {
  const build = await read(path.join('_opencrew', 'core', 'prompts', 'build.prompt.md'));

  // The runner renders agent names from the `displayName` column; the build prompt
  // must define it so the manifest is never generated with role/title instead of name.
  assert.match(build, /displayName/, 'build.prompt.md must document the displayName column');
  assert.match(build, /id,displayName,title,icon,path,execution/,
    'build.prompt.md must show the canonical crew-party.csv header');
  assert.match(build, /Gate 0b/, 'build.prompt.md must add the crew-party manifest gate');
});

test('repair.prompt.md exists and pulls names from .agent.md', async () => {
  const repair = await read(path.join('_opencrew', 'core', 'prompts', 'repair.prompt.md'));

  assert.match(repair, /crew-party\.csv/, 'repair prompt should rewrite crew-party.csv');
  assert.match(repair, /displayName/, 'repair prompt should populate the displayName column');
  assert.match(repair, /name:/, 'repair prompt should source names from .agent.md name: frontmatter');
});

test('AGENTS.md routes /opencrew repair to the repair prompt', async () => {
  const agents = await read('AGENTS.md');
  assert.match(agents, /\/opencrew repair/, 'AGENTS.md should route the repair command');
  assert.match(agents, /repair\.prompt\.md/, 'AGENTS.md should point repair at repair.prompt.md');
});

test('sherlock-shared.md documents multi-source orchestration', async () => {
  const shared = await read(path.join('_opencrew', 'core', 'prompts', 'sherlock-shared.md'));
  assert.match(shared, /Multi-Source Orchestration/, 'sherlock-shared must include multi-source orchestration section');
  assert.match(shared, /sherlock-web\.md/, 'must reference sherlock-web extractor');
  assert.match(shared, /sherlock-seo\.md/, 'must reference sherlock-seo extractor');
  assert.match(shared, /sherlock-trends\.md/, 'must reference sherlock-trends extractor');
  assert.match(shared, /Source Selection Logic/, 'must include source selection matrix');
  assert.match(shared, /Cross-Source Deduplication/, 'must include deduplication rules');
});

test('sherlock-web.md exists and follows extractor contract', async () => {
  const web = await read(path.join('_opencrew', 'core', 'prompts', 'sherlock-web.md'));
  assert.match(web, /sherlock-shared\.md/, 'must reference sherlock-shared.md');
  assert.match(web, /web_search/, 'must use web_search native tool');
  assert.match(web, /raw-content\.md/, 'must produce raw-content.md output');
  assert.match(web, /pattern-analysis\.md/, 'must produce pattern-analysis.md output');
});

test('sherlock-seo.md exists and follows extractor contract', async () => {
  const seo = await read(path.join('_opencrew', 'core', 'prompts', 'sherlock-seo.md'));
  assert.match(seo, /sherlock-shared\.md/, 'must reference sherlock-shared.md');
  assert.match(seo, /web_search/, 'must use web_search native tool');
  assert.match(seo, /raw-content\.md/, 'must produce raw-content.md output');
  assert.match(seo, /pattern-analysis\.md/, 'must produce pattern-analysis.md output');
});

test('sherlock-trends.md exists and follows extractor contract', async () => {
  const trends = await read(path.join('_opencrew', 'core', 'prompts', 'sherlock-trends.md'));
  assert.match(trends, /sherlock-shared\.md/, 'must reference sherlock-shared.md');
  assert.match(trends, /web_search/, 'must use web_search native tool');
  assert.match(trends, /raw-content\.md/, 'must produce raw-content.md output');
  assert.match(trends, /pattern-analysis\.md/, 'must produce pattern-analysis.md output');
});

test('all sherlock extractors declare their tool dependencies', async () => {
  const files = ['sherlock-instagram.md', 'sherlock-linkedin.md', 'sherlock-twitter.md', 'sherlock-youtube.md'];
  for (const f of files) {
    const content = await read(path.join('_opencrew', 'core', 'prompts', f));
    assert.match(content, /sherlock-shared\.md/, `${f} must reference sherlock-shared.md`);
    assert.match(content, /browser|playwright|npx playwright/i, `${f} must declare browser automation dependency`);
  }
  const nativeTools = ['sherlock-web.md', 'sherlock-seo.md', 'sherlock-trends.md'];
  for (const f of nativeTools) {
    const content = await read(path.join('_opencrew', 'core', 'prompts', f));
    assert.match(content, /web_search/, `${f} must use web_search native tool`);
    // Must not prescribe browser automation as a tool requirement
    assert.doesNotMatch(content, /npx playwright|--load-storage|--save-storage|_browser_profile/, `${f} must NOT use Playwright browser automation`);
  }
});

test('discovery.prompt.md supports template selection at Step 0', async () => {
  const discovery = await read(path.join('_opencrew', 'core', 'prompts', 'discovery.prompt.md'));
  assert.match(discovery, /Step 0.*Template Selection/i, 'discovery must include template selection step');
  assert.match(discovery, /discovery\.template\.yaml/, 'must reference discovery.template.yaml files');
});

test('runner.pipeline.md dispatches export formats correctly', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /export\.prompt\.md/, 'runner must reference export.prompt.md for export formats');
  assert.match(runner, /Export formats/, 'runner must have export format dispatch section');
  assert.match(runner, /format is one of `pdf`, `csv`, or `formatted-post`/, 'runner must recognize pdf, csv, and formatted-post as export formats');
});

test('export.prompt.md documents all supported formats', async () => {
  const export_ = await read(path.join('_opencrew', 'core', 'prompts', 'export.prompt.md'));
  assert.match(export_, /format: pdf/, 'must document PDF export');
  assert.match(export_, /format: csv/, 'must document CSV export');
  assert.match(export_, /format: formatted-post/, 'must document formatted-post export');
  assert.match(export_, /Playwright/, 'PDF export must use Playwright');
});

test('crew templates have valid discovery.template.yaml files', async () => {
  const tDir = path.join(templatesDir, 'crews');
  let entries;
  try { entries = await fs.readdir(tDir); } catch { entries = []; }
  const templates = entries.filter(e => !e.startsWith('.'));
  assert.ok(templates.length >= 4, `expected >= 4 crew templates, got ${templates.length}`);
  for (const t of templates) {
    const yamlPath = path.join(tDir, t, 'discovery.template.yaml');
    const content = await fs.readFile(yamlPath, 'utf8');
    assert.match(content, /template:/, `${t}: must have template field`);
    assert.match(content, /label:/, `${t}: must have label field`);
    assert.match(content, /description:/, `${t}: must have description field`);
    assert.match(content, /domains:/, `${t}: must have domains field`);
    assert.match(content, /suggested_agents:/, `${t}: must have suggested_agents field`);
    assert.match(content, /role:/, `${t}: each agent must have a role`);
  }
});

test('design.prompt.md uses role-first creation flow (Phase D roles, Phase E skills)', async () => {
  const design = await read(path.join('_opencrew', 'core', 'prompts', 'design.prompt.md'));
  assert.match(design, /Phase D: Role Proposal/, 'Phase D must be Role Proposal');
  assert.match(design, /Phase E: Skill Mapping/, 'Phase E must be Skill Mapping');
  assert.match(design, /Phase F: Agent Design/, 'Phase F must be Agent Design');
  assert.match(design, /Phase G: Pipeline Design/, 'Phase G must be Pipeline Design');
  assert.match(design, /Phase H: Design Presentation/, 'Phase H must be Design Presentation');
  // Must not reference old phase names
  assert.doesNotMatch(design, /Phase D: Skill Discovery/, 'old Phase D name must be gone');
  assert.doesNotMatch(design, /Phase E: Agent Design/, 'Agent Design moved to Phase F');
  // Role-first rules
  assert.match(design, /present roles as people/, 'must include role-first rule');
  assert.match(design, /never as tools or skills/, 'must prohibit tool-first language');
  assert.match(design, /Role → Skill Mapping Table/, 'must include role-to-skill mapping table');
});

test('design.prompt.md includes tier selection (Phase B.5)', async () => {
  const design = await read(path.join('_opencrew', 'core', 'prompts', 'design.prompt.md'));
  assert.match(design, /Phase B\.5: Tier Selection/, 'must have tier selection after research');
  assert.match(design, /Express.*Standard.*Full/, 'must document all three tiers');
  assert.match(design, /tier.*express.*standard.*full/i, 'design.yaml schema must include tier field');
  assert.match(design, /DO ask about tier/, 'rules must require tier selection');
});

test('preferences.md includes Default Tier field', async () => {
  const prefs = await read(path.join('_opencrew', '_memory', 'preferences.md'));
  assert.match(prefs, /Default Tier/, 'preferences must include Default Tier');
  assert.match(prefs, /standard/, 'default tier must be standard');
});

test('runner.pipeline.md respects crew-level tier from crew.yaml', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /crew\.tier/, 'runner must read crew.tier from crew.yaml');
  assert.match(runner, /express.*fast/i, 'express tier must map to fast model_tier');
  assert.match(runner, /full.*powerful/i, 'full tier must map to powerful model_tier');
  assert.match(runner, /Tier:.*express.*standard.*full/, 'startup message must show tier');
});

test('runner.pipeline.md includes post-run reflection and memory injection', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /Post-Run Reflection/, 'must have post-run reflection step');
  assert.match(runner, /Regras? de Ouro/, 'must promote recurring patterns to golden rules');
  assert.match(runner, /Crew Memory Rules/, 'must inject crew memory into agent context');
  assert.match(runner, /Proibições Explícitas/, 'must inject explicit prohibitions');
  assert.match(runner, /3 or more runs/, 'must trigger promotion at 3+ occurrences');
});

test('shared agent registry: _opencrew/agents/ has 5 base agent definitions', async () => {
  const agentsDir = path.join(templatesDir, '_opencrew', 'agents');
  const files = await fs.readdir(agentsDir);
  const agents = files.filter(f => f.endsWith('.agent.md'));
  assert.ok(agents.length >= 5, `expected >= 5 base agents, got ${agents.length}`);
  for (const f of agents) {
    const content = await fs.readFile(path.join(agentsDir, f), 'utf8');
    assert.match(content, /---/, `${f}: must have YAML frontmatter`);
    assert.match(content, /name:/, `${f}: must have name field`);
    assert.match(content, /id:/, `${f}: must have id field`);
    assert.match(content, /## Persona/, `${f}: must have Persona section`);
    assert.match(content, /## Principles/, `${f}: must have Principles section`);
    assert.match(content, /## Operational Framework/, `${f}: must have Operational Framework`);
    assert.match(content, /## Anti-Patterns/, `${f}: must have Anti-Patterns section`);
    assert.match(content, /## Quality Criteria/, `${f}: must have Quality Criteria section`);
  }
});

test('design.prompt.md references shared agent registry in Phase F', async () => {
  const design = await read(path.join('_opencrew', 'core', 'prompts', 'design.prompt.md'));
  assert.match(design, /Shared Agent Registry/, 'Phase F must check shared registry');
  assert.match(design, /extends:.*base-agent/, 'design.yaml must support extends field');
  assert.match(design, /_opencrew\/agents\//, 'must reference _opencrew/agents/ path');
});

test('build.prompt.md supports extends: in agent generation', async () => {
  const build = await read(path.join('_opencrew', 'core', 'prompts', 'build.prompt.md'));
  assert.match(build, /extends/, 'build must support extends in agent generation');
  assert.match(build, /Shared base.*overrides/, 'must document shared base + overrides strategy');
  assert.match(build, /Gate 0c.*Shared Agent/, 'must have validation gate for extends references');
});

test('runner.pipeline.md documents extends lineage in agent loading', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /extends.*base-id/, 'runner must document extends lineage');
  assert.match(runner, /lineage is preserved/, 'extends lineage must be visible in loaded agents');
});

test('runs.md table includes Score column', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /Score.*Resultado/, 'runs.md header must include Score column');
  const build = await read(path.join('_opencrew', 'core', 'prompts', 'build.prompt.md'));
  assert.match(build, /Score.*Resultado/, 'build.prompt.md runs.md template must include Score');
});

test('design.prompt.md supports dynamic skill generation for unmatched roles', async () => {
  const design = await read(path.join('_opencrew', 'core', 'prompts', 'design.prompt.md'));
  assert.match(design, /Dynamic Skill Generation/, 'must document dynamic skill generation');
  assert.match(design, /skills\/\.custom\//, 'must save generated skills to .custom/');
  assert.match(design, /generated: true/, 'generated skills must have generated: true flag');
  assert.match(design, /experimental: true/, 'generated skills must be marked experimental');
});

test('skills.engine.md includes Operation 3a for automatic skill generation', async () => {
  const engine = await read(path.join('_opencrew', 'core', 'skills.engine.md'));
  assert.match(engine, /3a\. Generate Skill Automatically/, 'must document Operation 3a');
  assert.match(engine, /Generate Skill Automatically/, 'must describe auto-generation');
  assert.match(engine, /generated: true/, 'must require generated: true in frontmatter');
  assert.match(engine, /skills\/\.custom\//, 'must save to .custom/ directory');
  assert.match(engine, /Minimal validation/, 'must include validation step');
});

test('runner.pipeline.md supports pre-execution agent selection', async () => {
  const runner = await read(path.join('_opencrew', 'core', 'runner.pipeline.md'));
  assert.match(runner, /Pre-Execution Agent Selection/, 'must document agent selection step');
  assert.match(runner, /agent_dependencies/, 'must reference agent_dependencies field');
  assert.match(runner, /skipped_agents/, 'must track skipped_agents in pipeline state');
  assert.match(runner, /Reply with the numbers of the agents you want to INCLUDE/, 'must present IDE-neutral multi-select');
  assert.doesNotMatch(runner, /AskUserQuestion/, 'selection must stay IDE-neutral — no AskUserQuestion');
});

test('build.prompt.md documents agent_dependencies in crew.yaml', async () => {
  const build = await read(path.join('_opencrew', 'core', 'prompts', 'build.prompt.md'));
  assert.match(build, /agent_dependencies/, 'must document agent_dependencies field');
  assert.match(build, /Pre-Execution Agent Selection/, 'must reference Pre-Execution Agent Selection');
  assert.match(build, /agent_dependencies.*key and value references a real agent/, 'must have validation gate for dependencies');
});

test('AGENTS.md documents the pre-execution agent selection step', async () => {
  const agents = await read('AGENTS.md');
  assert.match(agents, /Pre-Execution Agent Selection/, 'must document agent selection step');
  assert.match(agents, /agent_dependencies/, 'must reference agent_dependencies field');
});
