import type { DagView } from '../../types';

/**
 * The DAG board's status counters, split out of the panel when that file reached 253 lines (`SP-38`).
 *
 * The unresolved count is the one that is not a status: an edge to another repository used to be dropped
 * from the canvas without a word, so a graph missing twelve arrows looked complete. The count says the
 * graph is short; the title says of what.
 */
export function DagStatsRow({ dag }: { dag: DagView | null }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-cad-bg border border-cad-border">
      <span className="text-cad-muted">Total: <b className="text-cad-text">{dag?.stats.total || 0}</b></span>
      <span className="text-cad-cyan">Ready: <b>{dag?.stats.ready || 0}</b></span>
      <span className="text-cad-amber">Blocked: <b>{dag?.stats.blocked || 0}</b></span>
      <span className="text-cad-emerald">Verified: <b>{dag?.stats.verified || 0}</b></span>
      {dag?.stats.deferred !== undefined && dag.stats.deferred > 0 && (
        <span className="text-purple-400">Deferred: <b>{dag.stats.deferred}</b></span>
      )}
      {dag?.stats.archived !== undefined && dag.stats.archived > 0 && (
        <span className="text-zinc-500">Archived: <b>{dag.stats.archived}</b></span>
      )}
      {(dag?.stats.unresolved_edges ?? 0) > 0 && (
        <span
          className="text-cad-red"
          title={(dag?.unresolved_edges ?? [])
            .map(
              (edge) =>
                `${edge.source} → ${
                  edge.target_repo && edge.target_key
                    ? `${edge.target_key} (${edge.target_repo})`
                    : (edge.target_key ?? edge.target_id.slice(0, 8))
                }`
            )
            .join('\n')}
        >
          Outside this checkout: <b>{dag?.stats.unresolved_edges}</b>
        </span>
      )}
    </div>
  );
}
