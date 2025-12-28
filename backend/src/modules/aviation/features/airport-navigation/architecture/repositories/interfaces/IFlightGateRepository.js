/**
 * Interface for Flight Gate Repository
 * Defines contract for flight-to-gate mapping data access operations
 */
class IFlightGateRepository {
  /**
   * Get all flight gates
   * @param {Object} options - Query options
   * @param {number} [options.limit] - Max results
   * @param {number} [options.offset] - Offset for pagination
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findAll(options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flight gate by ID
   * @param {number} id - Flight gate ID
   * @returns {Promise<Object|null>} Flight gate record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flight gate by flight number
   * @param {string} flightNumber - Flight number (e.g., 'KE123')
   * @param {Date} [departureDate] - Departure date (defaults to today)
   * @returns {Promise<Object|null>} Flight gate record or null
   */
  async findByFlightNumber(flightNumber, departureDate = null) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flights by airline code
   * @param {string} airlineCode - Airline IATA code (e.g., 'KE', 'OZ')
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByAirlineCode(airlineCode, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flights by terminal
   * @param {string} terminalId - Terminal ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByTerminal(terminalId, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flights by gate number
   * @param {string} terminalId - Terminal ID
   * @param {string} gateNumber - Gate number
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByGate(terminalId, gateNumber, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get upcoming flights (next N hours)
   * @param {number} hoursAhead - Number of hours to look ahead
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of upcoming flight gate records
   */
  async findUpcomingFlights(hoursAhead = 24, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flights by status
   * @param {string} status - Flight status (SCHEDULED, BOARDING, DEPARTED, etc.)
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of flight gate records
   */
  async findByStatus(status, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new flight gate mapping
   * @param {Object} flightGateData - Flight gate data
   * @returns {Promise<number>} Inserted flight gate ID
   */
  async create(flightGateData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update flight gate mapping
   * @param {number} id - Flight gate ID
   * @param {Object} flightGateData - Updated flight gate data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, flightGateData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update flight status
   * @param {number} id - Flight gate ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updateStatus(id, status) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete flight gate mapping
   * @param {number} id - Flight gate ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Search flights by destination
   * @param {string} query - Search query (destination name or code)
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching flight gate records
   */
  async searchByDestination(query, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get flight gate with waypoint details
   * @param {string} flightNumber - Flight number
   * @param {Date} [departureDate] - Departure date
   * @returns {Promise<Object|null>} Flight gate with nested waypoint data
   */
  async findByFlightNumberWithWaypoints(flightNumber, departureDate = null) {
    throw new Error('Method must be implemented');
  }

  /**
   * Clean up old flight data
   * @param {number} daysOld - Delete flights older than N days
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldFlights(daysOld = 7) {
    throw new Error('Method must be implemented');
  }
}

module.exports = IFlightGateRepository;
