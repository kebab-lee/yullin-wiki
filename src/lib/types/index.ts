// 도메인 모델 배럴. UI는 `@/lib/types` 하나만 import 한다.
export type { ViewerRole } from "./auth";
export type { Gender, Role, User, UserStatus } from "./user";
export { GENDERS, GENDER_LABEL, ROLES, isGender, isRole } from "./user";
export type { Category } from "./category";
export type {
  CreatePageData,
  Page,
  PageContent,
  PageDetail,
  PageStatus,
  PageSummary,
} from "./page";
export type {
  Comment,
  CommentPreview,
  CommentReportReason,
  CommentReportStatus,
  CommentStatus,
  ReportPreview,
} from "./comment";
