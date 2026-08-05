// 도메인 모델 배럴. UI는 `@/lib/types` 하나만 import 한다.
export type { ViewerRole } from "./auth";
export type { Gender, Role, User, UserStatus } from "./user";
export { GENDERS, GENDER_LABEL } from "./user";
export type { Category } from "./category";
export type { Page, PageContent, PagePreview, PageStatus } from "./page";
export type {
  Comment,
  CommentPreview,
  CommentReportReason,
  CommentReportStatus,
  CommentStatus,
  ReportPreview,
} from "./comment";
