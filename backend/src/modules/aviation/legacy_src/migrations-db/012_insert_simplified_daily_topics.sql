-- Insert simplified daily topics (31 days) with clean structure
-- Each topic is assigned to a specific day of the month (1-31)

INSERT INTO topics (name, description, day_of_month, topic_category, difficulty_level, is_active) VALUES 
-- Week 1: Basic Aviation Knowledge (Days 1-7)
('Engine Failure 대응', '엔진 고장 시 비상 절차와 대응 방법', 1, '안전 및 응급상황', 'advanced', 1),
('양력 생성 원리', '항공기 양력 생성의 기본 원리와 공기역학', 2, '항공역학', 'intermediate', 1),
('VFR 항법 기본', '시각 항법의 기본 원리와 실무 적용', 3, '항법', 'beginner', 1),
('기상 패턴 분석', '기상 조건 분석과 비행 계획 수립', 4, '기상', 'intermediate', 1),
('항공기 시스템 개요', '항공기 주요 시스템의 구조와 기능', 5, '시스템', 'beginner', 1),
('항공 규정 기본', 'FAR 규정의 기본 개념과 적용', 6, '규정', 'beginner', 1),
('비행 계획 수립', '체계적인 비행 계획 수립 방법', 7, '계획', 'intermediate', 1),

-- Week 2: Intermediate Aviation Knowledge (Days 8-14)
('고급 항공역학', '복잡한 항공역학 개념과 실무 적용', 8, '항공역학', 'advanced', 1),
('IFR 항법 시스템', '계기 항법의 원리와 실무 적용', 9, '항법', 'intermediate', 1),
('기상 시스템 이해', '복잡한 기상 시스템의 분석과 대응', 10, '기상', 'advanced', 1),
('항공기 성능 분석', '항공기 성능 데이터의 해석과 활용', 11, '시스템', 'intermediate', 1),
('고급 항공 규정', '복잡한 항공 규정의 이해와 적용', 12, '규정', 'advanced', 1),
('비상 계획 수립', '비상 상황 대응 계획 수립', 13, '계획', 'advanced', 1),
('안전 관리 시스템', '항공 안전 관리의 체계적 접근', 14, '안전 및 응급상황', 'expert', 1),

-- Week 3: Advanced Aviation Knowledge (Days 15-21)
('인적 요소 분석', '비행 중 인적 요소의 영향과 관리', 15, '인적요소', 'expert', 1),
('항공 의학 기본', '비행 관련 의학 지식과 건강 관리', 16, '의학', 'intermediate', 1),
('항공 통신 프로토콜', '항공 통신의 표준과 실무 적용', 17, '통신', 'intermediate', 1),
('복합 상황 대응', '복잡한 비행 상황의 분석과 대응', 18, '안전 및 응급상황', 'expert', 1),
('고속비행 역학', '고속 비행에서의 항공역학 특성', 19, '항공역학', 'expert', 1),
('RNAV 시스템', 'Area Navigation 시스템의 원리와 활용', 20, '항법', 'advanced', 1),
('제트류 분석', '제트류의 특성과 비행에 미치는 영향', 21, '기상', 'expert', 1),

-- Week 4: Expert Aviation Knowledge (Days 22-28)
('자동비행 시스템', '자동비행 시스템의 원리와 운영', 22, '시스템', 'expert', 1),
('국제 항공 규정', '국제 항공 규정의 이해와 적용', 23, '규정', 'expert', 1),
('장거리 비행 계획', '장거리 비행의 계획과 실행', 24, '계획', 'expert', 1),
('안전 관리 고급', '고급 안전 관리 기법과 적용', 25, '안전 및 응급상황', 'expert', 1),
('팀워크와 리더십', '항공기 승무원 간 협력과 리더십', 26, '인적요소', 'expert', 1),
('스트레스 관리', '비행 중 스트레스 관리와 대응', 27, '인적요소', 'advanced', 1),
('비상 통신 프로토콜', '비상 상황에서의 통신 절차와 프로토콜', 28, '통신', 'expert', 1),

-- Final Days: Integration and Planning (Days 29-31)
('종합 복습', '한 달간 학습한 내용의 종합적 복습', 29, '종합 및 계획', 'intermediate', 1),
('실무 적용 연습', '학습한 지식을 실제 상황에 적용하는 연습', 30, '종합 및 계획', 'advanced', 1),
('다음 달 준비', '다음 달 학습 계획 수립 및 개인별 학습 목표 설정', 31, '종합 및 계획', 'beginner', 1)

ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  day_of_month = VALUES(day_of_month),
  topic_category = VALUES(topic_category),
  difficulty_level = VALUES(difficulty_level),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
