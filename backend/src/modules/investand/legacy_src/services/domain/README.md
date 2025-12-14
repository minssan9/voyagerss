# Domain Services Architecture

## Overview

This directory contains the redesigned domain services architecture that provides a clean, organized, and maintainable structure for the backend application.

## Architecture Principles

### 1. Domain-Driven Design (DDD)
- **Domain Services**: Business logic organized by domain boundaries
- **Service Registry**: Central registry for all domain services
- **Clear Separation**: Each service has a single responsibility

### 2. Layered Architecture
```
┌─────────────────────────────────────┐
│           API Layer                  │
│     (Routes & Controllers)          │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Domain Layer                │
│    (Business Logic Services)       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│        Infrastructure Layer         │
│   (Data Collection & Processing)   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Data Layer                  │
│      (Repositories & Database)      │
└─────────────────────────────────────┘
```

## Domain Services

### 1. DataCollectionService
**Purpose**: Unified data collection from all sources (DART, KRX, Fear & Greed)

**Key Features**:
- Integrated collection from multiple data sources
- Batch processing support
- Historical data collection
- Environment validation

**API Endpoints**:
- `POST /api/domain/collect/daily` - Daily data collection
- `POST /api/domain/collect/specific` - Source-specific collection
- `POST /api/domain/collect/historical` - Historical data collection

### 2. BatchProcessingService
**Purpose**: Scheduling, queue management, and batch job orchestration

**Key Features**:
- Cron-based scheduling
- Job queue management
- Weekly report generation
- Batch job monitoring

**API Endpoints**:
- `POST /api/domain/batch/schedule-daily` - Schedule daily collection
- `POST /api/domain/batch/schedule-historical` - Schedule historical collection
- `POST /api/domain/batch/weekly-report` - Generate weekly report

### 3. MarketAnalysisService
**Purpose**: Market analysis, Fear & Greed Index calculations, and investment insights

**Key Features**:
- Current market analysis
- Period-based analysis
- Investment insights generation
- Risk assessment

**API Endpoints**:
- `GET /api/domain/analysis/current` - Current market analysis
- `GET /api/domain/analysis/period` - Period-based analysis
- `GET /api/domain/analysis/insights` - Investment insights

## Service Registry

The `ServiceRegistry` acts as a central hub for all domain services:

```typescript
// Service access
ServiceRegistry.dataCollection.collectDailyData(date, options)
ServiceRegistry.batchProcessing.scheduleDailyCollection(date, options)
ServiceRegistry.marketAnalysis.getCurrentMarketAnalysis()
```

## Migration from Old Architecture

### Before (Issues):
- Mixed responsibilities in `core/` and `collectors/`
- Tight coupling between services
- Inconsistent patterns
- Scattered business logic

### After (Solutions):
- Clear domain boundaries
- Loose coupling through service registry
- Consistent patterns across all services
- Centralized business logic

## File Organization

```
src/services/domain/
├── DataCollectionService.ts      # Unified data collection
├── BatchProcessingService.ts     # Batch job management
├── MarketAnalysisService.ts      # Market analysis & insights
├── ServiceRegistry.ts            # Central service registry
└── README.md                     # This documentation
```

## Usage Examples

### 1. Daily Data Collection
```typescript
// Collect all data for a specific date
const result = await ServiceRegistry.dataCollection.collectDailyData('2024-01-15', {
  includeDart: true,
  includeKrx: true,
  includeFearGreed: true
});
```

### 2. Batch Job Scheduling
```typescript
// Schedule daily collection
const jobId = await ServiceRegistry.batchProcessing.scheduleDailyCollection('2024-01-15', {
  priority: 'high'
});
```

### 3. Market Analysis
```typescript
// Get current market analysis
const analysis = await ServiceRegistry.marketAnalysis.getCurrentMarketAnalysis();
```

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Scalability**: Easy to add new domain services
3. **Testability**: Each service can be tested independently
4. **Consistency**: Uniform patterns across all services
5. **Flexibility**: Services can be composed and orchestrated easily

## Future Enhancements

1. **Event-Driven Architecture**: Add event publishing/subscribing
2. **Caching Layer**: Implement Redis caching for frequently accessed data
3. **Monitoring**: Add comprehensive monitoring and alerting
4. **API Versioning**: Support multiple API versions
5. **Rate Limiting**: Implement per-service rate limiting

## Dependencies

- **Core Services**: `@/services/core/*` (existing services)
- **Collectors**: `@/collectors/*` (data collection services)
- **Repositories**: `@/repositories/*` (data access layer)
- **Utils**: `@/utils/common/*` (utility functions)

## Configuration

The domain services are automatically initialized when the server starts in production mode. The initialization process:

1. Registers all domain services
2. Initializes the batch processing service (including schedulers)
3. Validates the environment
4. Starts background processes

## Error Handling

All domain services include comprehensive error handling:
- Input validation
- Graceful error recovery
- Detailed error logging
- User-friendly error messages

## Monitoring

The service registry provides status information:
- Service initialization status
- Registered services list
- Service health checks
- Performance metrics
