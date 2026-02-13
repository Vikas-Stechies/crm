import { pgTable, text, serial, integer, timestamp, boolean, date, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roles = ["admin", "owner", "manager"] as const;
export const bookingStatuses = ["confirmed", "checked_in", "checked_out", "cancelled"] as const;

// Tables
export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalRooms: integer("total_rooms").notNull(),
  // Add mode: "date" to instruct Drizzle to accept and return JS Date objects
  startDate: timestamp("start_date", { mode: "date" }),
  endDate: timestamp("end_date", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: roles }).notNull().default("manager"),
  hotelId: integer("hotel_id").references(() => hotels.id), // Nullable for admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotel_id").notNull().references(() => hotels.id),
  agencyId: integer("agency_id").references(() => agencies.id),
  guestName: text("guest_name").notNull(),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out").notNull(),
  roomRent: integer("room_rent").notNull(), // In cents
  addOns: integer("add_ons").notNull().default(0), // In cents
  totalCost: integer("total_cost").notNull(), // In cents
  receipt: integer("receipt").notNull().default(0), // In cents (Amount Paid)
  balance: integer("balance").notNull().default(0), // In cents
  numberOfRooms: integer("number_of_rooms").notNull().default(1),
  comments: text("comments"),
  status: text("status", { enum: bookingStatuses }).notNull().default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const bookingAudit = pgTable("booking_audit", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  action: text("action"),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  changedBy: text("changed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
// Schemas
export const insertHotelSchema = createInsertSchema(hotels).omit({ id: true, createdAt: true }).extend({
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAgencySchema = createInsertSchema(agencies).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
}).extend({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  // Override these to ensure they are handled as numbers (cents)
  roomRent: z.coerce.number(),
  addOns: z.coerce.number().default(0),
  receipt: z.coerce.number().default(0),
  totalCost: z.coerce.number().optional(),
  balance: z.coerce.number().optional(),
});

// Types
export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// Analytics Types
export type OccupancyStats = {
  date: string;
  occupied: number;
  percentage: number;
};

export type ForecastStats = {
  date: string;
  occupied: number;
  vacant: number;
  checkIns: number;
  checkOuts: number;
  percentage: number;
};
export type RevenueStats = {
  name: string;      // Month name or Agency Name
  revenue: number;
  receipt?: number;  // Added
  balance?: number;  // Added
  agencyId?: number | null; // Added for linking
};