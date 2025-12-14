/**
 * Priority Queue implementation for Dijkstra's algorithm
 * Uses a min-heap structure for efficient priority operations
 */
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  /**
   * Add element with priority
   * @param {*} element - Element to add
   * @param {number} priority - Priority value (lower = higher priority)
   */
  enqueue(element, priority) {
    this.values.push({ element, priority });
    this.bubbleUp();
  }

  /**
   * Remove and return element with highest priority (lowest value)
   * @returns {*} Element with highest priority
   */
  dequeue() {
    const min = this.values[0];
    const end = this.values.pop();

    if (this.values.length > 0) {
      this.values[0] = end;
      this.sinkDown();
    }

    return min?.element;
  }

  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.values.length === 0;
  }

  /**
   * Move element up the heap to maintain min-heap property
   */
  bubbleUp() {
    let idx = this.values.length - 1;
    const element = this.values[idx];

    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.values[parentIdx];

      if (element.priority >= parent.priority) break;

      this.values[parentIdx] = element;
      this.values[idx] = parent;
      idx = parentIdx;
    }
  }

  /**
   * Move element down the heap to maintain min-heap property
   */
  sinkDown() {
    let idx = 0;
    const length = this.values.length;
    const element = this.values[0];

    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this.values[leftChildIdx];
        if (leftChild.priority < element.priority) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this.values[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < leftChild.priority)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;

      this.values[idx] = this.values[swap];
      this.values[swap] = element;
      idx = swap;
    }
  }
}

/**
 * Dijkstra's shortest path algorithm
 * @param {Object} graph - Adjacency list representation of graph
 *   Format: { nodeId: [{ node: neighborId, weight: distance }] }
 * @param {string} start - Start node ID
 * @param {string} end - End node ID
 * @param {Object} options - Algorithm options
 * @param {Function} [options.filter] - Filter function for edges
 * @returns {Object} Result object with path, distance, and visited nodes
 */
function dijkstra(graph, start, end, options = {}) {
  const { filter } = options;

  // Validation
  if (!graph[start]) {
    throw new Error(`Start node '${start}' not found in graph`);
  }
  if (!graph[end]) {
    throw new Error(`End node '${end}' not found in graph`);
  }

  // Initialize data structures
  const distances = {};
  const previous = {};
  const visited = new Set();
  const pq = new PriorityQueue();

  // Set all distances to infinity except start
  for (const node in graph) {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  }

  pq.enqueue(start, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue();

    // Skip if already visited
    if (visited.has(current)) continue;
    visited.add(current);

    // Found the destination
    if (current === end) {
      break;
    }

    // Process neighbors
    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      // Apply filter if provided
      if (filter && !filter(current, neighbor)) {
        continue;
      }

      const newDistance = distances[current] + neighbor.weight;

      if (newDistance < distances[neighbor.node]) {
        distances[neighbor.node] = newDistance;
        previous[neighbor.node] = current;
        pq.enqueue(neighbor.node, newDistance);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let current = end;

  if (previous[end] !== null || current === start) {
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
  }

  return {
    path,
    distance: distances[end],
    found: distances[end] !== Infinity,
    visited: Array.from(visited)
  };
}

/**
 * Build adjacency list graph from connections
 * @param {Array} connections - Array of connection objects
 *   Format: [{ from_waypoint_id, to_waypoint_id, distance_meters, ... }]
 * @returns {Object} Adjacency list graph
 */
function buildGraph(connections) {
  const graph = {};

  for (const connection of connections) {
    const from = connection.from_waypoint_id;
    const to = connection.to_waypoint_id;
    const weight = connection.distance_meters || 1;

    if (!graph[from]) {
      graph[from] = [];
    }

    graph[from].push({
      node: to,
      weight,
      connection
    });
  }

  return graph;
}

/**
 * Find all shortest paths from a start node
 * @param {Object} graph - Adjacency list graph
 * @param {string} start - Start node ID
 * @returns {Object} Distances and paths to all nodes
 */
function dijkstraAll(graph, start) {
  if (!graph[start]) {
    throw new Error(`Start node '${start}' not found in graph`);
  }

  const distances = {};
  const previous = {};
  const visited = new Set();
  const pq = new PriorityQueue();

  for (const node in graph) {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  }

  pq.enqueue(start, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue();

    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = graph[current] || [];
    for (const neighbor of neighbors) {
      const newDistance = distances[current] + neighbor.weight;

      if (newDistance < distances[neighbor.node]) {
        distances[neighbor.node] = newDistance;
        previous[neighbor.node] = current;
        pq.enqueue(neighbor.node, newDistance);
      }
    }
  }

  return { distances, previous };
}

module.exports = {
  dijkstra,
  dijkstraAll,
  buildGraph,
  PriorityQueue
};
