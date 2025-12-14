const { generateInstructions, generateStepByStepGuide } = require('../../utils/instructionGenerator');

/**
 * Navigation Service
 * Main business logic for airport navigation
 */
class NavigationService {
  constructor(
    waypointRepository,
    flightGateRepository,
    navigationRouteRepository,
    pathfindingService,
    logger = console
  ) {
    this.waypointRepository = waypointRepository;
    this.flightGateRepository = flightGateRepository;
    this.navigationRouteRepository = navigationRouteRepository;
    this.pathfindingService = pathfindingService;
    this.logger = logger;
  }

  /**
   * Create navigation route for a flight
   * @param {Object} params - Navigation parameters
   * @param {string} params.flightNumber - Flight number
   * @param {string} params.startWaypointId - Starting waypoint ID
   * @param {number} params.telegramUserId - Telegram user ID
   * @param {Object} [params.options] - Navigation options
   * @returns {Promise<Object>} Complete navigation route with instructions
   */
  async navigateToFlight(params) {
    const { flightNumber, startWaypointId, telegramUserId, options = {} } = params;

    this.logger.log(`✈️ Creating navigation for flight ${flightNumber}`);

    try {
      // 1. Get flight information
      const flight = await this.flightGateRepository.findByFlightNumberWithWaypoints(flightNumber);

      if (!flight) {
        throw new Error(`Flight ${flightNumber} not found`);
      }

      if (!flight.gate_waypoint_id) {
        throw new Error(`Gate information not available for flight ${flightNumber}`);
      }

      this.logger.log(`📍 Flight info: ${flight.airline_code}${flight.flight_number} → Gate ${flight.gate_number}`);

      // 2. Find route to gate
      const route = await this.pathfindingService.findRoute(
        startWaypointId,
        flight.gate_waypoint_id,
        options
      );

      if (!route) {
        throw new Error(`No route found from ${startWaypointId} to gate ${flight.gate_number}`);
      }

      // 3. Generate turn-by-turn instructions
      const instructions = generateInstructions(route.waypoints, route.segments);

      // 4. Create route object
      const navigationRoute = {
        flight,
        route,
        instructions,
        startWaypoint: route.waypoints[0],
        endWaypoint: route.waypoints[route.waypoints.length - 1]
      };

      // 5. Save route to database
      const savedRoute = await this.saveNavigationRoute({
        telegramUserId,
        flightNumber,
        startWaypointId,
        endWaypointId: flight.gate_waypoint_id,
        route,
        instructions
      });

      navigationRoute.routeId = savedRoute.id;

      this.logger.log(`✅ Navigation created: ${route.totalDistance}m, ${route.totalTime} mins, ${instructions.length} steps`);

      return navigationRoute;
    } catch (error) {
      this.logger.error('❌ Navigation creation failed:', error);
      throw error;
    }
  }

  /**
   * Create navigation route between two waypoints
   * @param {Object} params - Navigation parameters
   * @param {string} params.startWaypointId - Starting waypoint ID
   * @param {string} params.endWaypointId - Destination waypoint ID
   * @param {number} params.telegramUserId - Telegram user ID
   * @param {Object} [params.options] - Navigation options
   * @returns {Promise<Object>} Complete navigation route with instructions
   */
  async navigateBetweenWaypoints(params) {
    const { startWaypointId, endWaypointId, telegramUserId, options = {} } = params;

    this.logger.log(`📍 Creating navigation: ${startWaypointId} → ${endWaypointId}`);

    try {
      // 1. Find route
      const route = await this.pathfindingService.findRoute(
        startWaypointId,
        endWaypointId,
        options
      );

      if (!route) {
        throw new Error(`No route found from ${startWaypointId} to ${endWaypointId}`);
      }

      // 2. Generate instructions
      const instructions = generateInstructions(route.waypoints, route.segments);

      // 3. Create route object
      const navigationRoute = {
        route,
        instructions,
        startWaypoint: route.waypoints[0],
        endWaypoint: route.waypoints[route.waypoints.length - 1]
      };

      // 4. Save route
      const savedRoute = await this.saveNavigationRoute({
        telegramUserId,
        startWaypointId,
        endWaypointId,
        route,
        instructions
      });

      navigationRoute.routeId = savedRoute.id;

      this.logger.log(`✅ Navigation created: ${route.totalDistance}m, ${route.totalTime} mins`);

      return navigationRoute;
    } catch (error) {
      this.logger.error('❌ Navigation creation failed:', error);
      throw error;
    }
  }

  /**
   * Find user's current location
   * @param {Object} params - Location parameters
   * @param {number} [params.lat] - GPS latitude
   * @param {number} [params.lon] - GPS longitude
   * @param {string} [params.waypointId] - Manual waypoint selection
   * @returns {Promise<Object>} Detected waypoint
   */
  async detectUserLocation(params) {
    const { lat, lon, waypointId } = params;

    // Manual waypoint selection
    if (waypointId) {
      const waypoint = await this.waypointRepository.findById(waypointId);
      if (!waypoint) {
        throw new Error(`Waypoint ${waypointId} not found`);
      }
      return {
        waypoint,
        source: 'MANUAL'
      };
    }

    // GPS-based detection
    if (lat && lon) {
      const waypoint = await this.waypointRepository.findNearestByGPS(lat, lon, 100);
      if (!waypoint) {
        throw new Error('No waypoint found near your location. Please select manually.');
      }
      return {
        waypoint,
        source: 'GPS',
        distance: waypoint.distance_meters
      };
    }

    throw new Error('Please provide either GPS coordinates or select a waypoint');
  }

  /**
   * Get gate information for airline
   * @param {string} airlineCode - Airline IATA code
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Array of gates with flight info
   */
  async getGatesByAirline(airlineCode, options = {}) {
    const flights = await this.flightGateRepository.findByAirlineCode(airlineCode, {
      ...options,
      status: 'SCHEDULED'
    });

    return flights.map(flight => ({
      flightNumber: flight.flight_number,
      destination: flight.destination_name_ko,
      gateNumber: flight.gate_number,
      departureTime: flight.departure_time,
      boardingTime: flight.boarding_time,
      terminal: flight.terminal_id
    }));
  }

  /**
   * Find facilities (restrooms, restaurants, etc.)
   * @param {string} facilityType - Facility type (RESTROOM, RESTAURANT, etc.)
   * @param {string} terminalId - Terminal ID
   * @param {number} floorNumber - Floor number
   * @returns {Promise<Array>} Array of facility waypoints
   */
  async findFacilities(facilityType, terminalId, floorNumber) {
    return await this.waypointRepository.findByType(facilityType, {
      terminal_id: terminalId,
      floor_number: floorNumber
    });
  }

  /**
   * Get active navigation for user
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object|null>} Active navigation route or null
   */
  async getActiveNavigation(telegramUserId) {
    return await this.navigationRouteRepository.findActiveRouteByUser(telegramUserId);
  }

  /**
   * Cancel active navigation
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelNavigation(telegramUserId) {
    return await this.navigationRouteRepository.cancelActiveRoute(telegramUserId);
  }

  /**
   * Mark navigation as completed
   * @param {string} routeId - Route ID
   * @returns {Promise<boolean>} Success status
   */
  async completeNavigation(routeId) {
    return await this.navigationRouteRepository.markAsCompleted(routeId);
  }

  /**
   * Save navigation route to database
   * @param {Object} data - Route data
   * @returns {Promise<Object>} Saved route record
   */
  async saveNavigationRoute(data) {
    const {
      telegramUserId,
      flightNumber,
      startWaypointId,
      endWaypointId,
      route,
      instructions
    } = data;

    // Cancel any existing active route for this user
    await this.navigationRouteRepository.cancelActiveRoute(telegramUserId);

    // Create new route
    const routeId = await this.navigationRouteRepository.create({
      telegram_user_id: telegramUserId,
      flight_number: flightNumber || null,
      start_waypoint_id: startWaypointId,
      end_waypoint_id: endWaypointId,
      route_waypoints: route.path,
      total_distance_meters: route.totalDistance,
      estimated_time_minutes: route.totalTime,
      status: 'ACTIVE'
    });

    return {
      id: routeId,
      telegramUserId,
      flightNumber,
      totalDistance: route.totalDistance,
      totalTime: route.totalTime,
      waypointCount: route.path.length,
      instructionCount: instructions.length
    };
  }

  /**
   * Format navigation as Telegram message
   * @param {Object} navigation - Navigation object
   * @param {string} language - Language ('ko' or 'en')
   * @returns {string} Formatted message
   */
  formatNavigationMessage(navigation, language = 'ko') {
    const { flight, route, instructions } = navigation;

    const lines = [];

    // Flight header (if available)
    if (flight) {
      if (language === 'ko') {
        lines.push(`✈️ ${flight.airline_name_ko} ${flight.flight_number}`);
        lines.push(`🛫 목적지: ${flight.destination_name_ko}`);
        lines.push(`🕐 출발: ${formatTime(flight.departure_time)}`);
        lines.push(`🚪 탑승구: ${flight.gate_number}번 게이트`);
        lines.push(`📋 수속: ${flight.counter_zone} 카운터`);
        lines.push('');
      } else {
        lines.push(`✈️ ${flight.airline_name_en || flight.airline_name_ko} ${flight.flight_number}`);
        lines.push(`🛫 Destination: ${flight.destination_name_en || flight.destination_name_ko}`);
        lines.push(`🕐 Departure: ${formatTime(flight.departure_time)}`);
        lines.push(`🚪 Gate: ${flight.gate_number}`);
        lines.push(`📋 Check-in: Counter ${flight.counter_zone}`);
        lines.push('');
      }
    }

    // Route guide
    const guide = generateStepByStepGuide(route, instructions, language);
    lines.push(guide);

    return lines.join('\n');
  }

  /**
   * Get navigation statistics
   * @param {number} telegramUserId - Telegram user ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserNavigationStats(telegramUserId) {
    return await this.navigationRouteRepository.getUserStats(telegramUserId);
  }

  /**
   * Get popular routes
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Popular routes
   */
  async getPopularRoutes(limit = 10) {
    return await this.navigationRouteRepository.getPopularRoutes(limit);
  }
}

/**
 * Format time for display
 * @param {Date|string} datetime - Datetime
 * @returns {string} Formatted time
 */
function formatTime(datetime) {
  const date = new Date(datetime);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

module.exports = NavigationService;
