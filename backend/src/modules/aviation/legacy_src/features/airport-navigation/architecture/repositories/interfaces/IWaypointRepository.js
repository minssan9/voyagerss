/**
 * Interface for Waypoint Repository
 * Defines contract for waypoint (navigation node) data access operations
 */
class IWaypointRepository {
  /**
   * Get all waypoints
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Max results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findAll(options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get waypoint by ID
   * @param {string} id - Waypoint ID
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get waypoints by terminal and floor
   * @param {string} terminalId - Terminal ID
   * @param {number} floorNumber - Floor number
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findByTerminalAndFloor(terminalId, floorNumber) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get waypoints by type
   * @param {string} type - Waypoint type (GATE, COUNTER, ENTRANCE, etc.)
   * @param {Object} options - Additional filters
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findByType(type, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get gate waypoint by gate number
   * @param {string} terminalId - Terminal ID
   * @param {string} gateNumber - Gate number (e.g., '101', '202')
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findGateByNumber(terminalId, gateNumber) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get counter waypoint by zone
   * @param {string} terminalId - Terminal ID
   * @param {string} counterZone - Counter zone (e.g., 'A', 'B', 'C')
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findCounterByZone(terminalId, counterZone) {
    throw new Error('Method must be implemented');
  }

  /**
   * Find nearest waypoint to GPS coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} [maxDistance] - Max distance in meters
   * @returns {Promise<Object|null>} Nearest waypoint or null
   */
  async findNearestByGPS(lat, lon, maxDistance = 100) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get connected waypoints (neighbors in graph)
   * @param {string} waypointId - Waypoint ID
   * @returns {Promise<Array>} Array of connected waypoint records with connection info
   */
  async findConnectedWaypoints(waypointId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new waypoint
   * @param {Object} waypointData - Waypoint data
   * @returns {Promise<string>} Inserted waypoint ID
   */
  async create(waypointData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update waypoint
   * @param {string} id - Waypoint ID
   * @param {Object} waypointData - Updated waypoint data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, waypointData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete waypoint
   * @param {string} id - Waypoint ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Search waypoints by name
   * @param {string} query - Search query (Korean or English)
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching waypoints
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create waypoint connection
   * @param {Object} connectionData - Connection data
   * @param {string} connectionData.from_waypoint_id - Source waypoint ID
   * @param {string} connectionData.to_waypoint_id - Destination waypoint ID
   * @param {number} connectionData.distance_meters - Distance in meters
   * @param {number} connectionData.walking_time_seconds - Walking time in seconds
   * @param {string} [connectionData.connection_type] - Connection type (WALK, ELEVATOR, etc.)
   * @param {boolean} [connectionData.is_accessible] - Wheelchair accessible
   * @returns {Promise<number>} Inserted connection ID
   */
  async createConnection(connectionData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete waypoint connection
   * @param {string} fromWaypointId - Source waypoint ID
   * @param {string} toWaypointId - Destination waypoint ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteConnection(fromWaypointId, toWaypointId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get all connections (for building graph)
   * @returns {Promise<Array>} Array of connection records
   */
  async getAllConnections() {
    throw new Error('Method must be implemented');
  }
}

module.exports = IWaypointRepository;
