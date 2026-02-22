import { db } from "./db";
import {
  users, hotels, bookings, agencies,
  type User, type InsertUser,
  type Hotel, type InsertHotel,
  type Booking, type InsertBooking,
  type Agency, type InsertAgency,
  type OccupancyStats, type RevenueStats,
  type ForecastStats
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
  getForecastStats(hotelId: number | undefined): Promise<ForecastStats[]>;
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
  async getOccupancyStats(hotelId: number | undefined, month?: number, year?: number): Promise<OccupancyStats[]> {
    if (!hotelId) return [];
    const hotel = await this.getHotel(hotelId);
    if (!hotel) return [];

    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth(); // 0-indexed (0=Jan, 1=Feb...)

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0); // Last day of month
    const daysInMonth = endDate.getDate();

    const bookings = await this.getBookingsByHotel(hotelId);
    const stats: OccupancyStats[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      currentDate.setHours(0, 0, 0, 0);

      let occupied = 0;
      bookings.forEach(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);

        // Overlap logic: Booking occupies room if it starts before/on currentDate 
        // and ends after currentDate
        if (checkIn <= currentDate && checkOut > currentDate && b.status !== 'cancelled') {
          occupied += (b.numberOfRooms || 1);
        }
      });

      stats.push({
        date: currentDate.toISOString(),
        occupied,
        totalRooms: hotel.totalRooms,
        percentage: Math.min(100, Math.round((occupied / hotel.totalRooms) * 100))
      });
    }
    return stats;
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

    // Create a map to store detailed stats for agencies
    const agencyStatsMap = new Map<string, {
      name: string;
      agencyId: number | null;
      revenue: number;
      receipt: number;
      balance: number;
      overPay: number;
    }>();

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    bookings.forEach(b => {
      // 1. Existing Monthly/Yearly Logic
      const checkInDate = new Date(b.checkIn);
      const month = months[checkInDate.getMonth()];
      const year = checkInDate.getFullYear().toString();
      const amount = b.totalCost || 0;

      monthlyMap.set(month, (monthlyMap.get(month) || 0) + amount);
      yearlyMap.set(year, (yearlyMap.get(year) || 0) + amount);

      // 2. New Agency Logic
      const agencyId = b.agencyId || null;
      // Key can be the ID string or "direct" for null
      const key = agencyId ? agencyId.toString() : "direct";

      if (!agencyStatsMap.has(key)) {
        const name = agencyId ? (agencyMap.get(agencyId) || "Unknown") : "Direct";
        agencyStatsMap.set(key, {
          name,
          agencyId,
          revenue: 0,
          receipt: 0,
          balance: 0,
          overPay: 0
        });
      }

      // const stats = agencyStatsMap.get(key)!;
      // stats.revenue += (b.totalCost || 0);
      // stats.receipt += (b.receipt || 0);
      // stats.balance += (b.balance || 0);
      const stats = agencyStatsMap.get(key)!;
      stats.revenue += (b.totalCost || 0);
      stats.receipt += (b.receipt || 0);

      // Calculate Balance vs Over Pay
      const bookingBalance = (b.totalCost || 0) - (b.receipt || 0);
      if (bookingBalance > 0) {
        stats.balance += bookingBalance; // Positive means they owe money
      } else if (bookingBalance < 0) {
        stats.overPay += Math.abs(bookingBalance); // Negative means they overpaid
      }
    });

    return {
      monthly: months
        .filter(m => monthlyMap.has(m))
        .map(name => ({ name, revenue: (monthlyMap.get(name) || 0) / 100 })),
      yearly: Array.from(yearlyMap.entries())
        .map(([name, revenue]) => ({ name, revenue: revenue / 100 }))
        .sort((a, b) => a.name.localeCompare(b.name)),

      // Return the detailed agency stats
      byAgency: Array.from(agencyStatsMap.values()).map(s => ({
        name: s.name,
        agencyId: s.agencyId,
        revenue: s.revenue / 100,
        receipt: s.receipt / 100,
        balance: s.balance / 100,
        overPay: s.overPay / 100
      })).sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
    };
  }

  async getForecastStats(hotelId: number | undefined): Promise<ForecastStats[]> {
    if (!hotelId) return [];

    const hotel = await this.getHotel(hotelId);
    if (!hotel) return [];

    // Get all active bookings for this hotel
    const bookings = await this.getBookingsByHotel(hotelId);

    const stats: ForecastStats[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Loop for 5 days (Today + 7 days)
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);

      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      let occupied = 0;
      let checkIns = 0;
      let checkOuts = 0;

      bookings.forEach(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);

        // Normalize times to midnight for accurate comparison
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);

        // Occupied: Keep counting ROOMS here (Occupancy % depends on rooms)
        if (checkIn <= currentDate && checkOut > currentDate && b.status !== 'cancelled') {
          occupied += (b.numberOfRooms || 1);
        }

        // Check-ins: Change to count BOOKINGS (increment by 1)
        if (checkIn.getTime() === currentDate.getTime() && b.status !== 'cancelled') {
          checkIns += 1; // <--- CHANGED FROM (b.numberOfRooms || 1)
        }

        // Check-outs: Change to count BOOKINGS (increment by 1)
        if (checkOut.getTime() === currentDate.getTime() && b.status !== 'cancelled') {
          checkOuts += 1; // <--- CHANGED FROM (b.numberOfRooms || 1)
        }
      });

      const vacant = Math.max(0, hotel.totalRooms - occupied);
      const percentage = Math.min(100, Math.round((occupied / hotel.totalRooms) * 100));

      stats.push({
        date: currentDate.toISOString(),
        occupied,
        vacant,
        checkIns,
        checkOuts,
        percentage
      });
    }

    return stats;
  }

}

export const storage = new DatabaseStorage();
