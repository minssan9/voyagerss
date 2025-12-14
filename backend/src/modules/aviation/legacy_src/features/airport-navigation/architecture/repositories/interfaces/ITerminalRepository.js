/**
 * Interface for Terminal Repository
 * Defines contract for airport terminal data access operations
 */
class ITerminalRepository {
  /**
   * Get all terminals
   * @returns {Promise<Array>} Array of terminal records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get terminal by ID
   * @param {string} id - Terminal ID (e.g., 'T1', 'T2')
   * @returns {Promise<Object|null>} Terminal record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get terminals by airport code
   * @param {string} airportCode - Airport IATA code (e.g., 'ICN')
   * @returns {Promise<Array>} Array of terminal records
   */
  async findByAirportCode(airportCode) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new terminal
   * @param {Object} terminalData - Terminal data
   * @param {string} terminalData.id - Terminal ID
   * @param {string} terminalData.name_ko - Korean name
   * @param {string} terminalData.name_en - English name
   * @param {string} [terminalData.airport_code] - Airport code
   * @returns {Promise<string>} Inserted terminal ID
   */
  async create(terminalData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update terminal
   * @param {string} id - Terminal ID
   * @param {Object} terminalData - Updated terminal data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, terminalData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete terminal
   * @param {string} id - Terminal ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get terminal with floors
   * @param {string} id - Terminal ID
   * @returns {Promise<Object|null>} Terminal with nested floors array
   */
  async findByIdWithFloors(id) {
    throw new Error('Method must be implemented');
  }
}

module.exports = ITerminalRepository;
