-- ============================================================================
-- Migration: 002_airport_navigation_sample_data.sql
-- Description: Insert sample data for Incheon Airport navigation (Terminal 1)
-- Author: Claude
-- Date: 2025-11-27
-- Version: 1.0
-- Note: This is sample/mock data for development and testing.
--       Production data should be obtained from Incheon Airport official sources.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Insert Terminal Data
-- ----------------------------------------------------------------------------
INSERT INTO nav_terminals (id, name_ko, name_en, airport_code) VALUES
('T1', '제1여객터미널', 'Terminal 1', 'ICN'),
('T2', '제2여객터미널', 'Terminal 2', 'ICN'),
('T1-CC', '제1터미널 탑승동', 'Terminal 1 Concourse', 'ICN');

-- ----------------------------------------------------------------------------
-- Insert Floor Data
-- ----------------------------------------------------------------------------
INSERT INTO nav_floors (id, terminal_id, floor_number, map_image_path) VALUES
('T1-1F', 'T1', 1, '/maps/t1_1f.png'),
('T1-3F', 'T1', 3, '/maps/t1_3f.png'),
('T1-4F', 'T1', 4, '/maps/t1_4f.png'),
('T2-1F', 'T2', 1, '/maps/t2_1f.png'),
('T2-3F', 'T2', 3, '/maps/t2_3f.png'),
('T2-4F', 'T2', 4, '/maps/t2_4f.png');

-- ----------------------------------------------------------------------------
-- Insert Waypoint Data - Terminal 1, Floor 3 (Main departure floor)
-- ----------------------------------------------------------------------------

-- Entrance waypoints
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, gps_lat, gps_lon, is_accessible) VALUES
('T1-3F-ENTRANCE-MAIN', 'T1', 3, 'ENTRANCE', '제1터미널 3층 메인 입구', 'T1 3F Main Entrance', 400, 100, 37.46020000, 126.44070000, TRUE),
('T1-3F-ENTRANCE-EAST', 'T1', 3, 'ENTRANCE', '제1터미널 3층 동측 입구', 'T1 3F East Entrance', 800, 100, 37.46030000, 126.44170000, TRUE),
('T1-3F-ENTRANCE-WEST', 'T1', 3, 'ENTRANCE', '제1터미널 3층 서측 입구', 'T1 3F West Entrance', 100, 100, 37.46010000, 126.43970000, TRUE);

-- Check-in counter waypoints (Zone A, B, C, D)
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, metadata, is_accessible) VALUES
('T1-3F-COUNTER-A', 'T1', 3, 'COUNTER', 'A 체크인 카운터', 'Check-in Counter A', 300, 250, '{"zone": "A", "counters": "01-20", "airlines": ["KE", "OZ"]}', TRUE),
('T1-3F-COUNTER-B', 'T1', 3, 'COUNTER', 'B 체크인 카운터', 'Check-in Counter B', 500, 250, '{"zone": "B", "counters": "21-40", "airlines": ["7C", "TW"]}', TRUE),
('T1-3F-COUNTER-C', 'T1', 3, 'COUNTER', 'C 체크인 카운터', 'Check-in Counter C', 700, 250, '{"zone": "C", "counters": "41-60", "airlines": ["LJ", "BX"]}', TRUE),
('T1-3F-COUNTER-D', 'T1', 3, 'COUNTER', 'D 체크인 카운터', 'Check-in Counter D', 900, 250, '{"zone": "D", "counters": "61-80", "airlines": ["ZE", "RS"]}', TRUE);

-- Immigration/Security checkpoints
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, is_accessible) VALUES
('T1-3F-SECURITY-A', 'T1', 3, 'SECURITY', 'A 보안검색대', 'Security Checkpoint A', 400, 400, TRUE),
('T1-3F-SECURITY-B', 'T1', 3, 'SECURITY', 'B 보안검색대', 'Security Checkpoint B', 600, 400, TRUE),
('T1-3F-IMMIGRATION-WEST', 'T1', 3, 'IMMIGRATION', '서측 출국심사대', 'West Immigration', 300, 550, TRUE),
('T1-3F-IMMIGRATION-CENTRAL', 'T1', 3, 'IMMIGRATION', '중앙 출국심사대', 'Central Immigration', 500, 550, TRUE),
('T1-3F-IMMIGRATION-EAST', 'T1', 3, 'IMMIGRATION', '동측 출국심사대', 'East Immigration', 700, 550, TRUE);

-- Gate waypoints (Sample gates: 101-110, 201-210, etc.)
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, metadata, is_accessible) VALUES
('T1-3F-GATE-101', 'T1', 3, 'GATE', '101번 게이트', 'Gate 101', 200, 800, '{"gate_number": "101", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-102', 'T1', 3, 'GATE', '102번 게이트', 'Gate 102', 300, 800, '{"gate_number": "102", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-103', 'T1', 3, 'GATE', '103번 게이트', 'Gate 103', 400, 800, '{"gate_number": "103", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-104', 'T1', 3, 'GATE', '104번 게이트', 'Gate 104', 500, 800, '{"gate_number": "104", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-105', 'T1', 3, 'GATE', '105번 게이트', 'Gate 105', 600, 800, '{"gate_number": "105", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-201', 'T1', 3, 'GATE', '201번 게이트', 'Gate 201', 700, 800, '{"gate_number": "201", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-202', 'T1', 3, 'GATE', '202번 게이트', 'Gate 202', 800, 800, '{"gate_number": "202", "gate_type": "contact"}', TRUE),
('T1-3F-GATE-203', 'T1', 3, 'GATE', '203번 게이트', 'Gate 203', 900, 800, '{"gate_number": "203", "gate_type": "contact"}', TRUE);

-- Transit/Connection waypoints
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, is_accessible) VALUES
('T1-3F-TRANSIT-CENTER', 'T1', 3, 'TRANSIT', '중앙 통로', 'Central Corridor', 500, 300, TRUE),
('T1-3F-TRANSIT-GATE-AREA', 'T1', 3, 'TRANSIT', '게이트 구역 입구', 'Gate Area Entrance', 500, 650, TRUE);

-- Facilities
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, is_accessible) VALUES
('T1-3F-INFO-MAIN', 'T1', 3, 'INFO', '종합 안내데스크', 'Main Information Desk', 400, 200, TRUE),
('T1-3F-RESTROOM-A', 'T1', 3, 'RESTROOM', '화장실 (A구역)', 'Restroom (Zone A)', 250, 350, TRUE),
('T1-3F-RESTROOM-B', 'T1', 3, 'RESTROOM', '화장실 (B구역)', 'Restroom (Zone B)', 750, 350, TRUE);

-- Elevators and vertical transit
INSERT INTO nav_waypoints (id, terminal_id, floor_number, type, name_ko, name_en, map_x, map_y, is_accessible) VALUES
('T1-3F-ELEVATOR-WEST', 'T1', 3, 'ELEVATOR', '서측 엘리베이터', 'West Elevator', 150, 300, TRUE),
('T1-3F-ELEVATOR-EAST', 'T1', 3, 'ELEVATOR', '동측 엘리베이터', 'East Elevator', 850, 300, TRUE),
('T1-3F-ESCALATOR-MAIN', 'T1', 3, 'ESCALATOR', '메인 에스컬레이터', 'Main Escalator', 400, 150, TRUE);

-- ----------------------------------------------------------------------------
-- Insert Waypoint Connections (Graph edges for pathfinding)
-- Note: Walking speed assumption: 4 km/h = 1.11 m/s
--       Time calculation: distance_meters / 1.11
-- ----------------------------------------------------------------------------

-- Main entrance to counters
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-ENTRANCE-MAIN', 'T1-3F-INFO-MAIN', 50, 45, 'WALK'),
('T1-3F-ENTRANCE-MAIN', 'T1-3F-TRANSIT-CENTER', 100, 90, 'WALK'),
('T1-3F-ENTRANCE-EAST', 'T1-3F-COUNTER-C', 80, 72, 'WALK'),
('T1-3F-ENTRANCE-WEST', 'T1-3F-COUNTER-A', 80, 72, 'WALK');

-- Info desk to counters
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-INFO-MAIN', 'T1-3F-COUNTER-A', 60, 54, 'WALK'),
('T1-3F-INFO-MAIN', 'T1-3F-COUNTER-B', 80, 72, 'WALK');

-- Transit center to all counters
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-TRANSIT-CENTER', 'T1-3F-COUNTER-A', 70, 63, 'WALK'),
('T1-3F-TRANSIT-CENTER', 'T1-3F-COUNTER-B', 50, 45, 'WALK'),
('T1-3F-TRANSIT-CENTER', 'T1-3F-COUNTER-C', 50, 45, 'WALK'),
('T1-3F-TRANSIT-CENTER', 'T1-3F-COUNTER-D', 70, 63, 'WALK');

-- Counters to security checkpoints
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-COUNTER-A', 'T1-3F-SECURITY-A', 100, 90, 'WALK'),
('T1-3F-COUNTER-B', 'T1-3F-SECURITY-A', 80, 72, 'WALK'),
('T1-3F-COUNTER-C', 'T1-3F-SECURITY-B', 80, 72, 'WALK'),
('T1-3F-COUNTER-D', 'T1-3F-SECURITY-B', 100, 90, 'WALK');

-- Security to immigration
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-SECURITY-A', 'T1-3F-IMMIGRATION-WEST', 120, 108, 'WALK'),
('T1-3F-SECURITY-A', 'T1-3F-IMMIGRATION-CENTRAL', 100, 90, 'WALK'),
('T1-3F-SECURITY-B', 'T1-3F-IMMIGRATION-CENTRAL', 100, 90, 'WALK'),
('T1-3F-SECURITY-B', 'T1-3F-IMMIGRATION-EAST', 120, 108, 'WALK');

-- Immigration to gate area transit
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-IMMIGRATION-WEST', 'T1-3F-TRANSIT-GATE-AREA', 80, 72, 'WALK'),
('T1-3F-IMMIGRATION-CENTRAL', 'T1-3F-TRANSIT-GATE-AREA', 60, 54, 'WALK'),
('T1-3F-IMMIGRATION-EAST', 'T1-3F-TRANSIT-GATE-AREA', 80, 72, 'WALK');

-- Gate area transit to gates
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-101', 150, 135, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-102', 160, 144, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-103', 170, 153, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-104', 180, 162, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-105', 190, 171, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-201', 200, 180, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-202', 210, 189, 'WALK'),
('T1-3F-TRANSIT-GATE-AREA', 'T1-3F-GATE-203', 220, 198, 'WALK');

-- Gates to adjacent gates (for alternative routing)
INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type) VALUES
('T1-3F-GATE-101', 'T1-3F-GATE-102', 50, 45, 'WALK'),
('T1-3F-GATE-102', 'T1-3F-GATE-103', 50, 45, 'WALK'),
('T1-3F-GATE-103', 'T1-3F-GATE-104', 50, 45, 'WALK'),
('T1-3F-GATE-104', 'T1-3F-GATE-105', 50, 45, 'WALK'),
('T1-3F-GATE-105', 'T1-3F-GATE-201', 60, 54, 'WALK'),
('T1-3F-GATE-201', 'T1-3F-GATE-202', 50, 45, 'WALK'),
('T1-3F-GATE-202', 'T1-3F-GATE-203', 50, 45, 'WALK');

-- Bidirectional connections (add reverse paths)
-- Note: In a real implementation, you might want to create a view or
-- handle bidirectional traversal in the pathfinding algorithm.
-- For simplicity, we'll insert reverse connections here.

INSERT INTO nav_waypoint_connections (from_waypoint_id, to_waypoint_id, distance_meters, walking_time_seconds, connection_type)
SELECT to_waypoint_id, from_waypoint_id, distance_meters, walking_time_seconds, connection_type
FROM nav_waypoint_connections
WHERE from_waypoint_id != to_waypoint_id;

-- ----------------------------------------------------------------------------
-- Insert Sample Flight Gate Data
-- Note: Using future dates for testing (adjust as needed)
-- ----------------------------------------------------------------------------
INSERT INTO nav_flight_gates (
  flight_number,
  airline_code,
  airline_name_ko,
  airline_name_en,
  departure_time,
  destination_code,
  destination_name_ko,
  destination_name_en,
  terminal_id,
  counter_zone,
  counter_numbers,
  gate_number,
  gate_waypoint_id,
  counter_waypoint_id,
  boarding_time,
  last_call_time,
  status
) VALUES
-- Korean Air flights
('KE001', 'KE', '대한항공', 'Korean Air', NOW(), 'JFK', '뉴욕 (존 F. 케네디)', 'New York (JFK)', 'T1', 'A', '01-20', '101', 'T1-3F-GATE-101', 'T1-3F-COUNTER-A', NOW(), NOW(), 'SCHEDULED'),
('KE123', 'KE', '대한항공', 'Korean Air', NOW(), 'LAX', '로스앤젤레스', 'Los Angeles', 'T1', 'A', '01-20', '102', 'T1-3F-GATE-102', 'T1-3F-COUNTER-A', NOW(), NOW(), 'SCHEDULED'),
('KE456', 'KE', '대한항공', 'Korean Air', NOW(), 'LHR', '런던 (히드로)', 'London (Heathrow)', 'T1', 'A', '01-20', '103', 'T1-3F-GATE-103', 'T1-3F-COUNTER-A', NOW(), NOW(), 'SCHEDULED'),

-- Asiana Airlines flights
('OZ201', 'OZ', '아시아나항공', 'Asiana Airlines', NOW(), 'NRT', '도쿄 (나리타)', 'Tokyo (Narita)', 'T1', 'A', '01-20', '104', 'T1-3F-GATE-104', 'T1-3F-COUNTER-A', NOW(), NOW(), 'SCHEDULED'),
('OZ345', 'OZ', '아시아나항공', 'Asiana Airlines', NOW(), 'CDG', '파리 (샤를 드골)', 'Paris (CDG)', 'T1', 'A', '01-20', '105', 'T1-3F-GATE-105', 'T1-3F-COUNTER-A', NOW(), NOW(), 'SCHEDULED'),

-- Low-cost carriers
('7C801', '7C', '제주항공', 'Jeju Air', NOW(), 'BKK', '방콕 (수완나품)', 'Bangkok (Suvarnabhumi)', 'T1', 'B', '21-40', '201', 'T1-3F-GATE-201', 'T1-3F-COUNTER-B', NOW(), NOW(), 'SCHEDULED'),
('TW301', 'TW', '티웨이항공', 'T\'way Air', NOW(), 'CTS', '삿포로 (신치토세)', 'Sapporo (New Chitose)', 'T1', 'B', '21-40', '202', 'T1-3F-GATE-202', 'T1-3F-COUNTER-B', NOW(), NOW(), 'SCHEDULED'),
('LJ567', 'LJ', '진에어', 'Jin Air', NOW(), 'FUK', '후쿠오카', 'Fukuoka', 'T1', 'C', '41-60', '203', 'T1-3F-GATE-203', 'T1-3F-COUNTER-C', NOW(), NOW(), 'SCHEDULED');

-- ============================================================================
-- End of migration: 002_airport_navigation_sample_data.sql
-- ============================================================================
