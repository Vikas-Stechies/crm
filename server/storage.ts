import { db } from "./db";
import {
  users, hotels, bookings, agencies,
  type User, type InsertUser,
  type Hotel, type InsertHotel,
  type Booking, type InsertBooking,
  type Agency, type InsertAgency,
  type OccupancyStats, type RevenueStats
} from "@shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsers(): Promise<User[]>;

  // Hotels
  getHotel(id: number): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel>;
  deleteHotel(id: number): Promise<void>;
  getHotels(): Promise<Hotel[]>;

  // Agencies
  getAgency(id: number): Promise<Agency | undefined>;
  createAgency(agency: InsertAgency): Promise<Agency>;
  updateAgency(id: number, agency: Partial<InsertAgency>): Promise<Agency>;
  deleteAgency(id: number): Promise<void>;
  getAgencies(): Promise<Agency[]>;

  // Bookings
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;
  getBookings(): Promise<Booking[]>;
  getBookingsByHotel(hotelId: number): Promise<Booking[]>;
  
  // Analytics
  getOccupancyStats(hotelId: number | undefined): Promise<OccupancyStats[]>;
  getRevenueStats(hotelId: number | undefined): Promise<{
    monthly: RevenueStats[];
    yearly: RevenueStats[];
    byAgency: RevenueStats[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Hotels
  async getHotel(id: number): Promise<Hotel | undefined> {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, id));
    return hotel;
  }

  async createHotel(insertHotel: InsertHotel): Promise<Hotel> {
    const [hotel] = await db.insert(hotels).values(insertHotel).returning();
    return hotel;
  }

  async updateHotel(id: number, updates: Partial<InsertHotel>): Promise<Hotel> {
    const [hotel] = await db.update(hotels).set(updates).where(eq(hotels.id, id)).returning();
    return hotel;
  }

  async deleteHotel(id: number): Promise<void> {
    await db.delete(hotels).where(eq(hotels.id, id));
  }

  async getHotels(): Promise<Hotel[]> {
    return await db.select().from(hotels);
  }

  // Agencies
  async getAgency(id: number): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
    return agency;
  }

  async createAgency(insertAgency: InsertAgency): Promise<Agency> {
    const [agency] = await db.insert(agencies).values(insertAgency).returning();
    return agency;
  }

  async updateAgency(id: number, updates: Partial<InsertAgency>): Promise<Agency> {
    const [agency] = await db.update(agencies).set(updates).where(eq(agencies.id, id)).returning();
    return agency;
  }

  async deleteAgency(id: number): Promise<void> {
    await db.delete(agencies).where(eq(agencies.id, id));
  }

  async getAgencies(): Promise<Agency[]> {
    return await db.select().from(agencies);
  }

  // Bookings
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values([insertBooking as any]).returning();
    return booking;
  }

  async updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.checkIn));
  }

  async getBookingsByHotel(hotelId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.hotelId, hotelId)).orderBy(desc(bookings.checkIn));
  }

  // Analytics
  async getOccupancyStats(hotelId: number | undefined): Promise<OccupancyStats[]> {
    if (!hotelId) return [];

    // Get hotel total rooms
    const hotel = await this.getHotel(hotelId);
    if (!hotel) return [];

    const bookings = await this.getBookingsByHotel(hotelId);
    
    // Group by check-in date for daily occupancy
    const statsMap = new Map<string, number>();
    bookings.forEach(b => {
      // Ensure b.checkIn is a Date object
      const checkInDate = new Date(b.checkIn);
      const dateStr = checkInDate.toISOString().split('T')[0];
      statsMap.set(dateStr, (statsMap.get(dateStr) || 0) + (b.numberOfRooms || 1));
    });

    return Array.from(statsMap.entries()).map(([date, occupied]) => ({
      date,
      occupied,
      percentage: Math.min(100, Math.round((occupied / hotel.totalRooms) * 100))
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRevenueStats(hotelId: number | undefined): Promise<{
    monthly: RevenueStats[];
    yearly: RevenueStats[];
    byAgency: RevenueStats[];
  }> {
    if (!hotelId) return { monthly: [], yearly: [], byAgency: [] };

    const bookings = await this.getBookingsByHotel(hotelId);
    const agencies = await this.getAgencies();
    const agencyMap = new Map(agencies.map(a => [a.id, a.name]));

    const monthlyMap = new Map<string, number>();
    const yearlyMap = new Map<string, number>();
    const agencyRevMap = new Map<string, number>();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    bookings.forEach(b => {
      const checkInDate = new Date(b.checkIn);
      const month = months[checkInDate.getMonth()];
      const year = checkInDate.getFullYear().toString();
      const agencyName = b.agencyId ? (agencyMap.get(b.agencyId) || "Unknown") : "Direct";

      // Use totalCost for revenue as it represents the booking value
      const amount = b.totalCost || 0;

      monthlyMap.set(month, (monthlyMap.get(month) || 0) + amount);
      yearlyMap.set(year, (yearlyMap.get(year) || 0) + amount);
      agencyRevMap.set(agencyName, (agencyRevMap.get(agencyName) || 0) + amount);
    });

    return {
      monthly: months
        .filter(m => monthlyMap.has(m))
        .map(name => ({ name, revenue: (monthlyMap.get(name) || 0) / 100 })),
      yearly: Array.from(yearlyMap.entries())
        .map(([name, revenue]) => ({ name, revenue: revenue / 100 }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      byAgency: Array.from(agencyRevMap.entries())
        .map(([name, revenue]) => ({ name, revenue: revenue / 100 }))
    };
  }
}

export const storage = new DatabaseStorage();
