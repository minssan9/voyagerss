/**
 * Navigation Command Handler
 * Handles Telegram bot commands for airport navigation
 */
class NavigationCommandHandler {
  constructor(bot, navigationService, mapRenderingService, logger = console) {
    this.bot = bot;
    this.navigationService = navigationService;
    this.mapRenderingService = mapRenderingService;
    this.logger = logger;
    this.userSessions = new Map(); // Store user session data
  }

  /**
   * Set up all navigation command handlers
   */
  setupHandlers() {
    // /navigate command
    this.bot.onText(/\/navigate\s*(.*)/, (msg, match) => this.handleNavigate(msg, match));

    // /mylocation command
    this.bot.onText(/\/mylocation/, (msg) => this.handleMyLocation(msg));

    // /gates command
    this.bot.onText(/\/gates\s*(.*)/, (msg, match) => this.handleGates(msg, match));

    // /facilities command
    this.bot.onText(/\/facilities\s*(.*)/, (msg, match) => this.handleFacilities(msg, match));

    // /cancelnavigation command
    this.bot.onText(/\/cancelnavigation/, (msg) => this.handleCancelNavigation(msg));

    // Location sharing handler
    this.bot.on('location', (msg) => this.handleLocationShare(msg));

    // Callback query handler (for inline keyboards)
    this.bot.on('callback_query', (query) => this.handleCallbackQuery(query));

    this.logger.log('✅ Navigation command handlers registered');
  }

  /**
   * Handle /navigate command
   * @param {Object} msg - Telegram message object
   * @param {Array} match - Regex match array
   */
  async handleNavigate(msg, match) {
    const chatId = msg.chat.id;
    const telegramUserId = msg.from.id;
    const flightNumber = match[1]?.trim().toUpperCase();

    try {
      if (!flightNumber) {
        await this.bot.sendMessage(
          chatId,
          '✈️ 항공편 내비게이션\n\n' +
          '사용법: /navigate <항공편번호>\n' +
          '예시: /navigate KE123\n\n' +
          '항공편 번호를 입력하시면 탑승구까지의 경로를 안내해드립니다.'
        );
        return;
      }

      // Send "searching" message
      const searchMsg = await this.bot.sendMessage(
        chatId,
        `🔍 ${flightNumber}편 정보를 조회하고 있습니다...`
      );

      // Store session data
      this.userSessions.set(telegramUserId, {
        flightNumber,
        step: 'waiting_location'
      });

      // Ask for current location
      await this.bot.deleteMessage(chatId, searchMsg.message_id);
      await this.sendLocationRequest(chatId, flightNumber);

    } catch (error) {
      this.logger.error('❌ /navigate error:', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 오류가 발생했습니다: ${error.message}\n\n` +
        '다시 시도하거나 /help 명령어로 도움말을 확인하세요.'
      );
    }
  }

  /**
   * Send location request with inline keyboard
   * @param {number} chatId - Chat ID
   * @param {string} flightNumber - Flight number
   */
  async sendLocationRequest(chatId, flightNumber) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📍 위치 공유', callback_data: 'nav:share_location' }
        ],
        [
          { text: '🏢 제1터미널 3층 입구', callback_data: 'nav:T1-3F-ENTRANCE-MAIN' },
          { text: '🏢 제1터미널 4층 입구', callback_data: 'nav:T1-4F-ENTRANCE' }
        ],
        [
          { text: '🏢 제2터미널 3층 입구', callback_data: 'nav:T2-3F-ENTRANCE-MAIN' }
        ],
        [
          { text: '🅰️ A 체크인 카운터', callback_data: 'nav:T1-3F-COUNTER-A' },
          { text: '🅱️ B 체크인 카운터', callback_data: 'nav:T1-3F-COUNTER-B' }
        ],
        [
          { text: '❌ 취소', callback_data: 'nav:cancel' }
        ]
      ]
    };

    await this.bot.sendMessage(
      chatId,
      `✈️ ${flightNumber}편 내비게이션\n\n` +
      '📍 현재 위치를 알려주세요:\n\n' +
      '• 위치 공유 버튼을 눌러 GPS로 자동 감지\n' +
      '• 또는 아래에서 현재 위치를 선택하세요',
      { reply_markup: keyboard }
    );
  }

  /**
   * Handle location sharing
   * @param {Object} msg - Telegram message object with location
   */
  async handleLocationShare(msg) {
    const chatId = msg.chat.id;
    const telegramUserId = msg.from.id;
    const location = msg.location;

    try {
      const session = this.userSessions.get(telegramUserId);

      if (!session || session.step !== 'waiting_location') {
        await this.bot.sendMessage(
          chatId,
          '먼저 /navigate 명령어로 항공편을 입력해주세요.'
        );
        return;
      }

      const progressMsg = await this.bot.sendMessage(
        chatId,
        '🔍 위치를 확인하고 경로를 계산하는 중...'
      );

      // Detect user location
      const userLocation = await this.navigationService.detectUserLocation({
        lat: location.latitude,
        lon: location.longitude
      });

      // Create navigation
      const navigation = await this.navigationService.navigateToFlight({
        flightNumber: session.flightNumber,
        startWaypointId: userLocation.waypoint.id,
        telegramUserId,
        options: {}
      });

      // Generate map image
      const terminal = navigation.flight.terminal_id;
      const floor = navigation.startWaypoint.floor_number;
      const mapPath = await this.mapRenderingService.generateRouteMap(
        navigation.route,
        {
          terminalId: terminal,
          floorNumber: floor,
          outputFilename: `route-${telegramUserId}-${Date.now()}.png`
        }
      );

      // Delete progress message
      await this.bot.deleteMessage(chatId, progressMsg.message_id);

      // Send map image
      await this.bot.sendPhoto(chatId, mapPath);

      // Send navigation message
      const message = this.navigationService.formatNavigationMessage(navigation, 'ko');
      await this.bot.sendMessage(chatId, message);

      // Clear session
      this.userSessions.delete(telegramUserId);

      this.logger.log(`✅ Navigation sent to user ${telegramUserId}: ${session.flightNumber}`);

    } catch (error) {
      this.logger.error('❌ Location handling error:', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 오류가 발생했습니다: ${error.message}\n\n` +
        '다시 시도해주세요.'
      );
    }
  }

  /**
   * Handle callback queries from inline keyboards
   * @param {Object} query - Telegram callback query object
   */
  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const telegramUserId = query.from.id;
    const data = query.data;

    try {
      if (!data.startsWith('nav:')) {
        return; // Not a navigation callback
      }

      const action = data.replace('nav:', '');

      // Acknowledge callback
      await this.bot.answerCallbackQuery(query.id);

      if (action === 'cancel') {
        await this.bot.sendMessage(chatId, '❌ 내비게이션이 취소되었습니다.');
        this.userSessions.delete(telegramUserId);
        return;
      }

      if (action === 'share_location') {
        // Request location
        await this.bot.sendMessage(
          chatId,
          '📍 아래 버튼을 눌러 위치를 공유해주세요.',
          {
            reply_markup: {
              keyboard: [
                [{
                  text: '📍 현재 위치 공유',
                  request_location: true
                }]
              ],
              one_time_keyboard: true,
              resize_keyboard: true
            }
          }
        );
        return;
      }

      // Manual waypoint selection
      const waypointId = action;
      const session = this.userSessions.get(telegramUserId);

      if (!session) {
        await this.bot.sendMessage(
          chatId,
          '세션이 만료되었습니다. /navigate 명령어로 다시 시작해주세요.'
        );
        return;
      }

      const progressMsg = await this.bot.sendMessage(
        chatId,
        '🗺️ 경로를 계산하는 중...'
      );

      // Create navigation
      const navigation = await this.navigationService.navigateToFlight({
        flightNumber: session.flightNumber,
        startWaypointId: waypointId,
        telegramUserId,
        options: {}
      });

      // Generate map
      const terminal = navigation.flight.terminal_id;
      const floor = navigation.startWaypoint.floor_number;
      const mapPath = await this.mapRenderingService.generateRouteMap(
        navigation.route,
        {
          terminalId: terminal,
          floorNumber: floor,
          outputFilename: `route-${telegramUserId}-${Date.now()}.png`
        }
      );

      // Delete progress message
      await this.bot.deleteMessage(chatId, progressMsg.message_id);

      // Send map image
      await this.bot.sendPhoto(chatId, mapPath);

      // Send navigation message
      const message = this.navigationService.formatNavigationMessage(navigation, 'ko');
      await this.bot.sendMessage(chatId, message);

      // Clear session
      this.userSessions.delete(telegramUserId);

      this.logger.log(`✅ Navigation sent to user ${telegramUserId}: ${session.flightNumber}`);

    } catch (error) {
      this.logger.error('❌ Callback query error:', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 오류가 발생했습니다: ${error.message}`
      );
    }
  }

  /**
   * Handle /mylocation command
   * @param {Object} msg - Telegram message object
   */
  async handleMyLocation(msg) {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(
      chatId,
      '📍 현재 위치 확인\n\n' +
      '아래 버튼을 눌러 위치를 공유하시면,\n' +
      '가장 가까운 공항 시설을 안내해드립니다.',
      {
        reply_markup: {
          keyboard: [
            [{
              text: '📍 현재 위치 공유',
              request_location: true
            }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      }
    );
  }

  /**
   * Handle /gates command
   * @param {Object} msg - Telegram message object
   * @param {Array} match - Regex match array
   */
  async handleGates(msg, match) {
    const chatId = msg.chat.id;
    const airlineCode = match[1]?.trim().toUpperCase();

    try {
      if (!airlineCode) {
        await this.bot.sendMessage(
          chatId,
          '🚪 항공사별 게이트 정보\n\n' +
          '사용법: /gates <항공사코드>\n' +
          '예시: /gates KE (대한항공)\n' +
          '예시: /gates OZ (아시아나항공)'
        );
        return;
      }

      const gates = await this.navigationService.getGatesByAirline(airlineCode, {
        limit: 10
      });

      if (gates.length === 0) {
        await this.bot.sendMessage(
          chatId,
          `❌ ${airlineCode} 항공사의 예정된 항공편이 없습니다.`
        );
        return;
      }

      let message = `🚪 ${airlineCode} 항공편 게이트 정보\n\n`;
      for (const gate of gates) {
        message += `✈️ ${gate.flightNumber}\n`;
        message += `   목적지: ${gate.destination}\n`;
        message += `   게이트: ${gate.gateNumber}번\n`;
        message += `   출발: ${formatTime(gate.departureTime)}\n\n`;
      }

      await this.bot.sendMessage(chatId, message);

    } catch (error) {
      this.logger.error('❌ /gates error:', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 오류가 발생했습니다: ${error.message}`
      );
    }
  }

  /**
   * Handle /facilities command
   * @param {Object} msg - Telegram message object
   * @param {Array} match - Regex match array
   */
  async handleFacilities(msg, match) {
    const chatId = msg.chat.id;
    const facilityType = match[1]?.trim().toUpperCase();

    await this.bot.sendMessage(
      chatId,
      '🏢 시설물 찾기\n\n' +
      '사용 가능한 시설:\n' +
      '• /facilities RESTROOM - 화장실\n' +
      '• /facilities RESTAURANT - 식당\n' +
      '• /facilities LOUNGE - 라운지\n' +
      '• /facilities SHOP - 상점\n\n' +
      '(추후 업데이트 예정)'
    );
  }

  /**
   * Handle /cancelnavigation command
   * @param {Object} msg - Telegram message object
   */
  async handleCancelNavigation(msg) {
    const chatId = msg.chat.id;
    const telegramUserId = msg.from.id;

    try {
      const success = await this.navigationService.cancelNavigation(telegramUserId);

      if (success) {
        await this.bot.sendMessage(
          chatId,
          '✅ 활성 내비게이션이 취소되었습니다.'
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          'ℹ️ 활성 내비게이션이 없습니다.'
        );
      }

      // Clear session
      this.userSessions.delete(telegramUserId);

    } catch (error) {
      this.logger.error('❌ Cancel navigation error:', error);
      await this.bot.sendMessage(
        chatId,
        `❌ 오류가 발생했습니다: ${error.message}`
      );
    }
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

module.exports = NavigationCommandHandler;
