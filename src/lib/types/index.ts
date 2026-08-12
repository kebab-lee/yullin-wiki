// 도메인 모델 배럴. UI는 `@/lib/types` 하나만 import 한다.
export type { ViewerRole } from "./auth";
export type {
  AdminUserSummary,
  Gender,
  Role,
  User,
  UserStatus,
} from "./user";
export {
  GENDERS,
  GENDER_LABEL,
  ROLES,
  USER_STATUSES,
  isGender,
  isRole,
  isUserStatus,
} from "./user";
export type { AdminCategorySummary, Category } from "./category";
export type {
  AdminPageSummary,
  CreatePageData,
  Page,
  PageContent,
  PageDetail,
  PageStatus,
  PageSummary,
  UpdatePageData,
} from "./page";
export type { CreatePageRevisionData } from "./pageRevision";
export type {
  AdminCommentSummary,
  AdminReportSummary,
  Comment,
  CommentPreview,
  CommentReportReason,
  CommentReportStatus,
  CommentStatus,
  CommentView,
  CommentWithAuthor,
  CreateCommentData,
  CreateCommentReportData,
  DashboardComment,
  MyCommentSummary,
  ReportPreview,
} from "./comment";
