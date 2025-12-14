const ITerminalRepository = require('../interfaces/ITerminalRepository');

/**
 * MySQL implementation of Terminal Repository
 * Handles all terminal-related database operations
 */
class MySQLTerminalRepository extends ITerminalRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all terminals
   * @returns {Promise<Array>} Array of terminal records
   */
  async findAll() {
    const sql = `
      SELECT *
      FROM terminals
      ORDER BY id ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get terminal by ID
   * @param {string} id - Terminal ID
   * @returns {Promise<Object|null>} Terminal record or null
   */
  async findById(id) {
    const sql = `
      SELECT *
      FROM terminals
      WHERE id = ?
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get terminals by airport code
   * @param {string} airportCode - Airport IATA code
   * @returns {Promise<Array>} Array of terminal records
   */
  async findByAirportCode(airportCode) {
    const sql = `
      SELECT *
      FROM terminals
      WHERE airport_code = ?
      ORDER BY id ASC
    `;
    return await this.db.all(sql, [airportCode]);
  }

  /**
   * Create new terminal
   * @param {Object} terminalData - Terminal data
   * @returns {Promise<string>} Inserted terminal ID
   */
  async create(terminalData) {
    const sql = `
      INSERT INTO terminals (id, name_ko, name_en, airport_code)
      VALUES (?, ?, ?, ?)
    `;
    await this.db.execute(sql, [
      terminalData.id,
      terminalData.name_ko,
      terminalData.name_en,
      terminalData.airport_code || 'ICN'
    ]);
    return terminalData.id;
  }

  /**
   * Update terminal
   * @param {string} id - Terminal ID
   * @param {Object} terminalData - Updated terminal data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, terminalData) {
    const fields = [];
    const values = [];

    if (terminalData.name_ko !== undefined) {
      fields.push('name_ko = ?');
      values.push(terminalData.name_ko);
    }
    if (terminalData.name_en !== undefined) {
      fields.push('name_en = ?');
      values.push(terminalData.name_en);
    }
    if (terminalData.airport_code !== undefined) {
      fields.push('airport_code = ?');
      values.push(terminalData.airport_code);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE terminals SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete terminal
   * @param {string} id - Terminal ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM terminals WHERE id = ?`;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get terminal with floors
   * @param {string} id - Terminal ID
   * @returns {Promise<Object|null>} Terminal with nested floors array
   */
  async findByIdWithFloors(id) {
    const terminal = await this.findById(id);

    if (!terminal) {
      return null;
    }

    const floorsSql = `
      SELECT *
      FROM floors
      WHERE terminal_id = ?
      ORDER BY floor_number ASC
    `;
    const floors = await this.db.all(floorsSql, [id]);

    return {
      ...terminal,
      floors
    };
  }
}

module.exports = MySQLTerminalRepository;
