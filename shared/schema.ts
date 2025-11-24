import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  decimal, 
  boolean, 
  timestamp, 
  json,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for various status types
export const userRoleEnum = pgEnum("user_role", [
  "it_admin",
  "admin", 
  "operations_manager",
  "hotel_manager",
  "front_desk_staff",
  "housekeeping_staff",
  "housekeeping_supervisor",
  "maintenance_staff", 
  "maintenance_manager",
  "accountant",
  "revenue_manager",
  "auditor"
]);

export const roomStatusEnum = pgEnum("room_status", [
  "available",
  "occupied", 
  "dirty",
  "clean",
  "inspected",
  "out_of_order",
  "maintenance"
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "confirmed",
  "checked_in",
  "checked_out", 
  "cancelled",
  "no_show",
  "pending"
]);

export const folioStatusEnum = pgEnum("folio_status", [
  "open",
  "closed",
  "transferred"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed", 
  "failed",
  "refunded"
]);

export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "pending",
  "in_progress", 
  "completed",
  "inspected",
  "cancelled"
]);

export const serviceRequestPriorityEnum = pgEnum("service_request_priority", [
  "low",
  "medium", 
  "high",
  "urgent"
]);

export const serviceRequestTypeEnum = pgEnum("service_request_type", [
  "housekeeping",
  "maintenance",
  "concierge",
  "dining",
  "transportation",
  "other"
]);

export const reportTypeEnum = pgEnum("report_type", [
  "financial",
  "operational", 
  "guest_analytics",
  "housekeeping",
  "reservations",
  "custom"
]);

export const reportFrequencyEnum = pgEnum("report_frequency", [
  "daily",
  "weekly", 
  "monthly",
  "quarterly",
  "yearly",
  "on_demand"
]);

// Core Tables

// Properties (for multi-property support)
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Users (enhanced for RBAC)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("front_desk_staff"),
  propertyId: varchar("property_id").references(() => properties.id),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Room Types
export const roomTypes = pgTable("room_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(),
  description: text("description"),
  maxOccupancy: integer("max_occupancy").notNull().default(2),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  amenities: json("amenities").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Rooms
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  roomTypeId: varchar("room_type_id").notNull().references(() => roomTypes.id),
  roomNumber: text("room_number").notNull(),
  floor: integer("floor"),
  status: roomStatusEnum("status").notNull().default("available"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  lastCleaned: timestamp("last_cleaned"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Guests
export const guests = pgTable("guests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"), 
  state: text("state"),
  country: text("country"),
  postalCode: text("postal_code"),
  dateOfBirth: timestamp("date_of_birth"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  nationality: text("nationality"),
  preferences: json("preferences").$type<Record<string, any>>().default({}),
  vipStatus: boolean("vip_status").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Rate Plans
export const ratePlans = pgTable("rate_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  minLengthOfStay: integer("min_length_of_stay").default(1),
  maxLengthOfStay: integer("max_length_of_stay"),
  cancellationPolicy: text("cancellation_policy"),
  isRefundable: boolean("is_refundable").notNull().default(true),
  advanceBookingDays: integer("advance_booking_days"),
  restrictions: json("restrictions").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Daily Rates
export const dailyRates = pgTable("daily_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  roomTypeId: varchar("room_type_id").notNull().references(() => roomTypes.id),
  ratePlanId: varchar("rate_plan_id").notNull().references(() => ratePlans.id),
  date: timestamp("date").notNull(),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  minRate: decimal("min_rate", { precision: 10, scale: 2 }),
  maxRate: decimal("max_rate", { precision: 10, scale: 2 }),
  closeToArrival: boolean("close_to_arrival").notNull().default(false),
  closeToDeparture: boolean("close_to_departure").notNull().default(false),
  stopSell: boolean("stop_sell").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Reservations
export const reservations = pgTable("reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  confirmationNumber: text("confirmation_number").notNull().unique(),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  roomTypeId: varchar("room_type_id").notNull().references(() => roomTypes.id),
  roomId: varchar("room_id").references(() => rooms.id),
  ratePlanId: varchar("rate_plan_id").notNull().references(() => ratePlans.id),
  arrivalDate: timestamp("arrival_date").notNull(),
  departureDate: timestamp("departure_date").notNull(),
  nights: integer("nights").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).default('0'),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  status: reservationStatusEnum("status").notNull().default("confirmed"),
  source: text("source").notNull().default("direct"),
  specialRequests: text("special_requests"),
  notes: text("notes"),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Folios (Guest Bills)
export const folios = pgTable("folios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").notNull().references(() => reservations.id),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  folioNumber: text("folio_number").notNull().unique(),
  status: folioStatusEnum("status").notNull().default("open"),
  totalCharges: decimal("total_charges", { precision: 10, scale: 2 }).notNull().default('0'),
  totalPayments: decimal("total_payments", { precision: 10, scale: 2 }).notNull().default('0'),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Charges
export const charges = pgTable("charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  folioId: varchar("folio_id").notNull().references(() => folios.id),
  chargeCode: text("charge_code").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  chargeDate: timestamp("charge_date").notNull().defaultNow(),
  postingDate: timestamp("posting_date").notNull().defaultNow(),
  postedBy: varchar("posted_by").references(() => users.id),
  isVoided: boolean("is_voided").notNull().default(false),
  voidReason: text("void_reason"),
  voidedBy: varchar("voided_by").references(() => users.id),
  voidedAt: timestamp("voided_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  folioId: varchar("folio_id").notNull().references(() => folios.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionId: text("transaction_id"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  postedBy: varchar("posted_by").references(() => users.id),
  notes: text("notes"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default('0'),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Service Requests (Guest Services & Maintenance)
export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  reservationId: varchar("reservation_id").references(() => reservations.id),
  roomId: varchar("room_id").references(() => rooms.id),
  type: serviceRequestTypeEnum("type").notNull(),
  priority: serviceRequestPriorityEnum("priority").notNull().default("medium"),
  status: serviceRequestStatusEnum("status").notNull().default("pending"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestedBy: varchar("requested_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  estimatedCompletion: timestamp("estimated_completion"),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Housekeeping Tasks
export const housekeepingTasks = pgTable("housekeeping_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  taskType: text("task_type").notNull().default("cleaning"),
  priority: serviceRequestPriorityEnum("priority").notNull().default("medium"),
  status: serviceRequestStatusEnum("status").notNull().default("pending"),
  estimatedDuration: integer("estimated_duration"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  inspectedBy: varchar("inspected_by").references(() => users.id),
  inspectedAt: timestamp("inspected_at"),
  inspectionNotes: text("inspection_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Daily Hotel Metrics (for operational reporting)
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  metricDate: timestamp("metric_date").notNull(),
  totalRooms: integer("total_rooms").notNull(),
  occupiedRooms: integer("occupied_rooms").notNull().default(0),
  availableRooms: integer("available_rooms").notNull().default(0),
  outOfOrderRooms: integer("out_of_order_rooms").notNull().default(0),
  occupancyRate: decimal("occupancy_rate", { precision: 5, scale: 2 }).notNull().default('0'),
  adr: decimal("adr", { precision: 10, scale: 2 }).notNull().default('0'), // Average Daily Rate
  revpar: decimal("revpar", { precision: 10, scale: 2 }).notNull().default('0'), // Revenue Per Available Room
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull().default('0'),
  roomRevenue: decimal("room_revenue", { precision: 10, scale: 2 }).notNull().default('0'),
  totalGuests: integer("total_guests").notNull().default(0),
  walkIns: integer("walk_ins").notNull().default(0),
  noShows: integer("no_shows").notNull().default(0),
  cancellations: integer("cancellations").notNull().default(0),
  avgLengthOfStay: decimal("avg_length_of_stay", { precision: 5, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Guest Satisfaction Surveys
export const guestSatisfaction = pgTable("guest_satisfaction", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  reservationId: varchar("reservation_id").notNull().references(() => reservations.id),
  guestId: varchar("guest_id").notNull().references(() => guests.id),
  overallRating: integer("overall_rating").notNull(), // 1-5 scale
  roomRating: integer("room_rating"), // 1-5 scale
  serviceRating: integer("service_rating"), // 1-5 scale
  cleanlinessRating: integer("cleanliness_rating"), // 1-5 scale
  valueRating: integer("value_rating"), // 1-5 scale
  locationRating: integer("location_rating"), // 1-5 scale
  recommendToFriend: boolean("recommend_to_friend"),
  comments: text("comments"),
  surveyDate: timestamp("survey_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Report Definitions (for saved reports)
export const reportDefinitions = pgTable("report_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(),
  description: text("description"),
  type: reportTypeEnum("type").notNull(),
  frequency: reportFrequencyEnum("frequency").notNull().default("on_demand"),
  parameters: json("parameters").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastRunDate: timestamp("last_run_date"),
  nextRunDate: timestamp("next_run_date"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Analytics Events (for user behavior tracking)
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id),
  userId: varchar("user_id").references(() => users.id),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(), // login, reservation_created, payment_processed, etc.
  eventCategory: text("event_category").notNull(), // auth, reservations, billing, housekeeping, etc.
  eventData: json("event_data").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Insert Schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true
});

export const insertRoomTypeSchema = createInsertSchema(roomTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  lastCleaned: true,
  createdAt: true,
  updatedAt: true
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRatePlanSchema = createInsertSchema(ratePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertDailyRateSchema = createInsertSchema(dailyRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  confirmationNumber: true,
  checkInTime: true,
  checkOutTime: true,
  createdAt: true,
  updatedAt: true
}).extend({
  arrivalDate: z.coerce.date(),
  departureDate: z.coerce.date(),
});

export const insertFolioSchema = createInsertSchema(folios).omit({
  id: true,
  folioNumber: true,
  createdAt: true,
  updatedAt: true
});

export const insertChargeSchema = createInsertSchema(charges).omit({
  id: true,
  chargeDate: true,
  postingDate: true,
  isVoided: true,
  voidReason: true,
  voidedBy: true,
  voidedAt: true,
  createdAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  paymentDate: true,
  refundAmount: true,
  refundReason: true,
  refundedAt: true,
  createdAt: true
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  estimatedCompletion: true,
  completedAt: true,
  completionNotes: true,
  createdAt: true,
  updatedAt: true
});

export const insertHousekeepingTaskSchema = createInsertSchema(housekeepingTasks).omit({
  id: true,
  startedAt: true,
  completedAt: true,
  inspectedBy: true,
  inspectedAt: true,
  inspectionNotes: true,
  createdAt: true,
  updatedAt: true
});

export const insertDailyMetricSchema = createInsertSchema(dailyMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertGuestSatisfactionSchema = createInsertSchema(guestSatisfaction).omit({
  id: true,
  surveyDate: true,
  createdAt: true
});

export const insertReportDefinitionSchema = createInsertSchema(reportDefinitions).omit({
  id: true,
  lastRunDate: true,
  nextRunDate: true,
  createdAt: true,
  updatedAt: true
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
  createdAt: true
});

// Type Exports
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type RoomType = typeof roomTypes.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guests.$inferSelect;

export type InsertRatePlan = z.infer<typeof insertRatePlanSchema>;
export type RatePlan = typeof ratePlans.$inferSelect;

export type InsertDailyRate = z.infer<typeof insertDailyRateSchema>;
export type DailyRate = typeof dailyRates.$inferSelect;

export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Reservation = typeof reservations.$inferSelect;

export type InsertFolio = z.infer<typeof insertFolioSchema>;
export type Folio = typeof folios.$inferSelect;

export type InsertCharge = z.infer<typeof insertChargeSchema>;
export type Charge = typeof charges.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

export type InsertHousekeepingTask = z.infer<typeof insertHousekeepingTaskSchema>;
export type HousekeepingTask = typeof housekeepingTasks.$inferSelect;

export type InsertDailyMetric = z.infer<typeof insertDailyMetricSchema>;
export type DailyMetric = typeof dailyMetrics.$inferSelect;

export type InsertGuestSatisfaction = z.infer<typeof insertGuestSatisfactionSchema>;
export type GuestSatisfaction = typeof guestSatisfaction.$inferSelect;

export type InsertReportDefinition = z.infer<typeof insertReportDefinitionSchema>;
export type ReportDefinition = typeof reportDefinitions.$inferSelect;

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;