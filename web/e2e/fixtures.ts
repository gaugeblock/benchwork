import { Page } from '@playwright/test';
import type { DagView, TaskNode } from '../src/types';

export const INITIAL_MOCK_TASKS: TaskNode[] = [
  {
    id: 'task-1',
    ticket_key: 'GB-101',
    slug: 'ast-indexing',
    title: 'AST Indexing Engine',
    description: 'Implement AST indexing engine using miter',
    kind: 'feature',
    status: 'ready',
    priority: 1,
    scope: { crate_name: 'miter-engine', target_files: ['src/lib.rs'], target_symbols: [], labels: ['ast'] },
    edges: [],
    decisions: [],
    acceptance_criteria: ['Index AST efficiently'],
    created_at_epoch_ms: 1700000000000,
    updated_at_epoch_ms: 1700000000000,
  },
  {
    id: 'task-2',
    ticket_key: 'GB-102',
    slug: 'grammar-compiler',
    title: 'Grammar Compiler Integration',
    description: 'Integrate dynamic CFG scope compiler in batten',
    kind: 'feature',
    status: 'in_progress',
    priority: 2,
    scope: { crate_name: 'batten-core', target_files: ['src/lib.rs'], target_symbols: [], labels: ['cfg'] },
    edges: [],
    decisions: [],
    acceptance_criteria: ['Pass grammar tests'],
    created_at_epoch_ms: 1700000000000,
    updated_at_epoch_ms: 1700000000000,
  },
  {
    id: 'task-3',
    ticket_key: 'GB-103',
    slug: 'telemetry-spool',
    title: 'Telemetry Spool Trace Storage',
    description: 'Store Silver SFT and Gold DPO traces',
    kind: 'feature',
    status: 'verified',
    priority: 3,
    scope: { crate_name: 'rabbet-core', target_files: ['src/lib.rs'], target_symbols: [], labels: ['telemetry'] },
    edges: [],
    decisions: [],
    acceptance_criteria: ['Verify telemetry roundtrip'],
    created_at_epoch_ms: 1700000000000,
    updated_at_epoch_ms: 1700000000000,
  },
];

export async function setupApiMocks(page: Page) {
  let tasks = [...INITIAL_MOCK_TASKS];

  await page.route('**/api/v1/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        root_path: '/repo',
        spec_docs: { primary_spec_present: true, detected_files: [] },
        storypole_active: true,
        task_counts: { ready: 1, in_progress: 1, verified: 1 },
        pending_decisions_count: 0,
        dado_patterns_count: 5,
        sawhorse_configured: true,
        pending_telemetry_count: 0,
      }),
    });
  });

  await page.route('**/api/v1/migration/plan', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workspace_root: '/repo', items: [], has_legacy_items: false }),
    });
  });

  await page.route('**/api/v1/spec', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ supporting_docs: {}, pending_decisions: [], contracts: [] }),
    });
  });

  await page.route('**/api/v1/hub/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [], active_slots: {} }),
    });
  });

  await page.route('**/api/v1/chat/threads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v1/chat/autocomplete', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['@task:GB-101 (AST Indexing Engine)', '@task:GB-102 (Grammar Compiler Integration)']),
    });
  });

  await page.route('**/api/v1/chat/stream', async (route) => {
    const sseBody = [
      'event: text_delta\ndata: {"type":"text_delta","delta":"Hello "}\n\n',
      'event: text_delta\ndata: {"type":"text_delta","delta":"from Benji!"}\n\n',
      'event: done\ndata: {"type":"done","turn_id":"t-1","total_tokens":10}\n\n',
    ].join('');
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody,
    });
  });

  await page.route('**/api/v1/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'event: ping\ndata: {}\n\n',
    });
  });

  await page.route('**/api/v1/docs/audit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route('**/api/v1/dag/bulk-archive', async (route) => {
    const postData = route.request().postDataJSON();
    const taskIds: string[] = postData?.task_ids || [];
    tasks = tasks.filter((t) => !taskIds.includes(t.id));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ archived_keys: taskIds, failed_keys: [] }),
    });
  });

  await page.route(/\/api\/v1\/dag(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const includeArchived = url.searchParams.get('include_archived') === 'true';
    const activeTasks = includeArchived ? INITIAL_MOCK_TASKS : tasks;

    const dagView: DagView = {
      nodes: activeTasks,
      edges: [],
      stats: {
        total: activeTasks.length,
        ready: activeTasks.filter((t) => t.status === 'ready').length,
        in_progress: activeTasks.filter((t) => t.status === 'in_progress').length,
        verified: activeTasks.filter((t) => t.status === 'verified').length,
        blocked: 0,
      },
      topological_order: activeTasks.map((t) => t.id),
      roots: activeTasks.map((t) => t.id),
      leaves: activeTasks.map((t) => t.id),
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dagView),
    });
  });
}
