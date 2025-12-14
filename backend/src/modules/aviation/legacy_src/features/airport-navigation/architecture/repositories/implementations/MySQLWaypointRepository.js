const IWaypointRepository = require('../interfaces/IWaypointRepository');

/**
 * MySQL implementation of Waypoint Repository
 * Handles all waypoint (navigation node) and connection data operations
 */
class MySQLWaypointRepository extends IWaypointRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all waypoints
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findAll(options = {}) {
    const { limit = 1000, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM waypoints
      ORDER BY terminal_id, floor_number, type, id
      LIMIT ? OFFSET ?
    `;
    return await this.db.all(sql, [limit, offset]);
  }

  /**
   * Get waypoint by ID
   * @param {string} id - Waypoint ID
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findById(id) {
    const sql = `
      SELECT *
      FROM waypoints
      WHERE id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get waypoints by terminal and floor
   * @param {string} terminalId - Terminal ID
   * @param {number} floorNumber - Floor number
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findByTerminalAndFloor(terminalId, floorNumber) {
    const sql = `
      SELECT *
      FROM waypoints
      WHERE terminal_id = ? AND floor_number = ?
      ORDER BY type, id
    `;
    return await this.db.all(sql, [terminalId, floorNumber]);
  }

  /**
   * Get waypoints by type
   * @param {string} type - Waypoint type
   * @param {Object} options - Additional filters
   * @returns {Promise<Array>} Array of waypoint records
   */
  async findByType(type, options = {}) {
    const { terminal_id, floor_number, is_accessible } = options;

    let sql = `SELECT * FROM waypoints WHERE type = ?`;
    const params = [type];

    if (terminal_id) {
      sql += ` AND terminal_id = ?`;
      params.push(terminal_id);
    }

    if (floor_number !== undefined) {
      sql += ` AND floor_number = ?`;
      params.push(floor_number);
    }

    if (is_accessible !== undefined) {
      sql += ` AND is_accessible = ?`;
      params.push(is_accessible);
    }

    sql += ` ORDER BY id`;

    return await this.db.all(sql, params);
  }

  /**
   * Get gate waypoint by gate number
   * @param {string} terminalId - Terminal ID
   * @param {string} gateNumber - Gate number
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findGateByNumber(terminalId, gateNumber) {
    const sql = `
      SELECT *
      FROM waypoints
      WHERE terminal_id = ?
      AND type = 'GATE'
      AND JSON_EXTRACT(metadata, '$.gate_number') = ?
      LIMIT 1
    `;
    return await this.db.get(sql, [terminalId, gateNumber]);
  }

  /**
   * Get counter waypoint by zone
   * @param {string} terminalId - Terminal ID
   * @param {string} counterZone - Counter zone
   * @returns {Promise<Object|null>} Waypoint record or null
   */
  async findCounterByZone(terminalId, counterZone) {
    const sql = `
      SELECT *
      FROM waypoints
      WHERE terminal_id = ?
      AND type = 'COUNTER'
      AND JSON_EXTRACT(metadata, '$.zone') = ?
      LIMIT 1
    `;
    return await this.db.get(sql, [terminalId, counterZone]);
  }

  /**
   * Find nearest waypoint to GPS coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} maxDistance - Max distance in meters
   * @returns {Promise<Object|null>} Nearest waypoint or null
   */
  async findNearestByGPS(lat, lon, maxDistance = 100) {
    // Haversine formula to calculate distance
    const sql = `
      SELECT *,
        (6371000 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(gps_lat)) *
          COS(RADIANS(gps_lon) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(gps_lat))
        )) AS distance_meters
      FROM waypoints
      WHERE gps_lat IS NOT NULL AND gps_lon IS NOT NULL
      HAVING distance_meters <= ?
      ORDER BY distance_meters ASC
      LIMIT 1
    `;
    return await this.db.get(sql, [lat, lon, lat, maxDistance]);
  }

  /**
   * Get connected waypoints (neighbors in graph)
   * @param {string} waypointId - Waypoint ID
   * @returns {Promise<Array>} Array of connected waypoint records with connection info
   */
  async findConnectedWaypoints(waypointId) {
    const sql = `
      SELECT
        w.*,
        wc.distance_meters,
        wc.walking_time_seconds,
        wc.connection_type,
        wc.is_accessible AS connection_accessible
      FROM waypoints w
      INNER JOIN waypoint_connections wc ON w.id = wc.to_waypoint_id
      WHERE wc.from_waypoint_id = ?
      ORDER BY wc.distance_meters ASC
    `;
    return await this.db.all(sql, [waypointId]);
  }

  /**
   * Create new waypoint
   * @param {Object} waypointData - Waypoint data
   * @returns {Promise<string>} Inserted waypoint ID
   */
  async create(waypointData) {
    const sql = `
      INSERT INTO waypoints (
        id, terminal_id, floor_number, type, name_ko, name_en,
        map_x, map_y, gps_lat, gps_lon, metadata, is_accessible
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const metadata = waypointData.metadata
      ? (typeof waypointData.metadata === 'string'
          ? waypointData.metadata
          : JSON.stringify(waypointData.metadata))
      : null;

    await this.db.execute(sql, [
      waypointData.id,
      waypointData.terminal_id,
      waypointData.floor_number,
      waypointData.type,
      waypointData.name_ko,
      waypointData.name_en || null,
      waypointData.map_x,
      waypointData.map_y,
      waypointData.gps_lat || null,
      waypointData.gps_lon || null,
      metadata,
      waypointData.is_accessible !== undefined ? waypointData.is_accessible : true
    ]);

    return waypointData.id;
  }

  /**
   * Update waypoint
   * @param {string} id - Waypoint ID
   * @param {Object} waypointData - Updated waypoint data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, waypointData) {
    const fields = [];
    const values = [];

    if (waypointData.terminal_id !== undefined) {
      fields.push('terminal_id = ?');
      values.push(waypointData.terminal_id);
    }
    if (waypointData.floor_number !== undefined) {
      fields.push('floor_number = ?');
      values.push(waypointData.floor_number);
    }
    if (waypointData.type !== undefined) {
      fields.push('type = ?');
      values.push(waypointData.type);
    }
    if (waypointData.name_ko !== undefined) {
      fields.push('name_ko = ?');
      values.push(waypointData.name_ko);
    }
    if (waypointData.name_en !== undefined) {
      fields.push('name_en = ?');
      values.push(waypointData.name_en);
    }
    if (waypointData.map_x !== undefined) {
      fields.push('map_x = ?');
      values.push(waypointData.map_x);
    }
    if (waypointData.map_y !== undefined) {
      fields.push('map_y = ?');
      values.push(waypointData.map_y);
    }
    if (waypointData.gps_lat !== undefined) {
      fields.push('gps_lat = ?');
      values.push(waypointData.gps_lat);
    }
    if (waypointData.gps_lon !== undefined) {
      fields.push('gps_lon = ?');
      values.push(waypointData.gps_lon);
    }
    if (waypointData.metadata !== undefined) {
      fields.push('metadata = ?');
      const metadata = typeof waypointData.metadata === 'string'
        ? waypointData.metadata
        : JSON.stringify(waypointData.metadata);
      values.push(metadata);
    }
    if (waypointData.is_accessible !== undefined) {
      fields.push('is_accessible = ?');
      values.push(waypointData.is_accessible);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE waypoints SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete waypoint
   * @param {string} id - Waypoint ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM waypoints WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Search waypoints by name
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching waypoints
   */
  async search(query, options = {}) {
    const { limit = 20, offset = 0, terminal_id, type } = options;

    let sql = `
      SELECT *
      FROM waypoints
      WHERE (name_ko LIKE ? OR name_en LIKE ?)
    `;
    const params = [`%${query}%`, `%${query}%`];

    if (terminal_id) {
      sql += ` AND terminal_id = ?`;
      params.push(terminal_id);
    }

    if (type) {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY terminal_id, floor_number LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.all(sql, params);
  }

  /**
   * Create waypoint connection
   * @param {Object} connectionData - Connection data
   * @returns {Promise<number>} Inserted connection ID
   */
  async createConnection(connectionData) {
    const sql = `
      INSERT INTO waypoint_connections (
        from_waypoint_id, to_waypoint_id, distance_meters,
        walking_time_seconds, is_accessible, connection_type
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.execute(sql, [
      connectionData.from_waypoint_id,
      connectionData.to_waypoint_id,
      connectionData.distance_meters,
      connectionData.walking_time_seconds,
      connectionData.is_accessible !== undefined ? connectionData.is_accessible : true,
      connectionData.connection_type || 'WALK'
    ]);

    return result.insertId;
  }

  /**
   * Delete waypoint connection
   * @param {string} fromWaypointId - Source waypoint ID
   * @param {string} toWaypointId - Destination waypoint ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteConnection(fromWaypointId, toWaypointId) {
    const sql = `
      DELETE FROM waypoint_connections
      WHERE from_waypoint_id = ? AND to_waypoint_id = ?
    `;
    const result = await this.db.execute(sql, [fromWaypointId, toWaypointId]);
    return result.affectedRows > 0;
  }

  /**
   * Get all connections (for building graph)
   * @returns {Promise<Array>} Array of connection records
   */
  async getAllConnections() {
    const sql = `
      SELECT *
      FROM waypoint_connections
      ORDER BY from_waypoint_id, to_waypoint_id
    `;
    return await this.db.all(sql);
  }
}

module.exports = MySQLWaypointRepository;
