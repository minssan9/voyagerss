const { dijkstra, buildGraph } = require('../../utils/dijkstra');

/**
 * Pathfinding Service
 * Handles shortest path calculations using Dijkstra's algorithm
 */
class PathfindingService {
  constructor(waypointRepository, logger = console) {
    this.waypointRepository = waypointRepository;
    this.logger = logger;
    this.graphCache = null;
    this.graphCacheTime = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Find shortest route between two waypoints
   * @param {string} startWaypointId - Start waypoint ID
   * @param {string} endWaypointId - End waypoint ID
   * @param {Object} options - Pathfinding options
   * @param {boolean} [options.avoidStairs] - Avoid stairs (use elevators)
   * @param {boolean} [options.accessibleOnly] - Only wheelchair accessible routes
   * @returns {Promise<Object>} Route with path, distance, and waypoint details
   */
  async findRoute(startWaypointId, endWaypointId, options = {}) {
    try {
      const { avoidStairs = false, accessibleOnly = false } = options;

      this.logger.log(`🔍 Finding route: ${startWaypointId} → ${endWaypointId}`);

      // Build or get cached graph
      const graph = await this.getGraph();

      // Apply filters based on options
      const filter = (from, neighbor) => {
        const connection = neighbor.connection;

        // Filter out stairs if requested
        if (avoidStairs && connection.connection_type === 'STAIRS') {
          return false;
        }

        // Filter out non-accessible connections if requested
        if (accessibleOnly && !connection.is_accessible) {
          return false;
        }

        return true;
      };

      // Run Dijkstra
      const result = dijkstra(graph, startWaypointId, endWaypointId, { filter });

      if (!result.found) {
        this.logger.warn(`⚠️ No path found: ${startWaypointId} → ${endWaypointId}`);
        return null;
      }

      // Get waypoint details for the path
      const waypointDetails = await this.getWaypointDetails(result.path);

      // Calculate total distance and time
      const { totalDistance, totalTime, segments } = await this.calculateRouteMetrics(
        result.path,
        graph
      );

      this.logger.log(`✅ Route found: ${result.path.length} waypoints, ${totalDistance}m, ${totalTime} mins`);

      return {
        path: result.path,
        waypoints: waypointDetails,
        segments,
        totalDistance,
        totalTime,
        algorithm: 'dijkstra'
      };
    } catch (error) {
      this.logger.error('❌ Pathfinding error:', error);
      throw error;
    }
  }

  /**
   * Get or build waypoint graph
   * @returns {Promise<Object>} Adjacency list graph
   */
  async getGraph() {
    const now = Date.now();

    // Return cached graph if still valid
    if (this.graphCache && this.graphCacheTime && (now - this.graphCacheTime < this.CACHE_TTL)) {
      this.logger.log('📦 Using cached graph');
      return this.graphCache;
    }

    this.logger.log('🔨 Building waypoint graph...');

    // Fetch all connections
    const connections = await this.waypointRepository.getAllConnections();

    // Build graph
    this.graphCache = buildGraph(connections);
    this.graphCacheTime = now;

    this.logger.log(`✅ Graph built: ${Object.keys(this.graphCache).length} nodes, ${connections.length} edges`);

    return this.graphCache;
  }

  /**
   * Clear graph cache (call after waypoint/connection updates)
   */
  clearCache() {
    this.graphCache = null;
    this.graphCacheTime = null;
    this.logger.log('🗑️ Graph cache cleared');
  }

  /**
   * Get waypoint details for a path
   * @param {Array<string>} waypointIds - Array of waypoint IDs
   * @returns {Promise<Array>} Array of waypoint objects
   */
  async getWaypointDetails(waypointIds) {
    const waypoints = [];

    for (const id of waypointIds) {
      const waypoint = await this.waypointRepository.findById(id);
      if (waypoint) {
        waypoints.push(waypoint);
      }
    }

    return waypoints;
  }

  /**
   * Calculate route metrics (distance, time, segments)
   * @param {Array<string>} path - Array of waypoint IDs
   * @param {Object} graph - Adjacency list graph
   * @returns {Promise<Object>} Route metrics
   */
  async calculateRouteMetrics(path, graph) {
    let totalDistance = 0;
    let totalTime = 0;
    const segments = [];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      // Find connection between from and to
      const neighbors = graph[from] || [];
      const edge = neighbors.find(n => n.node === to);

      if (!edge) {
        this.logger.warn(`⚠️ No connection found: ${from} → ${to}`);
        continue;
      }

      const distance = edge.weight || 0;
      const time = edge.connection.walking_time_seconds || 0;

      totalDistance += distance;
      totalTime += time;

      segments.push({
        from,
        to,
        distance,
        time,
        connectionType: edge.connection.connection_type
      });
    }

    return {
      totalDistance: Math.round(totalDistance),
      totalTime: Math.round(totalTime / 60), // Convert to minutes
      segments
    };
  }

  /**
   * Find all reachable waypoints from a start point within distance
   * @param {string} startWaypointId - Start waypoint ID
   * @param {number} maxDistance - Maximum distance in meters
   * @returns {Promise<Array>} Array of reachable waypoints with distances
   */
  async findReachableWaypoints(startWaypointId, maxDistance) {
    const graph = await this.getGraph();

    // Run Dijkstra to all nodes
    const { dijkstraAll } = require('../../utils/dijkstra');
    const { distances } = dijkstraAll(graph, startWaypointId);

    // Filter by max distance
    const reachable = [];
    for (const [waypointId, distance] of Object.entries(distances)) {
      if (distance <= maxDistance && distance > 0) {
        const waypoint = await this.waypointRepository.findById(waypointId);
        if (waypoint) {
          reachable.push({
            ...waypoint,
            distance
          });
        }
      }
    }

    // Sort by distance
    reachable.sort((a, b) => a.distance - b.distance);

    return reachable;
  }

  /**
   * Get graph statistics
   * @returns {Promise<Object>} Graph statistics
   */
  async getGraphStats() {
    const graph = await this.getGraph();

    const nodes = Object.keys(graph).length;
    let edges = 0;
    let maxDegree = 0;
    let minDegree = Infinity;

    for (const node in graph) {
      const degree = graph[node].length;
      edges += degree;
      maxDegree = Math.max(maxDegree, degree);
      minDegree = Math.min(minDegree, degree);
    }

    const avgDegree = edges / nodes;

    return {
      nodes,
      edges,
      avgDegree: avgDegree.toFixed(2),
      maxDegree,
      minDegree,
      cached: this.graphCache !== null
    };
  }
}

module.exports = PathfindingService;
