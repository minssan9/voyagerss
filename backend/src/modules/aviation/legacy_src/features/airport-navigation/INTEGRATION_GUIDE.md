# Airport Navigation - Integration Guide

This guide explains how to integrate the Airport Navigation feature into the main Aviation Bot application.

## Prerequisites

1. ✅ Database migrations run (001_airport_navigation_schema.sql, 002_airport_navigation_sample_data.sql)
2. ✅ Canvas dependency installed (`npm install`)
3. ✅ Directory structure created (`public/maps/`, `data/generated-maps/`)

## Integration Steps

### Step 1: Add to ApplicationFactory

Edit `src/ApplicationFactory.js` to register navigation services:

```javascript
const MySQLTerminalRepository = require('./features/airport-navigation/architecture/repositories/implementations/MySQLTerminalRepository');
const MySQLWaypointRepository = require('./features/airport-navigation/architecture/repositories/implementations/MySQLWaypointRepository');
const MySQLFlightGateRepository = require('./features/airport-navigation/architecture/repositories/implementations/MySQLFlightGateRepository');
const MySQLNavigationRouteRepository = require('./features/airport-navigation/architecture/repositories/implementations/MySQLNavigationRouteRepository');
const PathfindingService = require('./features/airport-navigation/architecture/services/PathfindingService');
const NavigationService = require('./features/airport-navigation/architecture/services/NavigationService');
const MapRenderingService = require('./features/airport-navigation/architecture/services/MapRenderingService');

// In createApp method, add:

// Airport Navigation Repositories
const terminalRepository = new MySQLTerminalRepository(database);
const waypointRepository = new MySQLWaypointRepository(database);
const flightGateRepository = new MySQLFlightGateRepository(database);
const navigationRouteRepository = new MySQLNavigationRouteRepository(database);

this.services.set('terminalRepository', terminalRepository);
this.services.set('waypointRepository', waypointRepository);
this.services.set('flightGateRepository', flightGateRepository);
this.services.set('navigationRouteRepository', navigationRouteRepository);

// Airport Navigation Services
const pathfindingService = new PathfindingService(waypointRepository, logger);
const navigationService = new NavigationService(
  waypointRepository,
  flightGateRepository,
  navigationRouteRepository,
  pathfindingService,
  logger
);
const mapRenderingService = new MapRenderingService(
  {
    mapsDir: path.join(process.cwd(), 'public/maps'),
    outputDir: path.join(process.cwd(), 'data/generated-maps'),
    defaultWidth: 1200,
    defaultHeight: 800
  },
  logger
);

this.services.set('pathfindingService', pathfindingService);
this.services.set('navigationService', navigationService);
this.services.set('mapRenderingService', mapRenderingService);
```

### Step 2: Add to app.js

Edit `src/app.js` to initialize navigation handlers:

```javascript
const NavigationCommandHandler = require('./features/airport-navigation/handlers/NavigationCommandHandler');

// In initialize() method, after initializing other handlers:

// Initialize Navigation Command Handler
const navigationService = applicationFactory.getService('navigationService');
const mapRenderingService = applicationFactory.getService('mapRenderingService');

this.navigationCommandHandler = new NavigationCommandHandler(
  this.bot,
  navigationService,
  mapRenderingService,
  console
);

this.navigationCommandHandler.setupHandlers();

console.log('✅ Navigation command handler initialized');
```

### Step 3: Add API Routes (Optional)

If you want to expose navigation via REST API, add routes in admin server or separate router:

```javascript
// In AdminServer.js or routes file:

app.get('/api/airports/incheon/terminals', async (req, res) => {
  const terminalRepository = /* get from DI */;
  const terminals = await terminalRepository.findAll();
  res.json({ success: true, data: terminals });
});

app.post('/api/navigation/route', async (req, res) => {
  const navigationService = /* get from DI */;
  const { flightNumber, startWaypointId, telegramUserId } = req.body;

  const navigation = await navigationService.navigateToFlight({
    flightNumber,
    startWaypointId,
    telegramUserId
  });

  res.json({ success: true, data: navigation });
});
```

### Step 4: Update Environment Config (if needed)

Add any configuration options to `.env`:

```env
# Airport Navigation
MAPS_DIR=./public/maps
GENERATED_MAPS_DIR=./data/generated-maps
MAP_DEFAULT_WIDTH=1200
MAP_DEFAULT_HEIGHT=800
MAP_CLEANUP_AGE_HOURS=24
```

### Step 5: Add Floor Map Images

Place actual Incheon Airport floor map images in `public/maps/`:

```
public/maps/
├── t1_1f.png    # Terminal 1, Floor 1
├── t1_3f.png    # Terminal 1, Floor 3
├── t1_4f.png    # Terminal 1, Floor 4
├── t2_1f.png    # Terminal 2, Floor 1
├── t2_3f.png    # Terminal 2, Floor 3
└── t2_4f.png    # Terminal 2, Floor 4
```

**Image Requirements:**
- Format: PNG (recommended) or JPG
- Resolution: 1200x800 or higher
- Naming: `<terminal-id>_<floor>f.png` (lowercase)

If no base maps are provided, the system will generate blank canvases with coordinate grids.

## Testing Integration

### Test 1: Database

```bash
# Connect to MySQL
mysql -u <user> -p aviation_bot

# Check tables exist
SHOW TABLES LIKE '%waypoint%';
SHOW TABLES LIKE '%terminal%';
SHOW TABLES LIKE '%flight_gate%';
SHOW TABLES LIKE '%navigation_route%';

# Check sample data
SELECT COUNT(*) FROM waypoints;
SELECT COUNT(*) FROM flight_gates;
```

### Test 2: Services

```javascript
// In Node.js console or test script
const navigationService = /* get from ApplicationFactory */;

// Test flight lookup
const flight = await flightGateRepository.findByFlightNumber('KE123');
console.log('Flight:', flight);

// Test pathfinding
const route = await pathfindingService.findRoute(
  'T1-3F-ENTRANCE-MAIN',
  'T1-3F-GATE-101'
);
console.log('Route:', route);

// Test navigation
const navigation = await navigationService.navigateToFlight({
  flightNumber: 'KE123',
  startWaypointId: 'T1-3F-ENTRANCE-MAIN',
  telegramUserId: 123456789
});
console.log('Navigation:', navigation);
```

### Test 3: Telegram Bot Commands

In Telegram:

```
/navigate KE123
→ Should show location selection keyboard

/gates KE
→ Should list Korean Air gates

/mylocation
→ Should request location sharing

/cancelnavigation
→ Should cancel active navigation
```

## Troubleshooting

### Issue: "No navigation commands working"

**Solution:**
- Check that `navigationCommandHandler.setupHandlers()` is called in `app.js`
- Verify bot is running and polling
- Check console for errors during initialization

### Issue: "Canvas module not found"

**Solution:**
```bash
npm install @napi-rs/canvas
```

### Issue: "Database tables not found"

**Solution:**
- Ensure migrations have run
- Check `migrations` table: `SELECT * FROM migrations;`
- Manually run migration files if needed:
  ```bash
  mysql -u <user> -p aviation_bot < src/config/migrations/001_airport_navigation_schema.sql
  mysql -u <user> -p aviation_bot < src/config/migrations/002_airport_navigation_sample_data.sql
  ```

### Issue: "Flight not found"

**Solution:**
- Check sample data exists: `SELECT * FROM flight_gates LIMIT 5;`
- Sample flights have future departure times
- Use test flight numbers: KE123, OZ201, 7C801, etc.

### Issue: "Map generation fails"

**Solution:**
- Check `data/generated-maps/` directory exists and is writable
- Check canvas installation: `node -e "require('@napi-rs/canvas')"`
- View detailed error in console logs

### Issue: "No route found"

**Solution:**
- Check waypoint connections exist: `SELECT COUNT(*) FROM waypoint_connections;`
- Verify start and end waypoints are valid
- Check graph is connected (no isolated nodes)
- Try different waypoint combinations

## Performance Monitoring

Monitor these metrics:

- **Route calculation time**: Should be < 50ms
- **Map generation time**: Should be < 200ms
- **Memory usage**: Graph cache ~5-10MB
- **File cleanup**: Old maps deleted after 24 hours

## Next Steps

After integration:

1. **Add Real Data**:
   - Import actual Incheon Airport waypoints with precise coordinates
   - Add real flight schedules via API integration
   - Upload actual floor map images

2. **Enhance Features**:
   - Real-time location tracking
   - Turn-by-turn voice navigation
   - Multi-language support (English, Chinese, Japanese)
   - AR navigation (future)

3. **Testing**:
   - User acceptance testing with beta users
   - Performance testing under load
   - Integration testing with real flight data

4. **Monitoring**:
   - Set up analytics (route usage, popular destinations)
   - Error tracking and logging
   - User feedback collection

## Support

For questions or issues:
- Review [README.md](./README.md) for architecture details
- Check [PRD](../../../docs/PRD_INCHEON_AIRPORT_NAVIGATION.md) for requirements
- See code comments for implementation details

## License

Proprietary - Part of Aviation Bot project
