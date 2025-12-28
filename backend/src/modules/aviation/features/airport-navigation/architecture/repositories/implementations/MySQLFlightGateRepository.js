const IFlightGateRepository = require('../interfaces/IFlightGateRepository');

/**
 * MySQL implementation of Flight Gate Repository
 * Handles all flight-to-gate mapping data operations
 */
class MySQLFlightGateRepository extends IFlightGateRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all flight gates
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findAll(options = {}) {
    const { limit = 100, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM flight_gates
      ORDER BY departure_time DESC
      LIMIT ? OFFSET ?
    `;
    return await this.db.all(sql, [limit, offset]);
  }

  /**
   * Get flight gate by ID
   * @param {number} id - Flight gate ID
   * @returns {Promise<Object|null>} Flight gate record or null
   */
  async findById(id) {
    const sql = `
      SELECT *
      FROM flight_gates
      WHERE id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get flight gate by flight number
   * @param {string} flightNumber - Flight number
   * @param {Date} departureDate - Departure date
   * @returns {Promise<Object|null>} Flight gate record or null
   */
  async findByFlightNumber(flightNumber, departureDate = null) {
    let sql;
    let params;

    if (departureDate) {
      sql = `
        SELECT *
        FROM flight_gates
        WHERE flight_number = ?
        AND DATE(departure_time) = DATE(?)
        ORDER BY departure_time DESC
        LIMIT 1
      `;
      params = [flightNumber, departureDate];
    } else {
      // Find next upcoming flight
      sql = `
        SELECT *
        FROM flight_gates
        WHERE flight_number = ?
        AND departure_time >= NOW()
        ORDER BY departure_time ASC
        LIMIT 1
      `;
      params = [flightNumber];
    }

    return await this.db.get(sql, params);
  }

  /**
   * Get flights by airline code
   * @param {string} airlineCode - Airline IATA code
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByAirlineCode(airlineCode, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let sql = `
      SELECT *
      FROM flight_gates
      WHERE airline_code = ?
    `;
    const params = [airlineCode];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY departure_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.all(sql, params);
  }

  /**
   * Get flights by terminal
   * @param {string} terminalId - Terminal ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByTerminal(terminalId, options = {}) {
    const { limit = 50, offset = 0, status } = options;

    let sql = `
      SELECT *
      FROM flight_gates
      WHERE terminal_id = ?
    `;
    const params = [terminalId];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY departure_time ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.all(sql, params);
  }

  /**
   * Get flights by gate number
   * @param {string} terminalId - Terminal ID
   * @param {string} gateNumber - Gate number
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByGate(terminalId, gateNumber, options = {}) {
    const { limit = 10, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM flight_gates
      WHERE terminal_id = ?
      AND gate_number = ?
      ORDER BY departure_time DESC
      LIMIT ? OFFSET ?
    `;
    return await this.db.all(sql, [terminalId, gateNumber, limit, offset]);
  }

  /**
   * Get upcoming flights (next N hours)
   * @param {number} hoursAhead - Number of hours to look ahead
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of upcoming flight gate records
   */
  async findUpcomingFlights(hoursAhead = 24, options = {}) {
    const { limit = 100, offset = 0, terminal_id } = options;

    let sql = `
      SELECT *
      FROM flight_gates
      WHERE departure_time >= NOW()
      AND departure_time <= DATE_ADD(NOW(), INTERVAL ? HOUR)
    `;
    const params = [hoursAhead];

    if (terminal_id) {
      sql += ` AND terminal_id = ?`;
      params.push(terminal_id);
    }

    sql += ` ORDER BY departure_time ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.all(sql, params);
  }

  /**
   * Get flights by status
   * @param {string} status - Flight status
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByStatus(status, options = {}) {
    const { limit = 50, offset = 0, terminal_id } = options;

    let sql = `
      SELECT *
      FROM flight_gates
      WHERE status = ?
    `;
    const params = [status];

    if (terminal_id) {
      sql += ` AND terminal_id = ?`;
      params.push(terminal_id);
    }

    sql += ` ORDER BY departure_time ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.all(sql, params);
  }

  /**
   * Create new flight gate mapping
   * @param {Object} flightGateData - Flight gate data
   * @returns {Promise<number>} Inserted flight gate ID
   */
  async create(flightGateData) {
    const sql = `
      INSERT INTO flight_gates (
        flight_number, airline_code, airline_name_ko, airline_name_en,
        departure_time, destination_code, destination_name_ko, destination_name_en,
        terminal_id, counter_zone, counter_numbers, gate_number,
        gate_waypoint_id, counter_waypoint_id, boarding_time, last_call_time, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db.execute(sql, [
      flightGateData.flight_number,
      flightGateData.airline_code,
      flightGateData.airline_name_ko || null,
      flightGateData.airline_name_en || null,
      flightGateData.departure_time,
      flightGateData.destination_code || null,
      flightGateData.destination_name_ko || null,
      flightGateData.destination_name_en || null,
      flightGateData.terminal_id,
      flightGateData.counter_zone || null,
      flightGateData.counter_numbers || null,
      flightGateData.gate_number || null,
      flightGateData.gate_waypoint_id || null,
      flightGateData.counter_waypoint_id || null,
      flightGateData.boarding_time || null,
      flightGateData.last_call_time || null,
      flightGateData.status || 'SCHEDULED'
    ]);

    return result.insertId;
  }

  /**
   * Update flight gate mapping
   * @param {number} id - Flight gate ID
   * @param {Object} flightGateData - Updated flight gate data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, flightGateData) {
    const fields = [];
    const values = [];

    const fieldMapping = {
      flight_number: 'flight_number',
      airline_code: 'airline_code',
      airline_name_ko: 'airline_name_ko',
      airline_name_en: 'airline_name_en',
      departure_time: 'departure_time',
      destination_code: 'destination_code',
      destination_name_ko: 'destination_name_ko',
      destination_name_en: 'destination_name_en',
      terminal_id: 'terminal_id',
      counter_zone: 'counter_zone',
      counter_numbers: 'counter_numbers',
      gate_number: 'gate_number',
      gate_waypoint_id: 'gate_waypoint_id',
      counter_waypoint_id: 'counter_waypoint_id',
      boarding_time: 'boarding_time',
      last_call_time: 'last_call_time',
      status: 'status'
    };

    for (const [key, dbField] of Object.entries(fieldMapping)) {
      if (flightGateData[key] !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(flightGateData[key]);
      }
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE flight_gates SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Update flight status
   * @param {number} id - Flight gate ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updateStatus(id, status) {
    const sql = `
      UPDATE flight_gates
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  /**
   * Delete flight gate mapping
   * @param {number} id - Flight gate ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM flight_gates WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Search flights by destination
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching flight gate records
   */
  async searchByDestination(query, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const sql = `
      SELECT *
      FROM flight_gates
      WHERE destination_code LIKE ?
      OR destination_name_ko LIKE ?
      OR destination_name_en LIKE ?
      ORDER BY departure_time ASC
      LIMIT ? OFFSET ?
    `;
    const searchPattern = `%${query}%`;
    return await this.db.all(sql, [searchPattern, searchPattern, searchPattern, limit, offset]);
  }

  /**
   * Get flight gate with waypoint details
   * @param {string} flightNumber - Flight number
   * @param {Date} departureDate - Departure date
   * @returns {Promise<Object|null>} Flight gate with nested waypoint data
   */
  async findByFlightNumberWithWaypoints(flightNumber, departureDate = null) {
    const flight = await this.findByFlightNumber(flightNumber, departureDate);

    if (!flight) {
      return null;
    }

    // Fetch gate waypoint
    let gateWaypoint = null;
    if (flight.gate_waypoint_id) {
      const gateWaypointSql = `SELECT * FROM waypoints WHERE id = ?`;
      gateWaypoint = await this.db.get(gateWaypointSql, [flight.gate_waypoint_id]);
    }

    // Fetch counter waypoint
    let counterWaypoint = null;
    if (flight.counter_waypoint_id) {
      const counterWaypointSql = `SELECT * FROM waypoints WHERE id = ?`;
      counterWaypoint = await this.db.get(counterWaypointSql, [flight.counter_waypoint_id]);
    }

    return {
      ...flight,
      gate_waypoint: gateWaypoint,
      counter_waypoint: counterWaypoint
    };
  }

  /**
   * Clean up old flight data
   * @param {number} daysOld - Delete flights older than N days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldFlights(daysOld = 7) {
    const sql = `
      DELETE FROM flight_gates
      WHERE departure_time < DATE_SUB(NOW(), INTERVAL ? DAY)
      AND status IN ('DEPARTED', 'CANCELLED')
    `;
    const result = await this.db.execute(sql, [daysOld]);
    return result.affectedRows || 0;
  }
}

module.exports = MySQLFlightGateRepository;
