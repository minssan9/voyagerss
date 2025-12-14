-- ============================================================================
-- Migration: 001_airport_navigation_schema.sql
-- Description: Create tables for Incheon Airport indoor navigation system
-- Author: Claude
-- Date: 2025-11-27
-- Version: 1.0
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: terminals
-- Description: Airport terminal information (T1, T2, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_terminals (
  id VARCHAR(10) PRIMARY KEY,
  name_ko VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  airport_code VARCHAR(3) DEFAULT 'ICN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: floors
-- Description: Floor information for each terminal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_floors (
  id VARCHAR(20) PRIMARY KEY,
  terminal_id VARCHAR(10) NOT NULL,
  floor_number INT NOT NULL,
  map_svg_path VARCHAR(500),
  map_image_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (terminal_id) REFERENCES nav_terminals(id) ON DELETE CASCADE,
  INDEX idx_terminal_floor (terminal_id, floor_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: waypoints
-- Description: Navigation nodes (gates, counters, elevators, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_waypoints (
  id VARCHAR(50) PRIMARY KEY,
  terminal_id VARCHAR(10) NOT NULL,
  floor_number INT NOT NULL,
  type ENUM(
    'COUNTER',
    'GATE',
    'IMMIGRATION',
    'SECURITY',
    'ELEVATOR',
    'ESCALATOR',
    'ENTRANCE',
    'INFO',
    'TRANSIT',
    'RESTROOM',
    'RESTAURANT',
    'SHOP',
    'LOUNGE'
  ) NOT NULL,
  name_ko VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  map_x INT NOT NULL COMMENT 'X coordinate on floor map (pixels)',
  map_y INT NOT NULL COMMENT 'Y coordinate on floor map (pixels)',
  gps_lat DECIMAL(10, 8) COMMENT 'GPS latitude if available',
  gps_lon DECIMAL(11, 8) COMMENT 'GPS longitude if available',
  metadata JSON COMMENT 'Additional properties: gate_number, counter_range, etc.',
  is_accessible BOOLEAN DEFAULT TRUE COMMENT 'Wheelchair accessible',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (terminal_id) REFERENCES nav_terminals(id) ON DELETE CASCADE,
  INDEX idx_type (type),
  INDEX idx_location (terminal_id, floor_number),
  INDEX idx_accessible (is_accessible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add spatial index for GPS coordinates (if MySQL 8.0+)
-- Note: Spatial index requires NOT NULL columns, so we'll skip it for now
-- and use regular B-tree indexes instead for nullable GPS columns

-- ----------------------------------------------------------------------------
-- Table: waypoint_connections
-- Description: Graph edges connecting waypoints (for pathfinding)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_waypoint_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_waypoint_id VARCHAR(50) NOT NULL,
  to_waypoint_id VARCHAR(50) NOT NULL,
  distance_meters DECIMAL(6, 2) NOT NULL,
  walking_time_seconds INT NOT NULL,
  is_accessible BOOLEAN DEFAULT TRUE COMMENT 'Wheelchair accessible',
  connection_type ENUM('WALK', 'ELEVATOR', 'ESCALATOR', 'STAIRS') DEFAULT 'WALK',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE CASCADE,
  FOREIGN KEY (to_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE CASCADE,
  UNIQUE KEY unique_connection (from_waypoint_id, to_waypoint_id),
  INDEX idx_from (from_waypoint_id),
  INDEX idx_to (to_waypoint_id),
  INDEX idx_type (connection_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: flight_gates
-- Description: Flight number to gate mapping (real-time or manual)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_flight_gates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_number VARCHAR(10) NOT NULL,
  airline_code VARCHAR(3) NOT NULL,
  airline_name_ko VARCHAR(100),
  airline_name_en VARCHAR(100),
  departure_time DATETIME NOT NULL,
  destination_code VARCHAR(3),
  destination_name_ko VARCHAR(100),
  destination_name_en VARCHAR(100),
  terminal_id VARCHAR(10) NOT NULL,
  counter_zone VARCHAR(5),
  counter_numbers VARCHAR(20) COMMENT 'e.g., "01-20"',
  gate_number VARCHAR(10),
  gate_waypoint_id VARCHAR(50),
  counter_waypoint_id VARCHAR(50),
  boarding_time DATETIME COMMENT 'Boarding start time',
  last_call_time DATETIME COMMENT 'Last call time',
  status ENUM('SCHEDULED', 'BOARDING', 'DEPARTED', 'CANCELLED', 'DELAYED') DEFAULT 'SCHEDULED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (terminal_id) REFERENCES nav_terminals(id) ON DELETE RESTRICT,
  FOREIGN KEY (gate_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE SET NULL,
  FOREIGN KEY (counter_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE SET NULL,
  INDEX idx_flight (flight_number, departure_time),
  INDEX idx_airline (airline_code),
  INDEX idx_departure (departure_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: user_locations
-- Description: User location tracking (GPS or manual selection)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_user_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  terminal_id VARCHAR(10),
  floor_number INT,
  nearest_waypoint_id VARCHAR(50),
  gps_lat DECIMAL(10, 8),
  gps_lon DECIMAL(11, 8),
  gps_accuracy_meters INT COMMENT 'GPS accuracy in meters',
  location_source ENUM('GPS', 'MANUAL', 'WIFI', 'BEACON') DEFAULT 'MANUAL',
  timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (terminal_id) REFERENCES nav_terminals(id) ON DELETE SET NULL,
  FOREIGN KEY (nearest_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE SET NULL,
  INDEX idx_user (telegram_user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_terminal (terminal_id, floor_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: navigation_routes
-- Description: Navigation route history and active sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nav_navigation_routes (
  id VARCHAR(36) PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  flight_number VARCHAR(10),
  start_waypoint_id VARCHAR(50) NOT NULL,
  end_waypoint_id VARCHAR(50) NOT NULL,
  route_waypoints JSON NOT NULL COMMENT 'Array of waypoint IDs in traversal order',
  total_distance_meters DECIMAL(7, 2),
  estimated_time_minutes INT,
  map_image_path VARCHAR(500) COMMENT 'Path to generated route map image',
  status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (start_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE RESTRICT,
  FOREIGN KEY (end_waypoint_id) REFERENCES nav_waypoints(id) ON DELETE RESTRICT,
  INDEX idx_user_status (telegram_user_id, status),
  INDEX idx_flight (flight_number),
  INDEX idx_status (status),
  INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- End of migration: 001_airport_navigation_schema.sql
-- ============================================================================
