# Voyagerss 코드 리뷰 가이드

이 문서는 Gemini Code Assist가 PR을 리뷰할 때 참고하는 프로젝트 컨벤션입니다.

## 프로젝트 구성

- **백엔드**: NestJS + TypeScript, Prisma ORM (다중 데이터베이스 스키마: 메인/workschd/investand/aviation/aipr)
- **프론트엔드**: Vue 3 + Quasar + Vite + Pinia, TypeScript

## 리뷰 시 중점 사항

1. **타입 안전성**: `any` 남용을 지양하고 명시적 타입/인터페이스 사용 여부 확인
2. **에러 처리**: 외부 API 호출, DB 접근, 비동기 작업에 대한 예외 처리 누락 여부
3. **보안**: 사용자 입력 검증, SQL/NoSQL 인젝션, 인증·인가 로직, 민감 정보(.env, 토큰, 키) 노출 여부
4. **Prisma 사용**: 트랜잭션이 필요한 다중 쿼리, N+1 쿼리 패턴 여부
5. **NestJS 컨벤션**: 모듈/서비스/컨트롤러 책임 분리, DTO 및 ValidationPipe 사용
6. **Vue 3 컨벤션**: Composition API 사용 패턴, Pinia 스토어의 상태 변경 방식, 컴포넌트 props/emit 타입 정의
7. **성능**: 불필요한 리렌더링, 큰 리스트의 가상화, 중복 API 호출

## 코멘트 작성 가이드

- 가능하면 한국어로 작성
- 핵심 문제와 구체적인 개선 방향을 간결하게 제시
- 사소한 스타일 이슈보다 버그·보안·성능에 우선순위를 둘 것
