import type { AnchorPosition } from '../types';
import type { Point, Rect } from './geometry';

const EXIT_MARGIN = 40;
const NODE_PADDING = 15;
const MAX_AVOIDANCE_PASSES = 80;
const BEND_PENALTY = 20;

export interface NodeRect {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeOrthogonalWaypoints(
  source: Point,
  sourceAnchor: AnchorPosition,
  target: Point,
  targetAnchor: AnchorPosition,
  allNodes?: NodeRect[],
  excludeNodeIds?: string[],
  sourceRect?: Rect,
  targetRect?: Rect,
): Point[] {
  const points = buildSafeWaypoints(source, sourceAnchor, target, targetAnchor, sourceRect, targetRect);
  if (allNodes && allNodes.length > 0) {
    return avoidThirdPartyNodes(points, allNodes, excludeNodeIds ?? [], sourceAnchor, targetAnchor);
  }
  return points;
}

// ─── Zone helpers ───────────────────────────────────────────────────────

interface Zone {
  xMin: number; xMax: number; yMin: number; yMax: number; empty: boolean;
}

interface ZonePair { src: Zone; tgt: Zone }

function makeZone(r?: Rect): Zone {
  if (!r) return { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity, empty: true };
  return {
    xMin: r.x - NODE_PADDING, xMax: r.x + r.width + NODE_PADDING,
    yMin: r.y - NODE_PADDING, yMax: r.y + r.height + NODE_PADDING,
    empty: false,
  };
}

function pairZone(src?: Rect, tgt?: Rect): ZonePair {
  return { src: makeZone(src), tgt: makeZone(tgt) };
}

/** Check if a horizontal or vertical segment intersects a single zone. */
function segHits(a: Point, b: Point, z: Zone): boolean {
  if (z.empty) return false;
  if (isHSeg(a, b)) {
    const y = a.y;
    if (y <= z.yMin || y >= z.yMax) return false;
    const sMin = Math.min(a.x, b.x), sMax = Math.max(a.x, b.x);
    return sMax > z.xMin && sMin < z.xMax;
  }
  if (isVSeg(a, b)) {
    const x = a.x;
    if (x <= z.xMin || x >= z.xMax) return false;
    const sMin = Math.min(a.y, b.y), sMax = Math.max(a.y, b.y);
    return sMax > z.yMin && sMin < z.yMax;
  }
  return false;
}

/** Check if a segment intersects either zone. */
function segHitsEither(a: Point, b: Point, pair: ZonePair): boolean {
  return segHits(a, b, pair.src) || segHits(a, b, pair.tgt);
}

/**
 * The direct corner is safe iff:
 * - p1→corner doesn't touch EITHER node body
 * - corner→pN doesn't touch EITHER node body
 * Checking individually (not merged) means gaps between the two nodes
 * are correctly recognized as safe passage.
 */
function cornerSafe(corner: Point, p1: Point, pN: Point, pair: ZonePair): boolean {
  return !segHitsEither(p1, corner, pair) && !segHitsEither(corner, pN, pair);
}

/**
 * Find a coordinate on the given axis that:
 * 1. Lies between `a` and `b` (preferably midpoint)
 * 2. Avoids passing through EITHER individual zone
 * If both zones block the midpoint, pick the gap between them
 * or the nearer edge.
 */
function safeCrossCoord(axis: 'x' | 'y', a: number, b: number, pair: ZonePair): number {
  if (pair.src.empty && pair.tgt.empty) return (a + b) / 2;

  const rangeMin = Math.min(a, b);
  const rangeMax = Math.max(a, b);

  // Collect all forbidden intervals on this axis (from both zones, individually)
  const intervals: { min: number; max: number }[] = [];
  for (const z of [pair.src, pair.tgt]) {
    if (!z.empty) {
      const zMin = axis === 'y' ? z.yMin : z.xMin;
      const zMax = axis === 'y' ? z.yMax : z.xMax;
      if (zMax > rangeMin && zMin < rangeMax) {
        intervals.push({ min: zMin, max: zMax });
      }
    }
  }
  if (intervals.length === 0) return (a + b) / 2;

  // Sort intervals
  intervals.sort((x, y) => x.min - y.min);

  // Try midpoint first
  const mid = (a + b) / 2;
  let blocked = false;
  for (const int of intervals) {
    if (mid >= int.min && mid <= int.max) {
      blocked = true;
      break;
    }
  }
  if (!blocked) return mid;

  // intervals is non-empty after early return above
  const first = intervals[0]!;
  const last = intervals[intervals.length - 1]!;

  // Midpoint is blocked — find a path: go above the lowest interval or below the highest
  // Prefer going above (closer to the source-direction exit)
  if (rangeMin < first.min) {
    const gap = Math.max(rangeMin + EXIT_MARGIN, (rangeMin + first.min) / 2);
    if (gap < first.min) return gap;
  }

  if (rangeMax > last.max) {
    const gap = Math.min(rangeMax - EXIT_MARGIN, (rangeMax + last.max) / 2);
    if (gap > last.max) return gap;
  }

  // Also check gaps between intervals
  for (let i = 1; i < intervals.length; i++) {
    const prevMax = intervals[i - 1]!.max;
    const nextMin = intervals[i]!.min;
    if (nextMin - prevMax > EXIT_MARGIN * 2) {
      return (prevMax + nextMin) / 2;
    }
  }

  // Fallback: pick the nearer edge of the combined forbidden range
  return (mid - first.min) <= (last.max - mid) ? first.min : last.max;
}

// ─── Routing ────────────────────────────────────────────────────────────

function buildSafeWaypoints(
  source: Point, sourceAnchor: AnchorPosition,
  target: Point, targetAnchor: AnchorPosition,
  sourceRect?: Rect, targetRect?: Rect,
): Point[] {
  const paths: Point[] = [source];
  const srcDir = getDir(sourceAnchor);
  const tgtDir = getDir(targetAnchor);
  const z = pairZone(sourceRect, targetRect);

  // Opposite anchors perfectly aligned → straight line
  if (areOppositeAnchors(sourceAnchor, targetAnchor) && aligned(source, sourceAnchor, target)) {
    paths.push(target);
    return paths;
  }

  const p1: Point = { x: source.x + srcDir.x * EXIT_MARGIN, y: source.y + srcDir.y * EXIT_MARGIN };
  paths.push(p1);
  const pN: Point = { x: target.x + tgtDir.x * EXIT_MARGIN, y: target.y + tgtDir.y * EXIT_MARGIN };

  const srcH = sourceAnchor === 'left' || sourceAnchor === 'right';
  const tgtH = targetAnchor === 'left' || targetAnchor === 'right';

  if (sourceAnchor === targetAnchor) {
    sameSide(paths, p1, pN, sourceAnchor, srcDir, z);
  } else if (srcH && tgtH) {
    bothH(paths, p1, pN, srcDir, z);
  } else if (!srcH && !tgtH) {
    bothV(paths, p1, pN, srcDir, z);
  } else if (srcH) {
    hToV(paths, p1, pN, srcDir, z);
  } else {
    vToH(paths, p1, pN, srcDir, z);
  }

  paths.push(pN);
  paths.push(target);
  return paths;
}

// ─── Same side ──────────────────────────────────────────────────────────

function sameSide(paths: Point[], p1: Point, pN: Point, anchor: AnchorPosition, dir: Point, z: ZonePair) {
  const h = anchor === 'left' || anchor === 'right';
  const c = h ? 'x' : 'y';
  const perp = h ? 'y' : 'x';

  // Extend past the furthest node body edge
  const fwd = dir[c] > 0;
  let furthest: number;
  if (fwd) {
    furthest = Math.max(
      z.src.empty ? -Infinity : z.src[c + 'Max' as 'xMax' | 'yMax'],
      z.tgt.empty ? -Infinity : z.tgt[c + 'Max' as 'xMax' | 'yMax'],
      p1[c], pN[c],
    );
  } else {
    furthest = Math.min(
      z.src.empty ? Infinity : z.src[c + 'Min' as 'xMin' | 'yMin'],
      z.tgt.empty ? Infinity : z.tgt[c + 'Min' as 'xMin' | 'yMin'],
      p1[c], pN[c],
    );
  }
  const ext = furthest + dir[c] * EXIT_MARGIN;

  const cross = safeCrossCoord(perp as 'x' | 'y', p1[perp] as number, pN[perp] as number, z);

  if (h) {
    paths.push({ x: ext, y: p1.y });
    paths.push({ x: ext, y: cross });
    paths.push({ x: pN.x, y: cross });
  } else {
    paths.push({ x: p1.x, y: ext });
    paths.push({ x: cross, y: ext });
    paths.push({ x: cross, y: pN.y });
  }
}

// ─── Both horizontal ────────────────────────────────────────────────────

function bothH(paths: Point[], p1: Point, pN: Point, srcDir: Point, z: ZonePair) {
  const back = (srcDir.x > 0 && pN.x < p1.x) || (srcDir.x < 0 && pN.x > p1.x);
  if (!back) {
    const directCorner: Point = { x: p1.x, y: pN.y };
    if (cornerSafe(directCorner, p1, pN, z)) {
      paths.push(directCorner);
      return;
    }

    const alternateCorner: Point = { x: pN.x, y: p1.y };
    if (cornerSafe(alternateCorner, p1, pN, z)) {
      paths.push(alternateCorner);
      return;
    }
  }

  const crossY = safeCrossCoord('y', p1.y, pN.y, z);
  if (back) {
    const extX = p1.x + srcDir.x * EXIT_MARGIN;
    paths.push({ x: extX, y: p1.y });
    paths.push({ x: extX, y: crossY });
  } else {
    paths.push({ x: p1.x, y: crossY });
  }
  paths.push({ x: pN.x, y: crossY });
}

// ─── Both vertical ──────────────────────────────────────────────────────

function bothV(paths: Point[], p1: Point, pN: Point, srcDir: Point, z: ZonePair) {
  const back = (srcDir.y > 0 && pN.y < p1.y) || (srcDir.y < 0 && pN.y > p1.y);
  if (!back) {
    const directCorner: Point = { x: pN.x, y: p1.y };
    if (cornerSafe(directCorner, p1, pN, z)) {
      paths.push(directCorner);
      return;
    }

    const alternateCorner: Point = { x: p1.x, y: pN.y };
    if (cornerSafe(alternateCorner, p1, pN, z)) {
      paths.push(alternateCorner);
      return;
    }
  }

  const crossX = safeCrossCoord('x', p1.x, pN.x, z);
  if (back) {
    const extY = p1.y + srcDir.y * EXIT_MARGIN;
    paths.push({ x: p1.x, y: extY });
    paths.push({ x: crossX, y: extY });
  } else {
    paths.push({ x: crossX, y: p1.y });
  }
  paths.push({ x: crossX, y: pN.y });
}

// ─── Horizontal → Vertical ──────────────────────────────────────────────

/**
 * Source exits horizontally, target enters vertically.
 * Direct corner: (pN.x, p1.y).
 * Only 3 segments total when safe: source→p1→corner→pN→target.
 */
function hToV(paths: Point[], p1: Point, pN: Point, srcDir: Point, z: ZonePair) {
  const corner: Point = { x: pN.x, y: p1.y };
  if (cornerSafe(corner, p1, pN, z)) {
    paths.push(corner);
    return;
  }
  // Try extend then corner: go further in src direction, then L-turn
  const extX = p1.x + srcDir.x * EXIT_MARGIN;
  const c2: Point = { x: extX, y: pN.y };
  if (cornerSafe(c2, { x: extX, y: p1.y }, pN, z)) {
    paths.push({ x: extX, y: p1.y });
    paths.push(c2);
    return;
  }
  // Need full detour
  detourHV(paths, p1, pN, srcDir, 'h', z);
}

// ─── Vertical → Horizontal ──────────────────────────────────────────────

/**
 * Source exits vertically, target enters horizontally.
 * Direct corner: (p1.x, pN.y).
 * Only 3 segments total when safe: source→p1→corner→pN→target.
 */
function vToH(paths: Point[], p1: Point, pN: Point, srcDir: Point, z: ZonePair) {
  const corner: Point = { x: p1.x, y: pN.y };
  if (cornerSafe(corner, p1, pN, z)) {
    paths.push(corner);
    return;
  }
  // Try extend then corner: go further in src direction, then L-turn
  const extY = p1.y + srcDir.y * EXIT_MARGIN;
  const c2: Point = { x: pN.x, y: extY };
  if (cornerSafe(c2, { x: p1.x, y: extY }, pN, z)) {
    paths.push({ x: p1.x, y: extY });
    paths.push(c2);
    return;
  }
  // Need full detour
  detourHV(paths, p1, pN, srcDir, 'v', z);
}

// ─── Full detour when simple corner doesn't work ────────────────────────

/**
 * Route completely around the forbidden zones.
 * Escape perpendicularly first, then go in source direction past both zones,
 * then come back to pN.
 */
function detourHV(
  paths: Point[], p1: Point, pN: Point,
  srcDir: Point, srcType: 'h' | 'v', z: ZonePair,
) {
  const sc = srcType === 'h' ? 'x' : 'y';
  const pc = srcType === 'h' ? 'y' : 'x';

  // Determine escape side perpendicularly (pick side closer to pN)
  const zMin = Math.min(
    z.src.empty ? Infinity : z.src[pc + 'Min' as 'xMin' | 'yMin'],
    z.tgt.empty ? Infinity : z.tgt[pc + 'Min' as 'xMin' | 'yMin'],
  );
  const zMax = Math.max(
    z.src.empty ? -Infinity : z.src[pc + 'Max' as 'xMax' | 'yMax'],
    z.tgt.empty ? -Infinity : z.tgt[pc + 'Max' as 'xMax' | 'yMax'],
  );
  const mid = (zMin + zMax) / 2;
  const goMin = (pN[pc] as number) < mid;
  const perpEscape = goMin ? zMin - EXIT_MARGIN : zMax + EXIT_MARGIN;

  // Go past forbidden zone in source direction
  const srcMin = Math.min(
    z.src.empty ? Infinity : z.src[sc + 'Min' as 'xMin' | 'yMin'],
    z.tgt.empty ? Infinity : z.tgt[sc + 'Min' as 'xMin' | 'yMin'],
  );
  const srcMax = Math.max(
    z.src.empty ? -Infinity : z.src[sc + 'Max' as 'xMax' | 'yMax'],
    z.tgt.empty ? -Infinity : z.tgt[sc + 'Max' as 'xMax' | 'yMax'],
  );
  const srcPast = srcDir[sc] > 0 ? srcMax + EXIT_MARGIN : srcMin - EXIT_MARGIN;

  if (srcType === 'h') {
    paths.push({ x: p1.x, y: perpEscape });
    paths.push({ x: srcPast, y: perpEscape });
    paths.push({ x: srcPast, y: pN.y });
  } else {
    paths.push({ x: perpEscape, y: p1.y });
    paths.push({ x: perpEscape, y: srcPast });
    paths.push({ x: pN.x, y: srcPast });
  }
}

// ─── Third-party node avoidance ─────────────────────────────────────────

function avoidThirdPartyNodes(
  points: Point[],
  nodes: NodeRect[],
  excludeIds: string[],
  sourceAnchor: AnchorPosition,
  targetAnchor: AnchorPosition,
): Point[] {
  const toAvoid = nodes.filter((n) => n.type !== 'text' && !excludeIds.includes(n.id));
  if (toAvoid.length === 0) return points;

  if (!findFirstBlockedSegment(points, toAvoid)) return points;

  const globalRoute = routeAroundAllNodes(points, toAvoid, sourceAnchor, targetAnchor);
  if (globalRoute) return globalRoute;

  let result = cleanPath(points);
  for (let pass = 0; pass < MAX_AVOIDANCE_PASSES; pass++) {
    const hit = findFirstBlockedSegment(result, toAvoid);
    if (!hit) return result;

    const a = result[hit.segmentEndIndex - 1]!;
    const b = result[hit.segmentEndIndex]!;
    const detour = routeAroundNode(a, b, hit.node);
    result = cleanPath([
      ...result.slice(0, hit.segmentEndIndex),
      ...detour,
      ...result.slice(hit.segmentEndIndex + 1),
    ]);
  }
  return result;
}

function routeAroundAllNodes(
  points: Point[],
  nodes: NodeRect[],
  sourceAnchor: AnchorPosition,
  targetAnchor: AnchorPosition,
): Point[] | null {
  const source = points[0]!;
  const target = points[points.length - 1]!;
  const startExit = chooseEndpoint(source, points[1], sourceAnchor, nodes, 'source');
  const endExit = chooseEndpoint(target, points[points.length - 2], targetAnchor, nodes, 'target');

  const prefix = startExit === source ? [] : [source];
  const suffix = endExit === target ? [] : [target];
  const endDir = endExit === target ? null : targetAnchor === 'left' || targetAnchor === 'right' ? 'v' : 'h';
  const routed = findGridRoute(startExit, endExit, points, nodes, endDir)
    ?? findGridRoute(startExit, endExit, points, nodes, null);
  if (!routed) return null;

  return cleanPath([...prefix, ...routed, ...suffix]);
}

function chooseEndpoint(
  anchorPoint: Point,
  existingExit: Point | undefined,
  anchor: AnchorPosition,
  nodes: NodeRect[],
  role: 'source' | 'target',
): Point {
  const candidates: Point[] = [];
  if (existingExit) candidates.push(existingExit);

  const dir = getDir(anchor);
  candidates.push({
    x: anchorPoint.x + dir.x * EXIT_MARGIN,
    y: anchorPoint.y + dir.y * EXIT_MARGIN,
  });

  for (const candidate of candidates) {
    const a = role === 'source' ? anchorPoint : candidate;
    const b = role === 'source' ? candidate : anchorPoint;
    if (!pointBlocked(candidate, nodes) && segmentClear(a, b, nodes)) return candidate;
  }
  return anchorPoint;
}

function findGridRoute(
  start: Point,
  end: Point,
  basePoints: Point[],
  nodes: NodeRect[],
  endDir: 'h' | 'v' | null,
): Point[] | null {
  const xs = uniqueSorted([start.x, end.x, ...basePoints.map((p) => p.x)]);
  const ys = uniqueSorted([start.y, end.y, ...basePoints.map((p) => p.y)]);

  for (const node of nodes) {
    const bounds = paddedBounds(node);
    xs.push(bounds.left, bounds.right);
    ys.push(bounds.top, bounds.bottom);
  }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);

  const valid = new Set<string>();
  const pointByKey = new Map<string, Point>();
  for (const x of uniqueSorted(xs)) {
    for (const y of uniqueSorted(ys)) {
      const point = { x, y };
      if (pointBlocked(point, nodes)) continue;
      const key = pointKey(point);
      valid.add(key);
      pointByKey.set(key, point);
    }
  }

  const startKey = pointKey(start);
  const endKey = pointKey(end);
  if (!valid.has(startKey) || !valid.has(endKey)) return null;

  const edges = new Map<string, { key: string; dir: 'h' | 'v'; cost: number }[]>();
  for (const y of uniqueSorted(ys)) {
    const row = uniqueSorted(xs).map((x) => ({ x, y })).filter((p) => valid.has(pointKey(p)));
    for (let i = 1; i < row.length; i++) addGridEdge(row[i - 1]!, row[i]!, 'h', nodes, edges);
  }
  for (const x of uniqueSorted(xs)) {
    const col = uniqueSorted(ys).map((y) => ({ x, y })).filter((p) => valid.has(pointKey(p)));
    for (let i = 1; i < col.length; i++) addGridEdge(col[i - 1]!, col[i]!, 'v', nodes, edges);
  }

  return runShortestPath(startKey, endKey, pointByKey, edges, endDir);
}

function addGridEdge(
  a: Point,
  b: Point,
  dir: 'h' | 'v',
  nodes: NodeRect[],
  edges: Map<string, { key: string; dir: 'h' | 'v'; cost: number }[]>,
) {
  if (!segmentClear(a, b, nodes)) return;
  const ak = pointKey(a);
  const bk = pointKey(b);
  const cost = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  if (!edges.has(ak)) edges.set(ak, []);
  if (!edges.has(bk)) edges.set(bk, []);
  edges.get(ak)!.push({ key: bk, dir, cost });
  edges.get(bk)!.push({ key: ak, dir, cost });
}

function runShortestPath(
  startKey: string,
  endKey: string,
  pointByKey: Map<string, Point>,
  edges: Map<string, { key: string; dir: 'h' | 'v'; cost: number }[]>,
  endDir: 'h' | 'v' | null,
): Point[] | null {
  type Dir = 'h' | 'v' | 'start';
  interface State { key: string; dir: Dir }

  const stateKey = (state: State) => `${state.key}|${state.dir}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const queue: { state: State; cost: number }[] = [{ state: { key: startKey, dir: 'start' }, cost: 0 }];
  dist.set(stateKey(queue[0]!.state), 0);

  let finalState: string | null = null;
  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    const currentKey = stateKey(current.state);
    if (current.cost !== dist.get(currentKey)) continue;
    if (current.state.key === endKey && (!endDir || current.state.dir === endDir || current.state.dir === 'start')) {
      finalState = currentKey;
      break;
    }

    for (const edge of edges.get(current.state.key) ?? []) {
      const turnCost = current.state.dir !== 'start' && current.state.dir !== edge.dir ? BEND_PENALTY : 0;
      const nextState: State = { key: edge.key, dir: edge.dir };
      const nextKey = stateKey(nextState);
      const nextCost = current.cost + edge.cost + turnCost;
      if (nextCost >= (dist.get(nextKey) ?? Infinity)) continue;
      dist.set(nextKey, nextCost);
      prev.set(nextKey, currentKey);
      queue.push({ state: nextState, cost: nextCost });
    }
  }

  if (!finalState) return null;

  const keys: string[] = [];
  for (let key: string | undefined = finalState; key; key = prev.get(key)) {
    keys.push(key.split('|')[0]!);
  }
  keys.reverse();
  return cleanPath(keys.map((key) => pointByKey.get(key)!));
}

interface SegmentHit {
  node: NodeRect;
  segmentEndIndex: number;
  distance: number;
}

function findFirstBlockedSegment(points: Point[], nodes: NodeRect[]): SegmentHit | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    let nearest: SegmentHit | null = null;
    for (const node of nodes) {
      const distance = segmentNodeHitDistance(a, b, node);
      if (distance === null) continue;
      if (!nearest || distance < nearest.distance) {
        nearest = { node, segmentEndIndex: i, distance };
      }
    }
    if (nearest) return nearest;
  }
  return null;
}

function segmentNodeHitDistance(a: Point, b: Point, node: NodeRect): number | null {
  const bounds = paddedBounds(node);
  if (isHSeg(a, b)) {
    if (a.y <= bounds.top || a.y >= bounds.bottom) return null;
    const segMin = Math.min(a.x, b.x);
    const segMax = Math.max(a.x, b.x);
    if (segMax <= bounds.left || segMin >= bounds.right) return null;
    const entryX = b.x >= a.x ? Math.max(a.x, bounds.left) : Math.min(a.x, bounds.right);
    return Math.abs(entryX - a.x);
  }
  if (isVSeg(a, b)) {
    if (a.x <= bounds.left || a.x >= bounds.right) return null;
    const segMin = Math.min(a.y, b.y);
    const segMax = Math.max(a.y, b.y);
    if (segMax <= bounds.top || segMin >= bounds.bottom) return null;
    const entryY = b.y >= a.y ? Math.max(a.y, bounds.top) : Math.min(a.y, bounds.bottom);
    return Math.abs(entryY - a.y);
  }
  return null;
}

function routeAroundNode(a: Point, b: Point, node: NodeRect): Point[] {
  const bounds = paddedBounds(node);
  if (isHSeg(a, b)) {
    const movingRight = b.x >= a.x;
    const entryX = movingRight ? bounds.left : bounds.right;
    const exitX = movingRight ? bounds.right : bounds.left;
    const goUp = (a.y - bounds.top) <= (bounds.bottom - a.y);
    const offY = goUp ? bounds.top : bounds.bottom;
    return [
      { x: entryX, y: a.y },
      { x: entryX, y: offY },
      { x: exitX, y: offY },
      { x: exitX, y: a.y },
      b,
    ];
  }
  if (isVSeg(a, b)) {
    const movingDown = b.y >= a.y;
    const entryY = movingDown ? bounds.top : bounds.bottom;
    const exitY = movingDown ? bounds.bottom : bounds.top;
    const goLeft = (a.x - bounds.left) <= (bounds.right - a.x);
    const offX = goLeft ? bounds.left : bounds.right;
    return [
      { x: a.x, y: entryY },
      { x: offX, y: entryY },
      { x: offX, y: exitY },
      { x: a.x, y: exitY },
      b,
    ];
  }
  return [b];
}

function paddedBounds(node: NodeRect) {
  return {
    left: node.x - NODE_PADDING,
    right: node.x + node.width + NODE_PADDING,
    top: node.y - NODE_PADDING,
    bottom: node.y + node.height + NODE_PADDING,
  };
}

function pointBlocked(point: Point, nodes: NodeRect[]): boolean {
  return nodes.some((node) => {
    const bounds = paddedBounds(node);
    return point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom;
  });
}

function segmentClear(a: Point, b: Point, nodes: NodeRect[]): boolean {
  return !nodes.some((node) => segmentNodeHitDistance(a, b, node) !== null);
}

function cleanPath(points: Point[]): Point[] {
  const cleaned: Point[] = [];
  for (const point of points) {
    const prev = cleaned[cleaned.length - 1];
    if (!prev || prev.x !== point.x || prev.y !== point.y) cleaned.push(point);
  }

  const simplified: Point[] = [];
  for (const point of cleaned) {
    simplified.push(point);
    while (simplified.length >= 3) {
      const a = simplified[simplified.length - 3]!;
      const b = simplified[simplified.length - 2]!;
      const c = simplified[simplified.length - 1]!;
      if ((isHSeg(a, b) && isHSeg(b, c)) || (isVSeg(a, b) && isVSeg(b, c))) {
        simplified.splice(simplified.length - 2, 1);
      } else {
        break;
      }
    }
  }
  return simplified;
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`;
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

// ─── Geometry helpers ────────────────────────────────────────────────────

function isHSeg(a: Point, b: Point): boolean {
  return Math.abs(a.y - b.y) < 0.5;
}
function isVSeg(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.5;
}

export function buildRoundedPath(points: Point[], _cornerRadius: number): string {
  if (points.length === 0) return '';
  const cleaned: Point[] = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const prev = cleaned[cleaned.length - 1]!;
    if (points[i]!.x !== prev.x || points[i]!.y !== prev.y) cleaned.push(points[i]!);
  }
  if (cleaned.length < 2) return '';
  let d = `M ${cleaned[0]!.x} ${cleaned[0]!.y}`;
  for (let i = 1; i < cleaned.length; i++) d += ` L ${cleaned[i]!.x} ${cleaned[i]!.y}`;
  return d;
}

function getDir(anchor: AnchorPosition): Point {
  switch (anchor) {
    case 'top': return { x: 0, y: -1 };
    case 'right': return { x: 1, y: 0 };
    case 'bottom': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
  }
}

function areOppositeAnchors(a: AnchorPosition, b: AnchorPosition): boolean {
  return (a === 'top' && b === 'bottom') || (a === 'bottom' && b === 'top')
    || (a === 'left' && b === 'right') || (a === 'right' && b === 'left');
}

function aligned(source: Point, sourceAnchor: AnchorPosition, target: Point): boolean {
  if (sourceAnchor === 'left' || sourceAnchor === 'right') return Math.abs(source.y - target.y) < 2;
  return Math.abs(source.x - target.x) < 2;
}
