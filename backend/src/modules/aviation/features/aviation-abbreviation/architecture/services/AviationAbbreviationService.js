/**
 * Aviation Abbreviation Service
 * Provides aviation abbreviation data and selection logic
 */
class AviationAbbreviationService {
  constructor() {
    // Comprehensive list of aviation abbreviations with Korean explanations
    this.abbreviations = [
      // Flight Operations
      { abbr: 'ATC', full: 'Air Traffic Control', description: '항공 교통 관제. 항공기의 안전한 이착륙과 비행을 위해 조종사에게 지시를 내리는 관제 시스템입니다.' },
      { abbr: 'IFR', full: 'Instrument Flight Rules', description: '계기 비행 규칙. 시정이 좋지 않을 때 항공기 계기만을 사용하여 비행하는 규칙입니다.' },
      { abbr: 'VFR', full: 'Visual Flight Rules', description: '시계 비행 규칙. 조종사가 육안으로 지형지물을 보면서 비행하는 규칙입니다.' },
      { abbr: 'ETD', full: 'Estimated Time of Departure', description: '예상 출발 시간. 항공기가 출발할 것으로 예상되는 시간입니다.' },
      { abbr: 'ETA', full: 'Estimated Time of Arrival', description: '예상 도착 시간. 항공기가 목적지에 도착할 것으로 예상되는 시간입니다.' },
      { abbr: 'ATIS', full: 'Automatic Terminal Information Service', description: '자동 공항 정보 방송. 공항의 기상, 활주로 정보 등을 자동으로 방송하는 서비스입니다.' },
      { abbr: 'SID', full: 'Standard Instrument Departure', description: '표준 계기 출발 절차. 이륙 후 정해진 경로를 따라 비행하는 표준화된 출발 절차입니다.' },
      { abbr: 'STAR', full: 'Standard Terminal Arrival Route', description: '표준 도착 경로. 착륙 전 정해진 경로를 따라 접근하는 표준화된 도착 절차입니다.' },
      { abbr: 'TCAS', full: 'Traffic Collision Avoidance System', description: '공중 충돌 방지 장치. 다른 항공기와의 충돌을 방지하기 위한 경고 시스템입니다.' },
      { abbr: 'GPWS', full: 'Ground Proximity Warning System', description: '지상 접근 경고 장치. 항공기가 지면에 위험하게 접근할 때 조종사에게 경고합니다.' },

      // Navigation
      { abbr: 'VOR', full: 'VHF Omnidirectional Range', description: 'VHF 전방향 무선표지. 항공기가 방위를 측정하는 데 사용하는 지상 무선 항법 시설입니다.' },
      { abbr: 'NDB', full: 'Non-Directional Beacon', description: '무지향성 무선표지. 모든 방향으로 신호를 발신하는 항법 보조 장치입니다.' },
      { abbr: 'ILS', full: 'Instrument Landing System', description: '계기 착륙 시스템. 시정이 좋지 않을 때 활주로에 정밀 접근할 수 있게 해주는 시스템입니다.' },
      { abbr: 'DME', full: 'Distance Measuring Equipment', description: '거리 측정 장비. 항공기와 지상국 간의 거리를 측정하는 장비입니다.' },
      { abbr: 'GPS', full: 'Global Positioning System', description: '위성 항법 시스템. 위성 신호를 이용해 정확한 위치를 파악하는 시스템입니다.' },
      { abbr: 'RNAV', full: 'Area Navigation', description: '지역 항법. VOR이나 NDB 없이도 원하는 경로로 비행할 수 있는 항법 방식입니다.' },
      { abbr: 'FMS', full: 'Flight Management System', description: '비행 관리 시스템. 항로, 연료, 성능 등을 종합적으로 관리하는 컴퓨터 시스템입니다.' },
      { abbr: 'INS', full: 'Inertial Navigation System', description: '관성 항법 장치. 가속도계와 자이로를 이용해 위치를 계산하는 자립 항법 시스템입니다.' },

      // Weather
      { abbr: 'METAR', full: 'Meteorological Aerodrome Report', description: '정시 기상 관측 보고. 공항의 현재 기상 상태를 보고하는 표준화된 형식입니다.' },
      { abbr: 'TAF', full: 'Terminal Aerodrome Forecast', description: '공항 기상 예보. 공항 주변의 예상 기상을 알려주는 예보입니다.' },
      { abbr: 'SIGMET', full: 'Significant Meteorological Information', description: '중요 기상 정보. 비행에 위험한 기상 현상(난기류, 화산재 등)을 알리는 정보입니다.' },
      { abbr: 'CAVOK', full: 'Ceiling And Visibility OK', description: '운고 및 시정 양호. 시정 10km 이상, 낮은 구름 없음, 중요 기상 현상 없음을 의미합니다.' },
      { abbr: 'VMC', full: 'Visual Meteorological Conditions', description: '시계 기상 상태. 시계 비행이 가능한 기상 조건입니다.' },
      { abbr: 'IMC', full: 'Instrument Meteorological Conditions', description: '계기 기상 상태. 시계 비행이 불가능하여 계기 비행이 필요한 기상 조건입니다.' },
      { abbr: 'CAT', full: 'Clear Air Turbulence', description: '청천 난기류. 구름이 없는 맑은 하늘에서 발생하는 난기류입니다.' },
      { abbr: 'CB', full: 'Cumulonimbus', description: '적란운. 뇌우를 동반하는 수직으로 발달한 구름으로, 항공기에 위험합니다.' },

      // Aircraft Systems
      { abbr: 'APU', full: 'Auxiliary Power Unit', description: '보조 동력 장치. 지상에서 항공기의 전기와 에어컨을 공급하는 소형 엔진입니다.' },
      { abbr: 'EFIS', full: 'Electronic Flight Instrument System', description: '전자식 비행 계기 시스템. 기존 아날로그 계기를 디지털 디스플레이로 대체한 시스템입니다.' },
      { abbr: 'EICAS', full: 'Engine Indicating and Crew Alerting System', description: '엔진 표시 및 승무원 경고 시스템. 엔진 상태와 경고를 표시하는 시스템입니다.' },
      { abbr: 'PFD', full: 'Primary Flight Display', description: '주 비행 디스플레이. 속도, 고도, 자세 등 핵심 비행 정보를 표시합니다.' },
      { abbr: 'MFD', full: 'Multi-Function Display', description: '다기능 디스플레이. 항법, 기상, 체크리스트 등 다양한 정보를 표시합니다.' },
      { abbr: 'HUD', full: 'Head-Up Display', description: '헤드업 디스플레이. 조종사의 시야에 비행 정보를 투영하는 장치입니다.' },
      { abbr: 'FADEC', full: 'Full Authority Digital Engine Control', description: '전자식 엔진 제어 장치. 엔진을 디지털로 제어하여 최적의 성능을 유지합니다.' },
      { abbr: 'ELT', full: 'Emergency Locator Transmitter', description: '비상 위치 지시 송신기. 비상 시 항공기 위치를 송신하는 장치입니다.' },
      { abbr: 'FDR', full: 'Flight Data Recorder', description: '비행 기록 장치(블랙박스). 비행 데이터를 기록하여 사고 조사에 활용됩니다.' },
      { abbr: 'CVR', full: 'Cockpit Voice Recorder', description: '조종실 음성 기록 장치. 조종실 내 대화와 소리를 기록합니다.' },

      // Flight Planning
      { abbr: 'NOTAM', full: 'Notice to Air Missions', description: '항공 정보 공고. 비행에 영향을 줄 수 있는 정보(공역 제한, 시설 변경 등)를 알립니다.' },
      { abbr: 'FL', full: 'Flight Level', description: '비행 고도. 표준 기압(1013.25hPa)을 기준으로 한 고도로, FL350은 35,000피트를 의미합니다.' },
      { abbr: 'MSL', full: 'Mean Sea Level', description: '평균 해수면. 고도 측정의 기준이 되는 해수면 높이입니다.' },
      { abbr: 'AGL', full: 'Above Ground Level', description: '지면 위 높이. 항공기가 지면으로부터 얼마나 높이 있는지를 나타냅니다.' },
      { abbr: 'QNH', full: 'Query: Nautical Height', description: '해면 기압. 이 값을 고도계에 설정하면 해발 고도가 표시됩니다.' },
      { abbr: 'QFE', full: 'Query: Field Elevation', description: '비행장 기압. 이 값을 설정하면 활주로 기준 높이가 표시됩니다.' },
      { abbr: 'ETOPS', full: 'Extended-range Twin-engine Operational Performance Standards', description: '쌍발기 장거리 운항 기준. 쌍발 항공기가 비상 착륙 공항에서 먼 곳을 비행할 수 있는 인증입니다.' },
      { abbr: 'PIC', full: 'Pilot In Command', description: '기장. 비행의 최종 책임을 지는 조종사입니다.' },
      { abbr: 'FO', full: 'First Officer', description: '부기장. 기장을 보조하는 조종사로, 부조종사라고도 합니다.' },
      { abbr: 'CRM', full: 'Crew Resource Management', description: '승무원 자원 관리. 팀워크와 커뮤니케이션을 통해 안전을 향상시키는 개념입니다.' },

      // Communication
      { abbr: 'SELCAL', full: 'Selective Calling System', description: '선택 호출 시스템. 지상에서 특정 항공기만 호출할 수 있는 통신 시스템입니다.' },
      { abbr: 'ACARS', full: 'Aircraft Communications Addressing and Reporting System', description: '항공기 통신 주소 지정 및 보고 시스템. 항공기와 지상 간 데이터 통신 시스템입니다.' },
      { abbr: 'CPDLC', full: 'Controller-Pilot Data Link Communications', description: '관제사-조종사 데이터 링크 통신. 음성 대신 텍스트로 통신하는 시스템입니다.' },
      { abbr: 'HF', full: 'High Frequency', description: '고주파. 장거리 항공 통신에 사용되는 무선 주파수 대역입니다.' },
      { abbr: 'VHF', full: 'Very High Frequency', description: '초고주파. 단거리 항공 통신과 항법에 사용되는 주파수 대역입니다.' },
      { abbr: 'SATCOM', full: 'Satellite Communications', description: '위성 통신. 위성을 이용한 항공기-지상 간 통신 시스템입니다.' },

      // Airport Operations
      { abbr: 'ICAO', full: 'International Civil Aviation Organization', description: '국제민간항공기구. 국제 항공 안전과 표준을 담당하는 UN 산하 기구입니다.' },
      { abbr: 'IATA', full: 'International Air Transport Association', description: '국제항공운송협회. 항공사들의 국제 협력 기구입니다.' },
      { abbr: 'FBO', full: 'Fixed-Base Operator', description: '공항 서비스 업체. 급유, 정비, 조업 등 항공기 지상 서비스를 제공하는 업체입니다.' },
      { abbr: 'GSE', full: 'Ground Support Equipment', description: '지상 지원 장비. 항공기 지상 조업에 사용되는 각종 장비(견인차, 급유차 등)입니다.' },
      { abbr: 'ARFF', full: 'Aircraft Rescue and Fire Fighting', description: '항공기 구조 및 소방. 공항의 비상 대응 서비스입니다.' },
      { abbr: 'RVR', full: 'Runway Visual Range', description: '활주로 가시 거리. 조종사가 활주로에서 볼 수 있는 거리입니다.' },
      { abbr: 'PAPI', full: 'Precision Approach Path Indicator', description: '정밀 진입 경로 표시등. 올바른 활강 경로를 알려주는 등화 시스템입니다.' },
      { abbr: 'ILS CAT', full: 'ILS Category', description: 'ILS 등급. I, II, III로 나뉘며, 숫자가 높을수록 더 낮은 시정에서 착륙 가능합니다.' },

      // Aircraft Performance
      { abbr: 'V1', full: 'Takeoff Decision Speed', description: '이륙 결심 속도. 이 속도 이후에는 이륙을 중단할 수 없습니다.' },
      { abbr: 'VR', full: 'Rotation Speed', description: '기수 들기 속도. 이륙 시 조종간을 당겨 기수를 드는 속도입니다.' },
      { abbr: 'V2', full: 'Takeoff Safety Speed', description: '이륙 안전 속도. 엔진 하나가 고장나도 안전하게 상승할 수 있는 속도입니다.' },
      { abbr: 'Vref', full: 'Reference Landing Speed', description: '착륙 기준 속도. 접근 시 유지해야 하는 속도입니다.' },
      { abbr: 'MTOW', full: 'Maximum Takeoff Weight', description: '최대 이륙 중량. 항공기가 이륙할 수 있는 최대 무게입니다.' },
      { abbr: 'MLW', full: 'Maximum Landing Weight', description: '최대 착륙 중량. 항공기가 착륙할 수 있는 최대 무게입니다.' },
      { abbr: 'ZFW', full: 'Zero Fuel Weight', description: '무연료 중량. 연료를 제외한 항공기의 총 무게입니다.' },
      { abbr: 'CG', full: 'Center of Gravity', description: '무게 중심. 항공기의 균형점으로, 안전한 비행을 위해 적절히 유지해야 합니다.' },

      // Safety & Emergency
      { abbr: 'MAYDAY', full: 'Distress Call', description: '조난 신호. 항공기가 심각한 위험에 처했을 때 사용하는 긴급 호출입니다.' },
      { abbr: 'PAN-PAN', full: 'Urgency Call', description: '긴급 호출. 위험하지만 즉각적인 위험은 아닐 때 사용하는 호출입니다.' },
      { abbr: 'SQUAWK', full: 'Transponder Code', description: '트랜스폰더 코드. 관제사가 레이더에서 항공기를 식별하는 4자리 코드입니다.' },
      { abbr: 'EGPWS', full: 'Enhanced Ground Proximity Warning System', description: '향상된 지상 접근 경고 시스템. 지형 데이터를 활용한 발전된 경고 시스템입니다.' },
      { abbr: 'RA', full: 'Resolution Advisory', description: '회피 권고. TCAS가 조종사에게 충돌 회피를 위해 내리는 지시입니다.' },
      { abbr: 'TA', full: 'Traffic Advisory', description: '교통 권고. TCAS가 근처 항공기의 존재를 알리는 경고입니다.' },
      { abbr: 'RVSM', full: 'Reduced Vertical Separation Minimum', description: '수직 분리 축소 공역. FL290~FL410에서 1,000피트 간격으로 비행하는 공역입니다.' },
      { abbr: 'LAHSO', full: 'Land and Hold Short Operations', description: '착륙 후 정지 운항. 교차 활주로 전에 정지하는 착륙 방식입니다.' },

      // Modern Aviation
      { abbr: 'ADS-B', full: 'Automatic Dependent Surveillance-Broadcast', description: '자동 종속 감시 방송. GPS 위치를 자동으로 송신하는 차세대 감시 기술입니다.' },
      { abbr: 'RNP', full: 'Required Navigation Performance', description: '필수 항법 성능. 정밀 항법 능력을 갖춘 항공기만 비행할 수 있는 절차입니다.' },
      { abbr: 'PBN', full: 'Performance Based Navigation', description: '성능 기반 항법. 항공기의 항법 성능에 따라 경로를 설정하는 개념입니다.' },
      { abbr: 'NextGen', full: 'Next Generation Air Transportation System', description: '차세대 항공 교통 시스템. 미국의 항공 교통 현대화 프로그램입니다.' },
      { abbr: 'SESAR', full: 'Single European Sky ATM Research', description: '유럽 단일 하늘 연구. 유럽의 항공 교통 관리 현대화 프로그램입니다.' },
      { abbr: 'EFB', full: 'Electronic Flight Bag', description: '전자 비행 가방. 종이 매뉴얼과 차트를 대체하는 태블릿 기기입니다.' },
      { abbr: 'SAF', full: 'Sustainable Aviation Fuel', description: '지속 가능 항공 연료. 탄소 배출을 줄이는 친환경 대체 연료입니다.' },
      { abbr: 'UAS', full: 'Unmanned Aircraft System', description: '무인 항공기 시스템. 드론과 관련 시스템을 통칭하는 용어입니다.' },

      // Airline Operations
      { abbr: 'OTP', full: 'On-Time Performance', description: '정시 운항률. 항공편이 정시에 출발/도착하는 비율입니다.' },
      { abbr: 'IROP', full: 'Irregular Operations', description: '비정상 운항. 지연, 결항, 회항 등 정상적이지 않은 운항 상황입니다.' },
      { abbr: 'MEL', full: 'Minimum Equipment List', description: '최소 장비 목록. 일부 장비가 고장나도 비행 가능한지 판단하는 목록입니다.' },
      { abbr: 'CDL', full: 'Configuration Deviation List', description: '형상 이탈 목록. 외부 부품 손상 시 비행 가능 여부를 판단하는 목록입니다.' },
      { abbr: 'AOG', full: 'Aircraft On Ground', description: '기재 결항. 정비 문제로 항공기가 운항하지 못하는 상태입니다.' },
      { abbr: 'ETD', full: 'Estimated Time of Departure', description: '예상 출발 시각. 항공기가 출발할 것으로 예상되는 시각입니다.' },
      { abbr: 'ATD', full: 'Actual Time of Departure', description: '실제 출발 시각. 항공기가 실제로 출발한 시각입니다.' },
      { abbr: 'OFP', full: 'Operational Flight Plan', description: '운항 비행 계획. 연료, 경로, 대체 공항 등이 포함된 비행 계획서입니다.' },

      // Common Radio Phraseology
      { abbr: 'ROGER', full: 'Message Received', description: '메시지 수신 완료. 상대방의 메시지를 받았음을 알리는 용어입니다.' },
      { abbr: 'WILCO', full: 'Will Comply', description: '지시 이행 예정. 관제사의 지시를 따르겠다는 의미입니다.' },
      { abbr: 'AFFIRM', full: 'Yes (Affirmative)', description: '긍정. 예를 의미하는 항공 무선 용어입니다.' },
      { abbr: 'NEGATIVE', full: 'No', description: '부정. 아니오를 의미하는 항공 무선 용어입니다.' },
      { abbr: 'STANDBY', full: 'Wait', description: '대기. 잠시 기다리라는 의미입니다.' },
      { abbr: 'SAY AGAIN', full: 'Repeat', description: '다시 말해주세요. 메시지를 반복해달라는 요청입니다.' },
      { abbr: 'CLEARED', full: 'Authorized to proceed', description: '허가됨. 특정 행동(이륙, 착륙, 진입 등)이 허가되었음을 의미합니다.' }
    ];

    // Track which abbreviations have been sent recently to avoid repetition
    this.recentlySent = [];
    this.maxRecentHistory = 50;
  }

  /**
   * Get random abbreviations for notification
   * @param {number} count - Number of abbreviations to return
   * @returns {Array} Array of selected abbreviations
   */
  getRandomAbbreviations(count = 10) {
    // Filter out recently sent abbreviations
    const availableAbbreviations = this.abbreviations.filter(
      abbr => !this.recentlySent.includes(abbr.abbr)
    );

    // If we've used most abbreviations, reset the history
    if (availableAbbreviations.length < count) {
      this.recentlySent = [];
      return this._selectRandom(this.abbreviations, count);
    }

    const selected = this._selectRandom(availableAbbreviations, count);

    // Update recently sent list
    selected.forEach(abbr => {
      this.recentlySent.push(abbr.abbr);
    });

    // Trim history if too long
    if (this.recentlySent.length > this.maxRecentHistory) {
      this.recentlySent = this.recentlySent.slice(-this.maxRecentHistory);
    }

    return selected;
  }

  /**
   * Select random items from array
   * @param {Array} array - Source array
   * @param {number} count - Number of items to select
   * @returns {Array} Selected items
   * @private
   */
  _selectRandom(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Format abbreviations for Telegram message
   * @param {Array} abbreviations - Array of abbreviation objects
   * @returns {string} Formatted message
   */
  formatForTelegram(abbreviations) {
    const header = `✈️ *항공 용어 알아보기*\n\n`;
    const subheader = `📚 자주 사용되는 항공 축약어 ${abbreviations.length}선\n`;
    const divider = `━━━━━━━━━━━━━━━━━━━━\n\n`;

    let body = '';
    abbreviations.forEach((abbr, index) => {
      body += `*${index + 1}. ${abbr.abbr}*\n`;
      body += `📌 ${abbr.full}\n`;
      body += `💡 ${abbr.description}\n\n`;
    });

    const footer = `━━━━━━━━━━━━━━━━━━━━\n`;
    const tip = `💬 더 많은 항공 지식을 원하시면 /quiz 를 입력해보세요!`;

    return header + subheader + divider + body + footer + tip;
  }

  /**
   * Get total count of abbreviations
   * @returns {number} Total abbreviation count
   */
  getTotalCount() {
    return this.abbreviations.length;
  }

  /**
   * Search abbreviations by keyword
   * @param {string} keyword - Search keyword
   * @returns {Array} Matching abbreviations
   */
  searchAbbreviations(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return this.abbreviations.filter(abbr =>
      abbr.abbr.toLowerCase().includes(lowerKeyword) ||
      abbr.full.toLowerCase().includes(lowerKeyword) ||
      abbr.description.includes(keyword)
    );
  }

  /**
   * Get abbreviation by code
   * @param {string} code - Abbreviation code
   * @returns {Object|null} Abbreviation object or null
   */
  getByCode(code) {
    return this.abbreviations.find(
      abbr => abbr.abbr.toUpperCase() === code.toUpperCase()
    ) || null;
  }
}

module.exports = AviationAbbreviationService;
