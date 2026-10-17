export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  bio?: string | null;
}
