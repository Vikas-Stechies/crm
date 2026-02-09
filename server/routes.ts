import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";

const scryptAsync = promisify(scrypt);
const SessionStore = MemoryStore(session);

// Auth Helper Functions
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Email Helper (Stub)
function sendComparisonEmail(ownerEmail: string, oldData: any, newData: any) {
  console.log("--- SENDING COMPARISON EMAIL ---");
  console.log(`To: ${ownerEmail}`);
  console.log("Subject: Booking Updated - Comparison Report");
  console.log("Old Data:", JSON.stringify(oldData, null, 2));
  console.log("New Data:", JSON.stringify(newData, null, 2));
  console.log("--------------------------------");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  app.use(
    session({
      store: new SessionStore({ checkPeriod: 86400000 }),
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: app.get("env") === "production" },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByEmail(username);
        if (!user) return done(null, false, { message: "Invalid email" });
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) return done(null, false, { message: "Invalid password" });
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Middleware for checking auth
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') return res.sendStatus(403);
    next();
  };

  // Hotel Routes
  app.get(api.hotels.list.path, requireAuth, async (req, res) => {
    const hotels = await storage.getHotels();
    res.json(hotels);
  });

  app.post(api.hotels.create.path, requireAdmin, async (req, res) => {
    const hotel = await storage.createHotel(req.body);
    res.status(201).json(hotel);
  });

  app.patch(api.hotels.update.path, requireAdmin, async (req, res) => {
    const hotel = await storage.updateHotel(Number(req.params.id), req.body);
    res.json(hotel);
  });

  app.delete(api.hotels.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteHotel(Number(req.params.id));
    res.sendStatus(200);
  });

  // User Routes
  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, requireAdmin, async (req, res) => {
    const hashedPassword = await hashPassword(req.body.password);
    const user = await storage.createUser({ ...req.body, password: hashedPassword });
    res.status(201).json(user);
  });

  app.patch(api.users.update.path, requireAdmin, async (req, res) => {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }
    const user = await storage.updateUser(Number(req.params.id), updates);
    res.json(user);
  });

  app.delete(api.users.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteUser(Number(req.params.id));
    res.sendStatus(200);
  });

  // Agency Routes
  app.get(api.agencies.list.path, requireAuth, async (req, res) => {
    const agencies = await storage.getAgencies();
    res.json(agencies);
  });

  app.post(api.agencies.create.path, requireAuth, async (req, res) => {
    const agency = await storage.createAgency(req.body);
    res.status(201).json(agency);
  });

  // Booking Routes
  app.get(api.bookings.list.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    let bookings;
    if (user.role === 'admin' || !user.hotelId) {
       bookings = await storage.getBookings();
    } else {
       bookings = await storage.getBookingsByHotel(user.hotelId);
    }
    res.json(bookings);
  });

  app.get(api.bookings.get.path, requireAuth, async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) return res.sendStatus(404);
    res.json(booking);
  });

  app.post(api.bookings.create.path, requireAuth, async (req, res) => {
    // Auto-calculate fields to ensure consistency
    const { roomRent, addOns = 0, receipt = 0, ...rest } = req.body;
    const totalCost = roomRent + addOns;
    const balance = totalCost - receipt;
    
    const booking = await storage.createBooking({
      ...rest,
      roomRent,
      addOns,
      receipt,
      totalCost,
      balance,
      hotelId: (req.user as any).hotelId // Ensure booking is attached to user's hotel
    });
    res.status(201).json(booking);
  });

  app.patch(api.bookings.update.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const oldBooking = await storage.getBooking(id);
    if (!oldBooking) return res.sendStatus(404);

    // Merge old data with updates to calculate new totals
    const updates = req.body;
    const roomRent = updates.roomRent ?? oldBooking.roomRent;
    const addOns = updates.addOns ?? oldBooking.addOns;
    const receipt = updates.receipt ?? oldBooking.receipt;
    
    const totalCost = roomRent + addOns;
    const balance = totalCost - receipt;

    const updatedBooking = await storage.updateBooking(id, {
      ...updates,
      totalCost,
      balance
    });

    // Email Trigger Logic
    const user = req.user as any;
    // Assuming the user is an owner/manager, or we find the owner of the hotel.
    // For simplicity, let's log it. In real app, we'd query the hotel owner's email.
    // Let's assume the current user is modifying it, so we notify "The Owner" (or hardcode/find owner).
    // Stub:
    if (oldBooking.totalCost !== updatedBooking.totalCost || oldBooking.receipt !== updatedBooking.receipt) {
       // Ideally fetch owner email.
       sendComparisonEmail("owner@example.com", oldBooking, updatedBooking); 
    }

    res.json(updatedBooking);
  });

  app.delete(api.bookings.delete.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    // Manager cannot delete
    if (user.role === 'manager') return res.status(403).json({ message: "Managers cannot delete bookings" });
    
    await storage.deleteBooking(Number(req.params.id));
    res.sendStatus(200);
  });

  // Analytics Routes (Stubs)
  app.get(api.analytics.occupancy.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const stats = await storage.getOccupancyStats(user.hotelId);
    res.json(stats);
  });

  app.get(api.analytics.revenue.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const stats = await storage.getRevenueStats(user.hotelId);
    // Mock response structure as per schema if storage returns empty
    res.json({
      monthly: [],
      yearly: [],
      byAgency: []
    });
  });

  // Seed Admin User if none exists
  const users = await storage.getUsers();
  if (users.length === 0) {
    const hashedPassword = await hashPassword("admin123");
    await storage.createUser({
      email: "admin@example.com",
      password: hashedPassword,
      name: "System Admin",
      role: "admin",
      hotelId: null // Admin has no specific hotel, or can access all
    });
    console.log("Seeded Admin User: admin@example.com / admin123");
  }

  return httpServer;
}
