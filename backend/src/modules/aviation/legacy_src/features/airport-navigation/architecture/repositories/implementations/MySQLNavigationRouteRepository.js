const INavigationRouteRepository = require('../interfaces/INavigationRouteRepository');
const crypto = require('crypto');

/**
 * MySQL implementation of Navigation Route Repository
 * Handles all navigation route history data operations
 */
class MySQLNavigationRouteRepository extends INavigationRouteRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all navigation routes
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findAll(options = {}) {
    const { limit = 100, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM navigation_routes
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `;
    return await this.db.all(sql, [limit, offset]);
  }

  /**
   * Get navigation route by ID
   * @param {string} id - Navigation route ID
   * @returns {Promise<Object|null>} Navigation route record or null
   */
  async findById(id) {
    const sql = `
      SELECT *
      FROM navigation_routes
      WHERE id = ?
    `;
    const route = await this.db.get(sql, [id]);

    if (route && route.route_waypoints) {
      // Parse JSON if it's a string
      route.route_waypoints = typeof route.route_waypoints === 'string'
        ? JSON.parse(route.route_waypoints)
        : route.route_waypoints;
    }

    return route;
  }

  /**
   * Get routes by user
   * @param {number} telegramUserId - Telegram user ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByUser(telegramUserId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let sql = `
      SELECT *
      FROM navigation_routes
      WHERE telegram_user_id = ?
    `;
    const params = [telegramUserId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY started_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const routes = await this.db.all(sql, params);

    // Parse JSON route_waypoints
    return routes.map(route => ({
      ...route,
      route_waypoints: typeof route.route_waypoints === 'string'
        ? JSON.parse(route.route_waypoints)
        : route.route_waypoints
    }));
  }

  /**
   * Get active route for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object|null>} Active navigation route or null
   */
  async findActiveRouteByUser(telegramUserId) {
    const sql = `
      SELECT *
      FROM navigation_routes
      WHERE telegram_user_id = ?
      AND status = 'ACTIVE'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const route = await this.db.get(sql, [telegramUserId]);

    if (route && route.route_waypoints) {
      route.route_waypoints = typeof route.route_waypoints === 'string'
        ? JSON.parse(route.route_waypoints)
        : route.route_waypoints;
    }

    return route;
  }

  /**
   * Get routes by flight number
   * @param {string} flightNumber - Flight number
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByFlightNumber(flightNumber, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM navigation_routes
      WHERE flight_number = ?
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `;
    const routes = await this.db.all(sql, [flightNumber, limit, offset]);

    return routes.map(route => ({
      ...route,
      route_waypoints: typeof route.route_waypoints === 'string'
        ? JSON.parse(route.route_waypoints)
        : route.route_waypoints
    }));
  }

  /**
   * Get routes by status
   * @param {string} status - Route status
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByStatus(status, options = {}) {
    const { limit = 100, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM navigation_routes
      WHERE status = ?
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `;
    const routes = await this.db.all(sql, [status, limit, offset]);

    return routes.map(route => ({
      ...route,
      route_waypoints: typeof route.route_waypoints === 'string'
        ? JSON.parse(route.route_waypoints)
        : route.route_waypoints
    }));
  }

  /**
   * Create new navigation route
   * @param {Object} routeData - Navigation route data
   * @returns {Promise<string>} Inserted route ID
   */
  async create(routeData) {
    const routeId = routeData.id || crypto.randomUUID();

    const sql = `
      INSERT INTO navigation_routes (
        id, telegram_user_id, flight_number,
        start_waypoint_id, end_waypoint_id, route_waypoints,
        total_distance_meters, estimated_time_minutes,
        map_image_path, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const routeWaypoints = Array.isArray(routeData.route_waypoints)
      ? JSON.stringify(routeData.route_waypoints)
      : routeData.route_waypoints;

    await this.db.execute(sql, [
      routeId,
      routeData.telegram_user_id,
      routeData.flight_number || null,
      routeData.start_waypoint_id,
      routeData.end_waypoint_id,
      routeWaypoints,
      routeData.total_distance_meters || null,
      routeData.estimated_time_minutes || null,
      routeData.map_image_path || null,
      routeData.status || 'ACTIVE'
    ]);

    return routeId;
  }

  /**
   * Update navigation route
   * @param {string} id - Navigation route ID
   * @param {Object} routeData - Updated route data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, routeData) {
    const fields = [];
    const values = [];

    const fieldMapping = {
      telegram_user_id: 'telegram_user_id',
      flight_number: 'flight_number',
      start_waypoint_id: 'start_waypoint_id',
      end_waypoint_id: 'end_waypoint_id',
      total_distance_meters: 'total_distance_meters',
      estimated_time_minutes: 'estimated_time_minutes',
      map_image_path: 'map_image_path',
      status: 'status',
      completed_at: 'completed_at'
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (routeData[key] !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(routeData[key]);
      }
    }

    if (routeData.route_waypoints !== undefined) {
      fields.push('route_waypoints = ?');
      const waypoints = Array.isArray(routeData.route_waypoints)
        ? JSON.stringify(routeData.route_waypoints)
        : routeData.route_waypoints;
      values.push(waypoints);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE navigation_routes SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Update route status
   * @param {string} id - Navigation route ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updateStatus(id, status) {
    const sql = `
      UPDATE navigation_routes
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  /**
   * Mark route as completed
   * @param {string} id - Navigation route ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsCompleted(id) {
    const sql = `
      UPDATE navigation_routes
      SET status = 'COMPLETED',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Cancel active route for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelActiveRoute(telegramUserId) {
    const sql = `
      UPDATE navigation_routes
      SET status = 'CANCELLED',
          updated_at = CURRENT_TIMESTAMP
      WHERE telegram_user_id = ?
      AND status = 'ACTIVE'
    `;
    const result = await this.db.execute(sql, [telegramUserId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete navigation route
   * @param {string} id - Navigation route ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM navigation_routes WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get route statistics for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object>} Route statistics
   */
  async getUserStats(telegramUserId) {
    const totalRoutesSql = `
      SELECT COUNT(*) as count
      FROM navigation_routes
      WHERE telegram_user_id = ?
    `;
    const totalRoutes = await this.db.get(totalRoutesSql, [telegramUserId]);

    const completedRoutesSql = `
      SELECT COUNT(*) as count
      FROM navigation_routes
      WHERE telegram_user_id = ?
      AND status = 'COMPLETED'
    `;
    const completedRoutes = await this.db.get(completedRoutesSql, [telegramUserId]);

    const avgDistanceSql = `
      SELECT AVG(total_distance_meters) as avg_distance
      FROM navigation_routes
      WHERE telegram_user_id = ?
      AND total_distance_meters IS NOT NULL
    `;
    const avgDistance = await this.db.get(avgDistanceSql, [telegramUserId]);

    const avgTimeSql = `
      SELECT AVG(estimated_time_minutes) as avg_time
      FROM navigation_routes
      WHERE telegram_user_id = ?
      AND estimated_time_minutes IS NOT NULL
    `;
    const avgTime = await this.db.get(avgTimeSql, [telegramUserId]);

    return {
      total_routes: totalRoutes.count,
      completed_routes: completedRoutes.count,
      avg_distance_meters: avgDistance.avg_distance || 0,
      avg_time_minutes: avgTime.avg_time || 0
    };
  }

  /**
   * Get popular routes (most frequently used)
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Array of popular route patterns
   */
  async getPopularRoutes(limit = 10) {
    const sql = `
      SELECT
        start_waypoint_id,
        end_waypoint_id,
        COUNT(*) as usage_count,
        AVG(total_distance_meters) as avg_distance,
        AVG(estimated_time_minutes) as avg_time
      FROM navigation_routes
      WHERE status = 'COMPLETED'
      GROUP BY start_waypoint_id, end_waypoint_id
      ORDER BY usage_count DESC
      LIMIT ?
    `;
    return await this.db.all(sql, [limit]);
  }

  /**
   * Clean up old completed routes
   * @param {number} daysOld - Delete routes older than N days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldRoutes(daysOld = 30) {
    const sql = `
      DELETE FROM navigation_routes
      WHERE started_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND status IN ('COMPLETED', 'CANCELLED')
    `;
    const result = await this.db.execute(sql, [daysOld]);
    return result.affectedRows || 0;
  }
}

module.exports = MySQLNavigationRouteRepository;
