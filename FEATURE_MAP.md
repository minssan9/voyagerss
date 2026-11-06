<!-- manual -->
<!-- /manual -->

# voyagerss

## 홈
- Route: `/`
- Page: `frontend/src/views/Landing.vue`

## 소개
- Route: `/about`
- Page: `frontend/src/modules/workschd/views/main/About.vue`

## 구독
- Route: `/subscription`
- Page: `frontend/src/modules/workschd/views/main/Subscription.vue`

## 개인정보 처리방침
- Route: `/privacy-policy`
- Page: `frontend/src/modules/workschd/views/main/PrivacyPolicy.vue`

## 이용약관
- Route: `/terms`
- Page: `frontend/src/modules/workschd/views/main/Terms.vue`

## 대시보드
- Route: `/dashboard`
- Page: `frontend/src/modules/workschd/views/main/Dashboard.vue`

## 피드백 관리
- Route: `/feedback-admin`
- Page: `frontend/src/views/admin/FeedbackAdminView.vue`

## 로그인
- Route: `/login`
- Page: `frontend/src/views/common/auth/Login.vue`

## 로그인 리다이렉트
- Route: `/redirect`
- Page: `frontend/src/views/common/auth/redirect.vue`

## 가입
- Route: `/signup`
- Page: `frontend/src/views/common/auth/Signup.vue`

## 계정 프로필
- Route: `/account/profile`
- Page: `frontend/src/views/common/account/AccountProfile.vue`

## 계정 일정
- Route: `/account/schedule`
- Page: `frontend/src/views/common/account/AccountSchedule.vue`

## 워크스케줄 로그인 별칭
- Route: `/workschd/login`
- Page: redirect → `/login?service=workschd`

## 워크스케줄 가입
- Route: `/workschd/signup`
- Page: `frontend/src/modules/workschd/views/WorkschdSignup.vue`

## 인증 콜백
- Route: `/auth/callback`
- Page: `frontend/src/views/common/auth/AuthCallback.vue`

## 401
- Route: `/401`
- Page: `frontend/src/views/common/error/401.vue`

## 403
- Route: `/403`
- Page: `frontend/src/views/common/error/403.vue`

## 404
- Route: `/:pathMatch(.*)*`
- Page: `frontend/src/views/common/error/404.vue`

## 항공 대시보드
- Route: `/aviation`
- Page: `frontend/src/modules/aviation/views/Dashboard.vue`

## 항공 토픽
- Route: `/aviation/topics`
- Page: `frontend/src/modules/aviation/views/TopicsManagement.vue`

## 항공 기상
- Route: `/aviation/weather`
- Page: `frontend/src/modules/aviation/views/WeatherManagement.vue`

## 항공 백업
- Route: `/aviation/backups`
- Page: `frontend/src/modules/aviation/views/BackupsManagement.vue`

## 워크스케줄 홈
- Route: `/workschd`
- Page: `frontend/src/modules/workschd/views/main/Home.vue`

## 팀 참여
- Route: `/workschd/team/join/:token`
- Page: `frontend/src/modules/workschd/views/team/TeamJoin.vue`
- Selectors: [data-testid=team-join-loading], [data-testid=team-join-error], [data-testid=team-join-pending], [data-testid=team-join-already-member], [data-testid=team-join-success], [data-testid=team-join-page]

## 팀 관리
- Route: `/workschd/admin/team`
- Page: `frontend/src/modules/workschd/views/admin/TeamManage.vue`
- Components: `frontend/src/modules/workschd/components/dialog/TeamApproveDialog.vue`, `frontend/src/modules/workschd/components/team/TeamManageScheduleConfig.vue`, `frontend/src/modules/workschd/components/team/TeamManageShop.vue`
- Selectors: [data-testid=team-manage-page], [data-testid=team-approve-dialog], [data-testid=approve-join-request], [data-testid=reject-join-request], [data-testid=no-pending-requests], [data-testid=team-schedule-config], [data-testid=team-shop-management]

## 과제 관리
- Route: `/workschd/admin/tasks`
- Page: `frontend/src/modules/workschd/views/admin/TaskManage.vue`

## 과제 관리 모바일
- Route: `/workschd/admin/tasks/mobile`
- Page: `frontend/src/modules/workschd/views/admin/TaskManageMobile.vue`
- Selectors: button "Cancel", button "Save", button "Delete"

## 내 과제
- Route: `/workschd/m/tasks`
- Page: `frontend/src/modules/workschd/views/worker/TaskListMobile.vue`

## 장례 보드
- Route: `/workschd/m/board`
- Page: `frontend/src/modules/workschd/views/worker/FuneralBoardView.vue`
- Selectors: [data-testid=funeral-board]

## 관리자 대시보드
- Route: `/workschd/admin/dashboard`
- Page: `frontend/src/modules/workschd/views/admin/AdminDashboard.vue`
- Selectors: [data-testid=admin-dashboard]

## 권한 진입
- Route: `/workschd/admin/rbac`
- Page: redirect → `RbacRoles`

## 역할
- Route: `/workschd/admin/rbac/roles`
- Page: `frontend/src/modules/workschd/views/admin/rbac/RoleManagePage.vue`
- Components: `frontend/src/modules/workschd/views/admin/rbac/RbacAdminLayout.vue`

## 권한
- Route: `/workschd/admin/rbac/permissions`
- Page: `frontend/src/modules/workschd/views/admin/rbac/PermissionManagePage.vue`
- Components: `frontend/src/modules/workschd/views/admin/rbac/RbacAdminLayout.vue`

## 역할 권한
- Route: `/workschd/admin/rbac/role-permissions`
- Page: `frontend/src/modules/workschd/views/admin/rbac/RolePermissionPage.vue`
- Components: `frontend/src/modules/workschd/views/admin/rbac/RbacAdminLayout.vue`

## 주체 역할
- Route: `/workschd/admin/rbac/subjects`
- Page: `frontend/src/modules/workschd/views/admin/rbac/SubjectRolePage.vue`
- Components: `frontend/src/modules/workschd/views/admin/rbac/RbacAdminLayout.vue`

## 모바일 과제 별칭
- Route: `/workschd/task/list-mobile`
- Page: redirect → `TaskListMobile`

## 장례 보드 별칭
- Route: `/workschd/funeral-board`
- Page: redirect → `FuneralBoard`

## 팀 관리 별칭
- Route: `/workschd/team/manage`
- Page: redirect → `TeamManage`

## 과제 관리 별칭
- Route: `/workschd/task/manage`
- Page: redirect → `TaskManage`

## 모바일 과제 관리 별칭
- Route: `/workschd/task/manage-mobile`
- Page: redirect → `TaskManageMobile`

## 워크스케줄 인증 콜백
- Route: `/workschd/auth/callback`
- Page: `frontend/src/views/common/auth/AuthCallback.vue`

## AIPR 홈
- Route: `/aipr`
- Page: `frontend/src/modules/aipr/views/AiprHome.vue`

## AIPR 로그인 별칭
- Route: `/aipr/login`
- Page: redirect → `/login?service=aipr`

## AIPR 이슈
- Route: `/aipr/issues`
- Page: `frontend/src/modules/aipr/views/AiprIssuesList.vue`

## AIPR 이슈 상세
- Route: `/aipr/issues/:id`
- Page: `frontend/src/modules/aipr/views/AiprIssueDetail.vue`

## AIPR 설정
- Route: `/aipr/settings`
- Page: `frontend/src/modules/aipr/views/AiprSettings.vue`

## AIPR 위젯
- Route: `/aipr/widget`
- Page: `frontend/src/modules/aipr/views/AiprWidget.vue`

## AIPR 제공자
- Route: `/aipr/providers`
- Page: `frontend/src/modules/aipr/views/AiprProviders.vue`

## AIPR 저장소
- Route: `/aipr/repos`
- Page: `frontend/src/modules/aipr/views/AiprRepos.vue`

## AIPR 저장소 이슈
- Route: `/aipr/repos/:repoId/issues`
- Page: `frontend/src/modules/aipr/views/AiprRepoIssues.vue`

## 비전 홈
- Route: `/vision`
- Page: `frontend/src/modules/vision/views/VisionHome.vue`

## 비전 카메라
- Route: `/vision/cam`
- Page: `frontend/src/modules/vision/views/VisionCamTest.vue`

## 비전 판정
- Route: `/vision/judge`
- Page: `frontend/src/modules/vision/views/VisionJudgeTest.vue`
