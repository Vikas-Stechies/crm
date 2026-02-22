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
import nodemailer from "nodemailer";

const scryptAsync = promisify(scrypt);
const SessionStore = MemoryStore(session);
// Setup Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ADD THIS VERIFICATION BLOCK
transporter.verify(function (error, success) {
  if (error) {
    console.error("🔴 SMTP Connection Error:", error);
  } else {
    console.log("🟢 SMTP Server is ready to send emails");
  }
});
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
async function sendComparisonEmail(ownerEmail: string, oldData: any, newData: any) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("SMTP credentials missing in .env. Skipping email send to:", ownerEmail);
    return;
  }

  // Format Helpers
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: any) => new Date(date).toLocaleDateString();

  // Create an HTML table comparing the old and new data
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a8a;">Booking Update Notification</h2>
      <p>The booking for <strong>${newData.guestName}</strong> has been updated.</p>
      
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th>Field</th>
            <th>Previous Value</th>
            <th>Updated Value</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(newData).map(key => {
    // Ignore internal database fields
    if (['id', 'hotelId', 'createdAt', 'agencyId'].includes(key)) return '';

    let oldVal = oldData[key];
    let newVal = newData[key];

    // Format specific fields nicely
    if (['roomRent', 'addOns', 'receipt', 'totalCost', 'balance'].includes(key)) {
      oldVal = formatCurrency(oldVal || 0);
      newVal = formatCurrency(newVal || 0);
    } else if (['checkIn', 'checkOut'].includes(key)) {
      oldVal = formatDate(oldVal);
      newVal = formatDate(newVal);
    }

    const isChanged = String(oldVal) !== String(newVal);
    // Highlight changed rows in yellow
    const rowStyle = isChanged ? 'background-color: #fef08a;' : '';

    return `
              <tr style="${rowStyle}">
                <td style="text-transform: capitalize;"><strong>${key.replace(/([A-Z])/g, ' $1').trim()}</strong></td>
                <td>${oldVal ?? 'N/A'}</td>
                <td>${newVal ?? 'N/A'}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
      <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
        <em>Rows highlighted in yellow indicate modified values.</em>
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Hotel CRM" <noreply@hotelcrm.com>',
      to: ownerEmail,
      subject: `Booking Updated: ${newData.guestName}`,
      html: htmlContent,
    });
    console.log(`Update email successfully sent to ${ownerEmail}`);
  } catch (error) {
    console.error("Error sending update email:", error);
  }
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
      proxy: true, // Required for Render/Cloudflare to trust the headers
      cookie: {
        secure: true, // Must be true for SameSite: none
        sameSite: 'none', // Required for cross-origin (Capacitor to Render)
        maxAge: 24 * 60 * 60 * 1000
      },
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

        // NEW LOGIC: Check subscription dates for non-admin users
        if (user.role !== 'admin' && user.hotelId) {
          const hotel = await storage.getHotel(user.hotelId);
          if (hotel && hotel.endDate) {
            const today = new Date();
            const endDate = new Date(hotel.endDate);

            // Normalize dates to midnight to ensure correct comparison
            today.setHours(0, 0, 0, 0);
            const compareEndDate = new Date(endDate);
            compareEndDate.setHours(0, 0, 0, 0);

            // 1. Block login if subscription is expired
            if (today > compareEndDate) {
              return done(null, false, { message: "Your subscription has expired please renew" });
            }

            // 2. Add a warning if 10 days or fewer remain
            const diffTime = compareEndDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 10 && diffDays >= 0) {
              // Append property so client can show warning toast after successful login
              (user as any).subscriptionWarning = "Your subscription is about to expire please renew";
            }
          }
        }

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
  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        // Return 401 with the custom message to display expired popup
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
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
    try {
      const payload = { ...req.body };

      // Convert JSON strings back to Javascript Date objects for Drizzle
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      else payload.startDate = null;

      if (payload.endDate) payload.endDate = new Date(payload.endDate);
      else payload.endDate = null;

      const hotel = await storage.createHotel(payload);
      res.status(201).json(hotel);
    } catch (err) {
      console.error("Failed to create hotel:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.hotels.update.path, requireAdmin, async (req, res) => {
    try {
      const payload = { ...req.body };

      // Remove id and createdAt to prevent accidental updates
      delete payload.id;
      delete payload.createdAt;

      // Convert JSON strings back to Javascript Date objects for Drizzle
      if (payload.startDate !== undefined) {
        payload.startDate = payload.startDate ? new Date(payload.startDate) : null;
      }
      if (payload.endDate !== undefined) {
        payload.endDate = payload.endDate ? new Date(payload.endDate) : null;
      }

      const hotel = await storage.updateHotel(Number(req.params.id), payload);
      res.json(hotel);
    } catch (err) {
      console.error("Failed to update hotel:", err);
      res.status(500).json({ message: "Internal server error" });
    }
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

  app.patch(api.agencies.update.path, requireAuth, async (req, res) => {
    const agency = await storage.updateAgency(Number(req.params.id), req.body);
    res.json(agency);
  });

  app.delete(api.agencies.delete.path, requireAuth, async (req, res) => {
    await storage.deleteAgency(Number(req.params.id));
    res.sendStatus(200);
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
    try {
      // Auto-calculate fields to ensure consistency
      const body = api.bookings.create.input.parse(req.body);
      const { roomRent, addOns = 0, receipt = 0, checkIn, checkOut, ...rest } = body;

      const totalCost = roomRent + addOns;
      const balance = totalCost - receipt;

      const user = req.user as any;
      const hotelId = user.role === 'admin' ? body.hotelId : user.hotelId;

      if (!hotelId) {
        return res.status(400).json({ message: "Hotel ID is required" });
      }

      const booking = await storage.createBooking({
        ...rest,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        roomRent,
        addOns,
        receipt,
        totalCost,
        balance,
        hotelId: hotelId,
        numberOfRooms: body.numberOfRooms ?? 1,
        comments: body.comments ?? ""
      } as any);
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Booking creation error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.bookings.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldBooking = await storage.getBooking(id);
      if (!oldBooking) return res.sendStatus(404);

      const body = api.bookings.update.input.parse(req.body);

      // Merge old data with updates to calculate new totals
      const roomRent = body.roomRent ?? oldBooking.roomRent;
      const addOns = body.addOns ?? oldBooking.addOns;
      const receipt = body.receipt ?? oldBooking.receipt;

      const totalCost = roomRent + addOns;
      const balance = totalCost - receipt;

      const updates: any = {
        ...body,
        totalCost,
        balance
      };

      if (body.checkIn) updates.checkIn = new Date(body.checkIn);
      if (body.checkOut) updates.checkOut = new Date(body.checkOut);

      const updatedBooking = await storage.updateBooking(id, updates);

      if (oldBooking.totalCost !== updatedBooking.totalCost || oldBooking.receipt !== updatedBooking.receipt) {
        const allUsers = await storage.getUsers();
        const owners = allUsers.filter(u => u.hotelId === oldBooking.hotelId && u.role === 'owner');
        owners.forEach(owner => {
          sendComparisonEmail("umesh.sharma.dk@gmail.com", oldBooking, updatedBooking).catch(err => {
            console.error(`Failed to send email to owner ${owner.email}:`, err);
          });
        });

        if (owners.length === 0) {
          console.error(`No owner found for hotelId ${oldBooking.hotelId} to send update email.`);
        }
      }

      res.json(updatedBooking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Booking update error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
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
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const stats = await storage.getOccupancyStats(user.hotelId, month, year);
    res.json(stats);
  });

  app.get(api.analytics.revenue.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const stats = await storage.getRevenueStats(user.hotelId);
    res.json(stats);
  });
  app.get(api.analytics.forecast.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const stats = await storage.getForecastStats(user.hotelId);
    res.json(stats);
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
