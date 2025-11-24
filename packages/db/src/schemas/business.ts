import { pgTable, uuid, text, integer, timestamp, jsonb, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
// import { vector } from "drizzle-orm/pg-vector"; // TODO: Enable after installing pgvector extension
import { users } from "./auth"; // BetterAuth users table

// Shared timestamp helpers
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => new Date());
  
// Types for JSONB fields
/**
 * base: Record of weekday keys (`mon`, `tue`, ... `sun`) containing available time ranges.
 * overrides: Record keyed by ISO date (`YYYY-MM-DD`) with date-specific availability ranges.
 * Start/end values are stored as Date objects in Postgres JSON but transmitted as ISO strings,
 * so we allow both shapes in TypeScript.
 */
export type AvailabilityRange = {
  start: Date | string;
  end: Date | string;
};

export type AvailabilityJson = {
  base?: Record<string, AvailabilityRange[]>;
  overrides?: Record<string, AvailabilityRange[]>;
};

export type BookingMessage = {
  sender_id: string;
  content: string;
  ts: string;
};

// Multi-tenancy: Business accounts
export const businessAccounts = pgTable(
  "business_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'renter' | 'client'
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  }
);

// Join table: Users can belong to multiple accounts with different roles
export const userAccounts = pgTable(
  "user_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Link to BetterAuth user
    accountId: uuid("account_id")
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'account_admin' | 'account_member'
    createdAt: createdAt(),
  },
  (table) => ({
    userAccountIdx: index("user_account_idx").on(table.userId, table.accountId),
  })
);

// Machine Templates (logical types)
export const machineTemplates = pgTable(
  "machine_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    totalCount: integer("total_count").notNull().default(1),
    specs: jsonb("specs").$type<Record<string, unknown>>().default({}),
    availabilityJson: jsonb("availability_json")
      .$type<AvailabilityJson>()
      .default({}),
    // embedding: vector("embedding", { dimensions: 384 }), // TODO: Enable after installing pgvector extension
    description: text("description"),
    pricePerHour: integer("price_per_hour"), // in cents
    tags: integer("tags").array().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    accountIdx: index("template_account_idx").on(table.accountId),
  })
);

// Machine Instances (physical units)
export const machineInstances = pgTable(
  "machine_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => machineTemplates.id, { onDelete: "cascade" }),
    instanceCode: text("instance_code").notNull().unique(), // e.g. "A1", "A2", "A3"
    availabilityJson: jsonb("availability_json").$type<AvailabilityJson>(), // Instance-specific overrides
    status: text("status").notNull().default("active"), // 'active' | 'maintenance' | 'retired'
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    tags: integer("tags").array().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({

    templateIdx: index("instance_template_idx").on(table.templateId),
    statusIdx: index("instance_status_idx").on(table.status),
    unique_instance_code_idx: uniqueIndex("unique_instance_code_idx").on(table.instanceCode),
  })
);

// Bookings (instance-based)
export const machineBookings = pgTable(
  "machine_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    machineInstanceId: uuid("machine_instance_id")
      .notNull()
      .references(() => machineInstances.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => machineTemplates.id), // Denormalized for queries
    clientAccountId: uuid("client_account_id")
      .notNull()
      .references(() => businessAccounts.id, { onDelete: "restrict" }),
    clientUserId: text("client_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Link to BetterAuth user
    label: text("label"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending_renter_approval"), // BookingStatus enum
    messages: jsonb("messages")
      .$type<BookingMessage[]>()
      .default([]),
    paymentId: uuid("payment_id"),
    tags: integer("tags").array().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    instanceTimeIdx: index("booking_instance_time_idx").on(
      table.machineInstanceId,
      table.startTime,
      table.endTime
    ),
    clientIdx: index("booking_client_idx").on(table.clientAccountId),
    statusIdx: index("booking_status_idx").on(table.status),
  })
);

// Payments
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => machineBookings.id, { onDelete: "restrict" }),
    provider: text("provider").notNull().default("stripe"),
    externalId: text("external_id").notNull(), // Stripe PaymentIntent ID
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"), // ISO-4217
    status: text("status").notNull(), // 'pending' | 'completed' | 'failed' | 'refunded'
    extra: jsonb("extra").$type<Record<string, unknown>>().default({}),
    tags: integer("tags").array().default([]),
    createdAt: createdAt(),
  },
  (table) => ({
    bookingIdx: index("payment_booking_idx").on(table.bookingId),
  })
);

// Refunds
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // Stripe Refund ID
  amountCents: integer("amount_cents").notNull(),
  reason: text("reason"),
  extra: jsonb("extra").$type<Record<string, unknown>>().default({}),
  createdAt: createdAt(),
});

// System-wide tags
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  color: text("color").default("#777777"),
  createdAt: createdAt(),
});

// Type exports for use in application code
export type BusinessAccount = typeof businessAccounts.$inferSelect;
export type NewBusinessAccount = typeof businessAccounts.$inferInsert;

export type UserAccount = typeof userAccounts.$inferSelect;
export type NewUserAccount = typeof userAccounts.$inferInsert;

export type MachineTemplate = typeof machineTemplates.$inferSelect;
export type NewMachineTemplate = typeof machineTemplates.$inferInsert;

export type MachineInstance = typeof machineInstances.$inferSelect;
export type NewMachineInstance = typeof machineInstances.$inferInsert;

export type MachineBooking = typeof machineBookings.$inferSelect;
export type NewMachineBooking = typeof machineBookings.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

// Enums for type safety
export const AccountType = {
  RENTER: "renter",
  CLIENT: "client",
} as const;

export const UserRole = {
  ACCOUNT_ADMIN: "account_admin",
  ACCOUNT_MEMBER: "account_member",
} as const;

export const InstanceStatus = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
} as const;

export const BookingStatus = {
  PENDING_RENTER_APPROVAL: "pending_renter_approval",
  APPROVED_BY_RENTER: "approved_by_renter",
  REJECTED_BY_RENTER: "rejected_by_renter",
  SENT_BACK_TO_CLIENT: "sent_back_to_client",
  CANCELED_BY_CLIENT: "canceled_by_client",
} as const;

export const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;