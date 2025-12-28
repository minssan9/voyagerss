# Aviation Quiz System - Redesigned Architecture

## Overview

This document describes the redesigned architecture for the Aviation Quiz System, implementing a clean layered architecture with proper separation of concerns, dependency injection, and comprehensive error handling.

## Architecture Layers

### 1. Presentation Layer (Controllers)
- **Location**: `architecture/controllers/`
- **Purpose**: Handle HTTP requests and responses
- **Responsibilities**:
  - Input validation and sanitization
  - Route requests to appropriate services
  - Transform responses to client format
  - Handle HTTP-specific concerns

### 2. Business Layer (Services)
- **Location**: `architecture/services/`
- **Purpose**: Implement business logic and use cases
- **Responsibilities**:
  - Business rule validation
  - Data orchestration between layers
  - Use case implementation
  - Domain logic

### 3. Data Access Layer (Repositories)
- **Location**: `architecture/repositories/`
- **Purpose**: Abstract database operations
- **Responsibilities**:
  - Database query implementation
  - Data persistence logic
  - Database-specific optimizations
  - Transaction management

### 4. Infrastructure Layer
- **Location**: `architecture/config/`, `architecture/container/`, `architecture/errors/`
- **Purpose**: Cross-cutting concerns and external integrations
- **Responsibilities**:
  - Configuration management
  - Dependency injection
  - Error handling
  - Logging and monitoring

## Key Components

### Data Transfer Objects (DTOs)
- **Location**: `architecture/dtos/`
- **Purpose**: Standardize data structure for API responses
- **Features**:
  - Input validation
  - Data transformation
  - Type safety
  - JSON serialization

### Repository Pattern
- **Interfaces**: `architecture/repositories/interfaces/`
- **Implementations**: `architecture/repositories/implementations/`
- **Benefits**:
  - Database abstraction
  - Testability
  - Flexibility to change data sources
  - Consistent data access patterns

### Service Layer
- **Location**: `architecture/services/`
- **Features**:
  - Business logic encapsulation
  - Transaction management
  - Error handling
  - Data validation

### Dependency Injection
- **Location**: `architecture/container/`
- **Features**:
  - Service registration
  - Singleton management
  - Dependency resolution
  - Lifecycle management

### Error Handling
- **Location**: `architecture/errors/`, `architecture/middleware/`
- **Features**:
  - Structured error types
  - Global error handling
  - Error logging
  - Consistent error responses

## API Endpoints

### Topics
- `GET /api/topics` - Get all topics
- `GET /api/topics/:id` - Get topic by ID
- `GET /api/topics/day/:dayOfWeek` - Get topic by day of week
- `POST /api/topics` - Create new topic
- `PUT /api/topics/:id` - Update topic
- `DELETE /api/topics/:id` - Delete topic
- `GET /api/topics/schedule/weekly` - Get weekly schedule
- `GET /api/topics/search` - Search topics
- `GET /api/topics/stats` - Get topic statistics


### Knowledge
- `GET /api/knowledge/day/:dayOfWeek` - Get knowledge by day
- `GET /api/knowledge/topic/:dayOfWeek` - Get topic by day
- `GET /api/knowledge/topics` - Get all topics
- `GET /api/knowledge/schedule` - Get weekly schedule
- `GET /api/knowledge/difficulty/:level` - Get topics by difficulty
- `GET /api/knowledge/random` - Get random topic from all
- `GET /api/knowledge/search` - Search topics
- `GET /api/knowledge/stats` - Get comprehensive statistics

## Configuration

### Environment Variables
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=aviation_quiz

# AI Providers
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_BASE_URL=http://localhost:11434

# Application
NODE_ENV=development
PORT=3010
JWT_SECRET=your_jwt_secret
```

### Configuration Management
- **File**: `architecture/config/ConfigManager.js`
- **Features**:
  - Environment-specific configuration
  - Default values
  - Configuration merging
  - Type validation

## Error Handling

### Error Types
- `ValidationError` - Input validation failures
- `NotFoundError` - Resource not found
- `ConflictError` - Data conflicts
- `UnauthorizedError` - Authentication failures
- `ForbiddenError` - Authorization failures
- `DatabaseError` - Database operation failures
- `ExternalServiceError` - External API failures
- `RateLimitError` - Rate limit exceeded
- `BusinessLogicError` - Business rule violations
- `ConfigurationError` - Configuration issues

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "category": "ERROR_CATEGORY",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Usage Examples

### Creating the Application
```javascript
const ApplicationFactory = require('./architecture/ApplicationFactory');
const database = require('./config/database');

const factory = new ApplicationFactory();
const app = factory.createApp(database);

app.listen(3010, () => {
  console.log('Aviation Quiz System running on port 3010');
});
```

### Using Services Directly
```javascript
const container = factory.getContainer();
const knowledgeService = container.getAviationKnowledgeService();

// Get knowledge for Monday
const mondayKnowledge = await knowledgeService.getKnowledgeByDay(1);

// Get random topic
const randomTopic = await knowledgeService.getRandomTopicFromAll();
```

### Error Handling
```javascript
const { ErrorFactory } = require('./architecture/errors/AppError');

try {
  // Some operation
} catch (error) {
  if (error.name === 'ValidationError') {
    throw ErrorFactory.validation('Invalid input data', 'fieldName');
  }
  throw error;
}
```

## Benefits of the New Architecture

### 1. Separation of Concerns
- Each layer has a single responsibility
- Changes in one layer don't affect others
- Easier to understand and maintain

### 2. Testability
- Each component can be unit tested independently
- Mock dependencies easily
- Isolated business logic testing

### 3. Flexibility
- Easy to swap implementations
- Database-agnostic business logic
- Configurable components

### 4. Maintainability
- Clear code organization
- Consistent patterns
- Easy to add new features

### 5. Scalability
- Horizontal scaling support
- Caching strategies
- Performance optimizations

## Migration Guide

### From Old Architecture
1. **Replace direct database calls** with repository pattern
2. **Move business logic** from controllers to services
3. **Implement DTOs** for data transformation
4. **Add dependency injection** for service management
5. **Implement proper error handling** throughout the application

### Database Schema
The new architecture uses the same database schema but with improved query patterns and transaction management.

## Performance Considerations

### Caching
- Repository-level caching for frequently accessed data
- Service-level caching for computed results
- HTTP response caching for static data

### Database Optimization
- Connection pooling
- Query optimization
- Index strategies
- Transaction management

### Monitoring
- Error tracking
- Performance metrics
- Health checks
- Logging strategies

## Security

### Input Validation
- DTO validation
- SQL injection prevention
- XSS protection
- Rate limiting

### Authentication & Authorization
- JWT token management
- Role-based access control
- API key management
- Session management

## Testing Strategy

### Unit Tests
- Service layer testing
- Repository testing
- DTO validation testing
- Error handling testing

### Integration Tests
- API endpoint testing
- Database integration testing
- External service testing
- End-to-end testing

### Test Data Management
- Test database setup
- Mock data generation
- Test isolation
- Cleanup strategies
