# Airport Navigation Feature

Indoor navigation system for Incheon International Airport.

## Overview

This feature provides turn-by-turn navigation for passengers to find their way from their current location to their departure gate, including check-in counters, immigration, and other airport facilities.

## Features

- **Flight-based Navigation**: Enter flight number to get route to gate
- **Point-to-Point Navigation**: Navigate between any two waypoints
- **GPS Location Detection**: Automatic location detection using GPS
- **Manual Location Selection**: Select from predefined waypoints
- **Turn-by-Turn Instructions**: Step-by-step guidance in Korean and English
- **Accessibility Options**: Avoid stairs, wheelchair-accessible routes
- **Facility Finder**: Locate restrooms, restaurants, lounges, etc.

## Architecture

### Layer Structure

```
airport-navigation/
├── architecture/
│   ├── repositories/
│   │   ├── interfaces/          # Repository contracts
│   │   └── implementations/     # MySQL implementations
│   └── services/                # Business logic
│       ├── PathfindingService.js
│       └── NavigationService.js
└── utils/
    ├── dijkstra.js              # Pathfinding algorithm
    └── instructionGenerator.js   # Turn-by-turn instructions
```

### Data Flow

```
User Request
    ↓
NavigationService (Business Logic)
    ↓
PathfindingService (Route Calculation)
    ↓
Dijkstra Algorithm (Graph Traversal)
    ↓
WaypointRepository (Data Access)
    ↓
MySQL Database
```

## Database Schema

### Core Tables

- **terminals**: Terminal information (T1, T2)
- **floors**: Floor maps for each terminal
- **waypoints**: Navigation nodes (gates, counters, etc.)
- **waypoint_connections**: Graph edges with distances
- **flight_gates**: Flight-to-gate mappings
- **navigation_routes**: Route history

### Graph Structure

The navigation system uses a directed weighted graph:
- **Nodes**: Waypoints (gates, counters, entrances, etc.)
- **Edges**: Physical connections with distance and walking time
- **Weight**: Distance in meters

## Services

### PathfindingService

Handles shortest path calculations using Dijkstra's algorithm.

**Methods:**
- `findRoute(startId, endId, options)`: Find shortest route
- `getGraph()`: Build/retrieve cached waypoint graph
- `findReachableWaypoints(startId, maxDistance)`: Find all waypoints within distance
- `getGraphStats()`: Get graph statistics

**Options:**
- `avoidStairs`: Use elevators/escalators only
- `accessibleOnly`: Wheelchair-accessible routes only

**Example:**
```javascript
const route = await pathfindingService.findRoute(
  'T1-3F-ENTRANCE-MAIN',
  'T1-3F-GATE-101',
  { avoidStairs: true }
);

// route = {
//   path: ['T1-3F-ENTRANCE-MAIN', ..., 'T1-3F-GATE-101'],
//   waypoints: [...],
//   segments: [...],
//   totalDistance: 450,
//   totalTime: 8
// }
```

### NavigationService

Main business logic for navigation.

**Methods:**
- `navigateToFlight({ flightNumber, startWaypointId, telegramUserId })`: Navigate to flight gate
- `navigateBetweenWaypoints({ startWaypointId, endWaypointId, telegramUserId })`: Point-to-point navigation
- `detectUserLocation({ lat, lon, waypointId })`: Detect user's location
- `getGatesByAirline(airlineCode)`: Get gates for airline
- `findFacilities(type, terminalId, floorNumber)`: Find facilities
- `formatNavigationMessage(navigation, language)`: Format for Telegram

**Example:**
```javascript
const navigation = await navigationService.navigateToFlight({
  flightNumber: 'KE123',
  startWaypointId: 'T1-3F-ENTRANCE-MAIN',
  telegramUserId: 123456789
});

// navigation = {
//   flight: { ... },
//   route: { ... },
//   instructions: [
//     {
//       step: 1,
//       instruction_ko: 'A 체크인 카운터 방향으로 50m 이동하세요',
//       instruction_en: 'Walk 50m towards Check-in Counter A',
//       distance: 50,
//       time: 1
//     },
//     ...
//   ]
// }
```

## Algorithms

### Dijkstra's Shortest Path

**Implementation**: `utils/dijkstra.js`

**Complexity:**
- Time: O((V + E) log V) with priority queue
- Space: O(V + E)

**Features:**
- Priority queue (min-heap) for efficiency
- Edge filtering (accessibility, connection type)
- Path reconstruction
- Graph caching (5-minute TTL)

**Graph Caching:**
The waypoint graph is cached for 5 minutes to improve performance:
- First request: Build graph from database (~100-200ms)
- Subsequent requests: Use cached graph (~1-5ms)
- Cache invalidation: Automatic after 5 minutes or manual via `clearCache()`

### Instruction Generation

**Implementation**: `utils/instructionGenerator.js`

**Features:**
- Bilingual support (Korean/English)
- Floor change detection
- Transport method selection (elevator, escalator, stairs)
- Distance and time estimation
- Emoji formatting for Telegram

**Example Output:**
```
🗺️ 경로 안내

📏 총 거리: 450m
⏱️ 예상 소요시간: 약 8분
📍 경유지: 5개

🚶 1. A 체크인 카운터 방향으로 50m 이동하세요 (1분)
🚶 2. 보안검색대를 통과하세요 (100m)
🛗 3. 엘리베이터를 타고 3층으로 올라가세요
🚶 4. 101번 게이트 방향으로 300m 이동하세요 (5분)
🎯 5. 101번 게이트에 도착했습니다.
```

## Usage Examples

### Example 1: Navigate to Flight

```javascript
const NavigationService = require('./architecture/services/NavigationService');

// Initialize service
const navigationService = new NavigationService(
  waypointRepository,
  flightGateRepository,
  navigationRouteRepository,
  pathfindingService,
  logger
);

// Create navigation
const navigation = await navigationService.navigateToFlight({
  flightNumber: 'KE123',
  startWaypointId: 'T1-3F-ENTRANCE-MAIN',
  telegramUserId: 123456789,
  options: {
    avoidStairs: false,
    accessibleOnly: false
  }
});

// Format message for Telegram
const message = navigationService.formatNavigationMessage(navigation, 'ko');
console.log(message);
```

### Example 2: Detect User Location

```javascript
// GPS-based detection
const location = await navigationService.detectUserLocation({
  lat: 37.4602,
  lon: 126.4407
});

console.log(location);
// {
//   waypoint: { id: 'T1-3F-ENTRANCE-MAIN', ... },
//   source: 'GPS',
//   distance: 15
// }

// Manual selection
const location = await navigationService.detectUserLocation({
  waypointId: 'T1-3F-ENTRANCE-MAIN'
});
```

### Example 3: Find Facilities

```javascript
// Find restrooms on 3rd floor of Terminal 1
const restrooms = await navigationService.findFacilities(
  'RESTROOM',
  'T1',
  3
);

console.log(restrooms);
// [
//   { id: 'T1-3F-RESTROOM-A', name_ko: '화장실 (A구역)', ... },
//   { id: 'T1-3F-RESTROOM-B', name_ko: '화장실 (B구역)', ... }
// ]
```

## Performance

### Benchmarks (Sample Data)

| Operation | Time | Notes |
|-----------|------|-------|
| Build Graph (cold) | ~150ms | 350 waypoints, 700 connections |
| Build Graph (cached) | <1ms | From memory |
| Find Route (simple) | ~5ms | Same floor, 5 waypoints |
| Find Route (complex) | ~15ms | Multi-floor, 15 waypoints |
| Generate Instructions | ~2ms | 10 steps |

### Optimization Strategies

1. **Graph Caching**: 5-minute TTL reduces repeated graph builds
2. **Connection Indexing**: Database indexes on `from_waypoint_id`
3. **Priority Queue**: Min-heap for O(log V) operations
4. **Lazy Waypoint Loading**: Only load full waypoint details for path nodes

## Testing

### Unit Tests

Test files to be created:
- `dijkstra.test.js`: Algorithm correctness
- `PathfindingService.test.js`: Route finding
- `NavigationService.test.js`: Business logic
- `instructionGenerator.test.js`: Instruction formatting

### Test Coverage Goals

- Dijkstra algorithm: 100%
- PathfindingService: 85%+
- NavigationService: 80%+
- Instruction generator: 90%+

## Next Steps (Phase 3-4)

### Phase 3: Map Visualization
- [ ] Implement map rendering with `node-canvas`
- [ ] Draw route overlays (red path, markers)
- [ ] Generate PNG images
- [ ] Store/serve map images

### Phase 4: Telegram Integration
- [ ] `/navigate <flight>` command handler
- [ ] GPS location sharing handler
- [ ] Manual location selection UI (inline keyboard)
- [ ] Turn-by-turn message delivery
- [ ] Route progress tracking

## References

- [PRD](../../../docs/PRD_INCHEON_AIRPORT_NAVIGATION.md)
- [Codebase Analysis](../../../CODEBASE_ANALYSIS.md)
- [Dijkstra's Algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)

## License

Proprietary - Part of Aviation Bot project
