/**
 * Interface for Navigation Route Repository
 * Defines contract for navigation route history data access operations
 */
class INavigationRouteRepository {
  /**
   * Get all navigation routes
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Max results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findAll(options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get navigation route by ID
   * @param {string} id - Navigation route ID (UUID)
   * @returns {Promise<Object|null>} Navigation route record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get routes by user
   * @param {number} telegramUserId - Telegram user ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByUser(telegramUserId, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get active route for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object|null>} Active navigation route or null
   */
  async findActiveRouteByUser(telegramUserId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get routes by flight number
   * @param {string} flightNumber - Flight number
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByFlightNumber(flightNumber, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get routes by status
   * @param {string} status - Route status (ACTIVE, COMPLETED, CANCELLED)
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of navigation route records
   */
  async findByStatus(status, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new navigation route
   * @param {Object} routeData - Navigation route data
   * @param {string} routeData.id - Route UUID
   * @param {number} routeData.telegram_user_id - Telegram user ID
   * @param {string} routeData.start_waypoint_id - Start waypoint ID
   * @param {string} routeData.end_waypoint_id - End waypoint ID
   * @param {Array} routeData.route_waypoints - Array of waypoint IDs
   * @param {number} routeData.total_distance_meters - Total distance
   * @param {number} routeData.estimated_time_minutes - Estimated time
   * @param {string} [routeData.flight_number] - Flight number
   * @param {string} [routeData.map_image_path] - Path to map image
   * @returns {Promise<string>} Inserted route ID
   */
  async create(routeData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update navigation route
   * @param {string} id - Navigation route ID
   * @param {Object} routeData - Updated route data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, routeData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update route status
   * @param {string} id - Navigation route ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updateStatus(id, status) {
    throw new Error('Method must be implemented');
  }

  /**
   * Mark route as completed
   * @param {string} id - Navigation route ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsCompleted(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Cancel active route for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelActiveRoute(telegramUserId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete navigation route
   * @param {string} id - Navigation route ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get route statistics for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object>} Route statistics
   */
  async getUserStats(telegramUserId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get popular routes (most frequently used)
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Array of popular route patterns
   */
  async getPopularRoutes(limit = 10) {
    throw new Error('Method must be implemented');
  }

  /**
   * Clean up old completed routes
   * @param {number} daysOld - Delete routes older than N days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldRoutes(daysOld = 30) {
    throw new Error('Method must be implemented');
  }
}

module.exports = INavigationRouteRepository;
