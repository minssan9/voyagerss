/**
 * Instruction Generator
 * Generates turn-by-turn navigation instructions in Korean and English
 */

/**
 * Generate navigation instructions from route
 * @param {Array} waypoints - Array of waypoint objects in path order
 * @param {Array} segments - Array of segment objects with distances
 * @returns {Array} Array of instruction objects
 */
function generateInstructions(waypoints, segments) {
  const instructions = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const fromWaypoint = waypoints[i];
    const toWaypoint = waypoints[i + 1];

    if (!fromWaypoint || !toWaypoint) {
      continue;
    }

    const instruction = generateSegmentInstruction(
      fromWaypoint,
      toWaypoint,
      segment,
      i + 1
    );

    instructions.push(instruction);
  }

  // Add final arrival instruction
  if (waypoints.length > 0) {
    const finalWaypoint = waypoints[waypoints.length - 1];
    instructions.push({
      step: instructions.length + 1,
      type: 'ARRIVE',
      waypointId: finalWaypoint.id,
      waypointType: finalWaypoint.type,
      instruction_ko: `${finalWaypoint.name_ko}에 도착했습니다.`,
      instruction_en: `You have arrived at ${finalWaypoint.name_en || finalWaypoint.name_ko}.`,
      distance: 0,
      time: 0
    });
  }

  return instructions;
}

/**
 * Generate instruction for a single segment
 * @param {Object} fromWaypoint - Starting waypoint
 * @param {Object} toWaypoint - Destination waypoint
 * @param {Object} segment - Segment data
 * @param {number} stepNumber - Step number
 * @returns {Object} Instruction object
 */
function generateSegmentInstruction(fromWaypoint, toWaypoint, segment, stepNumber) {
  const { distance, time, connectionType } = segment;

  // Detect floor change
  const floorChange = fromWaypoint.floor_number !== toWaypoint.floor_number;
  const floorDirection = toWaypoint.floor_number > fromWaypoint.floor_number ? 'up' : 'down';

  let instruction_ko = '';
  let instruction_en = '';
  let type = 'WALK';

  if (floorChange) {
    // Floor change instruction
    type = connectionType || 'ELEVATOR';
    const verb_ko = floorDirection === 'up' ? '올라가세요' : '내려가세요';
    const verb_en = floorDirection === 'up' ? 'go up' : 'go down';

    const transportMethod_ko = getTransportMethodKorean(connectionType);
    const transportMethod_en = getTransportMethodEnglish(connectionType);

    instruction_ko = `${transportMethod_ko}를 타고 ${toWaypoint.floor_number}층으로 ${verb_ko}`;
    instruction_en = `Take the ${transportMethod_en} to ${toWaypoint.floor_number}F`;
  } else {
    // Same floor navigation
    type = 'WALK';

    // Determine direction based on waypoint type
    if (toWaypoint.type === 'GATE') {
      const gateNumber = extractGateNumber(toWaypoint);
      instruction_ko = `${toWaypoint.name_ko} 방향으로 ${distance}m 이동하세요`;
      instruction_en = `Walk ${distance}m towards ${toWaypoint.name_en || `Gate ${gateNumber}`}`;
    } else if (toWaypoint.type === 'COUNTER') {
      instruction_ko = `${toWaypoint.name_ko} 방향으로 ${distance}m 이동하세요`;
      instruction_en = `Walk ${distance}m towards ${toWaypoint.name_en || toWaypoint.name_ko}`;
    } else if (toWaypoint.type === 'IMMIGRATION') {
      instruction_ko = `${toWaypoint.name_ko} 방향으로 ${distance}m 이동하세요`;
      instruction_en = `Walk ${distance}m to ${toWaypoint.name_en || 'Immigration'}`;
    } else if (toWaypoint.type === 'SECURITY') {
      instruction_ko = `보안검색대를 통과하세요 (${distance}m)`;
      instruction_en = `Pass through security checkpoint (${distance}m)`;
    } else {
      instruction_ko = `${toWaypoint.name_ko} 방향으로 ${distance}m 이동하세요`;
      instruction_en = `Walk ${distance}m towards ${toWaypoint.name_en || toWaypoint.name_ko}`;
    }
  }

  return {
    step: stepNumber,
    type,
    waypointId: toWaypoint.id,
    waypointType: toWaypoint.type,
    waypointName_ko: toWaypoint.name_ko,
    waypointName_en: toWaypoint.name_en,
    instruction_ko,
    instruction_en,
    distance,
    time: Math.round(time / 60), // Convert seconds to minutes
    floorChange,
    fromFloor: fromWaypoint.floor_number,
    toFloor: toWaypoint.floor_number
  };
}

/**
 * Get transport method name in Korean
 * @param {string} connectionType - Connection type
 * @returns {string} Korean name
 */
function getTransportMethodKorean(connectionType) {
  const methods = {
    ELEVATOR: '엘리베이터',
    ESCALATOR: '에스컬레이터',
    STAIRS: '계단'
  };
  return methods[connectionType] || '엘리베이터';
}

/**
 * Get transport method name in English
 * @param {string} connectionType - Connection type
 * @returns {string} English name
 */
function getTransportMethodEnglish(connectionType) {
  const methods = {
    ELEVATOR: 'elevator',
    ESCALATOR: 'escalator',
    STAIRS: 'stairs'
  };
  return methods[connectionType] || 'elevator';
}

/**
 * Extract gate number from waypoint metadata
 * @param {Object} waypoint - Waypoint object
 * @returns {string} Gate number
 */
function extractGateNumber(waypoint) {
  if (waypoint.metadata) {
    const metadata = typeof waypoint.metadata === 'string'
      ? JSON.parse(waypoint.metadata)
      : waypoint.metadata;

    if (metadata.gate_number) {
      return metadata.gate_number;
    }
  }

  // Fallback: extract from name
  const match = waypoint.name_ko.match(/(\d+)번/);
  return match ? match[1] : '';
}

/**
 * Format instructions as text message
 * @param {Array} instructions - Array of instruction objects
 * @param {Object} options - Formatting options
 * @param {string} [options.language] - Language ('ko' or 'en')
 * @param {boolean} [options.includeDistance] - Include distance info
 * @param {boolean} [options.includeTime] - Include time info
 * @returns {string} Formatted text
 */
function formatInstructionsAsText(instructions, options = {}) {
  const {
    language = 'ko',
    includeDistance = true,
    includeTime = true
  } = options;

  const lines = [];

  for (const instruction of instructions) {
    const text = language === 'ko' ? instruction.instruction_ko : instruction.instruction_en;
    let line = `${instruction.step}. ${text}`;

    if (includeTime && instruction.time > 0) {
      const timeText = language === 'ko' ? `(약 ${instruction.time}분)` : `(~${instruction.time} min)`;
      line += ` ${timeText}`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Format route summary
 * @param {Object} route - Route object with waypoints and segments
 * @param {string} language - Language ('ko' or 'en')
 * @returns {string} Summary text
 */
function formatRouteSummary(route, language = 'ko') {
  const { totalDistance, totalTime, waypoints } = route;

  if (language === 'ko') {
    return `📏 총 거리: ${totalDistance}m\n⏱️ 예상 소요시간: 약 ${totalTime}분\n📍 경유지: ${waypoints.length}개`;
  } else {
    return `📏 Total Distance: ${totalDistance}m\n⏱️ Estimated Time: ~${totalTime} min\n📍 Waypoints: ${waypoints.length}`;
  }
}

/**
 * Generate step-by-step guide with emojis
 * @param {Object} route - Route object
 * @param {Array} instructions - Instructions array
 * @param {string} language - Language ('ko' or 'en')
 * @returns {string} Formatted guide
 */
function generateStepByStepGuide(route, instructions, language = 'ko') {
  const lines = [];

  // Title
  if (language === 'ko') {
    lines.push('🗺️ 경로 안내');
    lines.push('');
  } else {
    lines.push('🗺️ Navigation Guide');
    lines.push('');
  }

  // Summary
  lines.push(formatRouteSummary(route, language));
  lines.push('');

  // Instructions with emojis
  for (const instruction of instructions) {
    const emoji = getInstructionEmoji(instruction.type);
    const text = language === 'ko' ? instruction.instruction_ko : instruction.instruction_en;

    let line = `${emoji} ${instruction.step}. ${text}`;

    if (instruction.time > 0) {
      const timeText = language === 'ko' ? `(${instruction.time}분)` : `(${instruction.time} min)`;
      line += ` ${timeText}`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Get emoji for instruction type
 * @param {string} type - Instruction type
 * @returns {string} Emoji
 */
function getInstructionEmoji(type) {
  const emojis = {
    WALK: '🚶',
    ELEVATOR: '🛗',
    ESCALATOR: '🔼',
    STAIRS: '🪜',
    ARRIVE: '🎯'
  };
  return emojis[type] || '➡️';
}

module.exports = {
  generateInstructions,
  generateSegmentInstruction,
  formatInstructionsAsText,
  formatRouteSummary,
  generateStepByStepGuide,
  getInstructionEmoji
};
