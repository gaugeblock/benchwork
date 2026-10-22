// Pure topological layering and coordinate geometry math for technical CAD DAG rendering

import type { TaskNode } from '../../types';

export interface LayoutNode {
  task: TaskNode;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
}

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: 'blocked_by' | 'related_to';
  path: string;
}

export interface DagLayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: { width: number; height: number };
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 68;
const GAP_X = 90;
const GAP_Y = 50;
const PADDING = 60;

export function computeDagLayout(tasks: TaskNode[]): DagLayoutResult {
  if (tasks.length === 0) {
    return { nodes: [], edges: [], bounds: { width: 800, height: 600 } };
  }

  const taskMap = new Map<string, TaskNode>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  // Compute incoming degree for layers
  const inDegree = new Map<string, number>();
  const childrenMap = new Map<string, string[]>();

  tasks.forEach((t) => {
    inDegree.set(t.id, 0);
    childrenMap.set(t.id, []);
  });

  tasks.forEach((t) => {
    t.edges.forEach((edge) => {
      if (edge.kind === 'blocked_by' && taskMap.has(edge.target_id)) {
        // target blocks t => edge flows target -> t
        childrenMap.get(edge.target_id)?.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    });
  });

  // Layer assignment via longest path
  const layerMap = new Map<string, number>();
  const queue: string[] = [];

  tasks.forEach((t) => {
    if ((inDegree.get(t.id) || 0) === 0) {
      queue.push(t.id);
      layerMap.set(t.id, 0);
    }
  });

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currLayer = layerMap.get(currId) || 0;

    const children = childrenMap.get(currId) || [];
    children.forEach((childId) => {
      const existing = layerMap.get(childId) || 0;
      layerMap.set(childId, Math.max(existing, currLayer + 1));
      queue.push(childId);
    });
  }

  // Group nodes by layer
  const layers: TaskNode[][] = [];
  tasks.forEach((t) => {
    const l = layerMap.get(t.id) || 0;
    while (layers.length <= l) {
      layers.push([]);
    }
    layers[l].push(t);
  });

  // Position nodes
  const layoutNodes: LayoutNode[] = [];
  const posMap = new Map<string, { x: number; y: number }>();

  let maxX = 0;
  let maxY = 0;

  layers.forEach((layerTasks, layerIdx) => {
    const x = PADDING + layerIdx * (NODE_WIDTH + GAP_X);
    layerTasks.forEach((task, rowIdx) => {
      const y = PADDING + rowIdx * (NODE_HEIGHT + GAP_Y);
      posMap.set(task.id, { x, y });
      layoutNodes.push({
        task,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layer: layerIdx,
      });
      maxX = Math.max(maxX, x + NODE_WIDTH + PADDING);
      maxY = Math.max(maxY, y + NODE_HEIGHT + PADDING);
    });
  });

  // Compute orthogonal CAD wire paths
  const layoutEdges: LayoutEdge[] = [];
  tasks.forEach((t) => {
    const targetPos = posMap.get(t.id);
    if (!targetPos) return;

    t.edges.forEach((edge) => {
      const sourcePos = posMap.get(edge.target_id);
      if (!sourcePos) return;

      const isBlocked = edge.kind === 'blocked_by';
      // Flow from source right edge to target left edge
      const startX = sourcePos.x + NODE_WIDTH;
      const startY = sourcePos.y + NODE_HEIGHT / 2;
      const endX = targetPos.x;
      const endY = targetPos.y + NODE_HEIGHT / 2;

      const midX = (startX + endX) / 2;
      const path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

      layoutEdges.push({
        id: `${edge.target_id}->${t.id}`,
        sourceId: edge.target_id,
        targetId: t.id,
        kind: isBlocked ? 'blocked_by' : 'related_to',
        path,
      });
    });
  });

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds: { width: Math.max(maxX, 1000), height: Math.max(maxY, 700) },
  };
}
