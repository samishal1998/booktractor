import { accounts, sessions, users, verifications } from "./schemas";

export type Session = typeof sessions.$inferSelect;
export type User = typeof users.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;
export type UserInsert = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type AccountInsert = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type VerificationInsert = typeof verifications.$inferInsert;