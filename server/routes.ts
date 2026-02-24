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
import { askAI } from "./ai";

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
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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

      if (JSON.stringify(oldBooking) !== JSON.stringify(updatedBooking)) {
        const allUsers = await storage.getUsers();
        const owners = allUsers.filter(u => u.hotelId === oldBooking.hotelId && u.role === 'owner');
        owners.forEach(owner => {
          sendComparisonEmail(owner.email, oldBooking, updatedBooking).catch(err => {
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


  // --- AI Features Routes ---
  app.get(api.ai.forecast.path, requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.hotelId && user.role !== 'admin') return res.status(400).json({ message: "No hotel assigned" });

      const stats = await storage.getOccupancyStats(user.hotelId || 1);
      const dataSummary = stats.slice(0, 14).map(s =>
        `Date: ${s.date}, Occupied: ${s.occupied}/${s.totalRooms}`
      ).join("\n");

      const prompt = `You are an expert hotel revenue manager. Analyze this 14-day occupancy data:
${dataSummary}
Provide a JSON response with exactly these keys: "analysis" (short text), "forecast" (short text predicting next 7 days), "pricingRecommendation" (actionable advice). Return ONLY valid JSON.`;

      const responseText = await askAI(prompt);
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanJson));
    } catch (err: any) {
      console.error("AI Route Error:", err);
      // Send the actual error message to the browser network tab
      res.status(500).json({
        message: "AI forecast failed",
        errorDetail: err.message || err.toString()
      });
    }
  });

  app.get(api.ai.staffing.path, requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.hotelId && user.role !== 'admin') return res.status(400).json({ message: "No hotel assigned" });

      const forecast = await storage.getForecastStats(user.hotelId || 1);
      const promptData = forecast.slice(0, 7).map(f =>
        `Date: ${f.date} | Check-ins: ${f.checkIns} | Check-outs: ${f.checkOuts} | Occupied: ${f.occupied}`
      ).join("\n");

      const prompt = `You are a hotel operations manager. Based on this 7-day forecast:
${promptData}
Calculate optimal daily staffing based on: 1 Housekeeper cleans 15 checkout or 30 stay-over rooms. 2 Housekeeprs to do the bedding and room setup. 1 Front Desk Agent per 20 check-ins/check-outs.
Return a JSON array of objects with keys: "date" (YYYY-MM-DD), "housekeepersNeeded" (number), "frontDeskNeeded" (number), "notes" (string explaining peak load). Return ONLY valid JSON array.`;

      const responseText = await askAI(prompt);
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanJson));
    } catch (err: any) {
      console.error("AI Route Error:", err);
      // Send the actual error message to the browser network tab
      res.status(500).json({
        message: "AI forecast failed",
        errorDetail: err.message || err.toString()
      });
    }
  });

  app.post(api.ai.generateMessage.path, requireAuth, async (req, res) => {
    try {
      const { guestName, checkIn, checkOut, type, comments } = api.ai.generateMessage.input.parse(req.body);
      const prompt = `Write a warm, professional ${type} email for a hotel guest. 
Guest: ${guestName}, Check-in: ${new Date(checkIn).toLocaleDateString()}, Check-out: ${new Date(checkOut).toLocaleDateString()}. Notes: ${comments || "None"}.
Keep it concise, hospitable, and do not include a subject line.`;

      const message = await askAI(prompt);
      res.json({ message });
    } catch (err: any) {
      console.error("AI Route Error:", err);
      // Send the actual error message to the browser network tab
      res.status(500).json({
        message: "AI forecast failed",
        errorDetail: err.message || err.toString()
      });
    }
  });

  app.post(api.ai.reviewResponse.path, requireAuth, async (req, res) => {
    try {
      const { reviewText, rating, guestName } = api.ai.reviewResponse.input.parse(req.body);
      const prompt = `You are the manager of a highly-rated hotel. A guest named ${guestName || "Guest"} left a ${rating}-star review: "${reviewText}"
Write a professional, empathetic response. If negative, apologize and offer to make it right. If positive, thank them graciously.`;

      const response = await askAI(prompt);
      res.json({ response });
    } catch (err: any) {
      console.error("AI Route Error:", err);
      // Send the actual error message to the browser network tab
      res.status(500).json({
        message: "AI forecast failed",
        errorDetail: err.message || err.toString()
      });
    }
  });

  app.post(api.ai.chat.path, requireAuth, async (req, res) => {
    try {
      const { message } = api.ai.chat.input.parse(req.body);
      const user = req.user as any;
      const hotelId = user.hotelId || 1;

      // 1. Fetch the "Entire Database" for this hotel
      const bookings = await storage.getBookingsByHotel(hotelId);
      const agencies = await storage.getAgencies();

      // 2. Compress the booking data to save tokens and ensure fields match schema
      const compactBookings = bookings.map(b => ({
        id: b.id,
        guestName: b.guestName,
        checkIn: new Date(b.checkIn).toLocaleDateString('en-CA'),
        checkOut: new Date(b.checkOut).toLocaleDateString('en-CA'),
        numberOfRooms: b.numberOfRooms,
        roomRent: b.roomRent,
        addOns: b.addOns,
        receipt: b.receipt,
        balance: (b.balance || 0) / 100,
        status: b.status,
        agencyId: b.agencyId
      }));

      const compactAgencies = agencies.map(a => ({
        id: a.id,
        name: a.name,
        contactEmail: a.contactEmail,
        contactPhone: a.contactPhone
      }));

      // 3. Build the super-prompt instructing JSON structure for actions
      const prompt = `You are an intelligent Data Analyst and CRM Assistant for a hotel.

CURRENT SYSTEM CONTEXT:
- Today's Date is: ${new Date().toLocaleDateString('en-CA')}
- Hotel ID: ${hotelId}

DATABASE DUMP (JSON FORMAT):
Agencies: ${JSON.stringify(compactAgencies)}
Bookings: ${JSON.stringify(compactBookings)}

USER QUERY: "${message}"

INSTRUCTIONS:
1. You can answer questions based on the database dump, and you CAN perform actions like creating or updating bookings and agencies. 
2. You CANNOT delete anything.
3. If the user asks for a "Daily Briefing","Daily Status", "Morning Briefing", or summary for today:
   - Identify how many check-ins match Today's Date.
   - Identify how many check-outs match Today's Date.
   - Calculate total rooms currently occupied today (checkIn <= Today and checkOut > Today).
   - Sum up the "balance" of all guests currently checked-in or checking-out today to report pending payments.
   - Format this as a friendly, professional morning report in the "message" field, and set "action" to "none".
4. If the user asks to check-in, check-out, or cancel a guest's reservation:
   - Find that guest's booking "id" from the DATABASE DUMP, If there are multiple matches, ask the user for more details.
   - Set "action" to "update_booking".
   - In the "payload", strictly include the "id" and set "status" to one of: "checked_in", "checked_out", or "cancelled".
5. If the user asks to add or update an entity, extract the necessary data.
   - Booking fields allowed: guestName (string), checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), roomRent (integer in cents, e.g., if user says 12000, output 1200000), numberOfRooms (integer), comments (string), receipt (integer in cents), addOns (integer in cents), agencyId (integer matching the Agencies database), status (string: "confirmed", "checked_in", "checked_out", "cancelled").
   - Agency fields allowed: name (string), contactEmail (string), contactPhone (string).
   - Updates MUST include the 'id' of the entity to update.
6. You must reply ONLY with a valid JSON object matching exactly this structure:
{
  "action": "none" | "create_booking" | "update_booking" | "create_agency" | "update_agency",
  "payload": { ... extracted fields for the action ... },
  "message": "Your conversational response to the user"
}
7. If no action is needed, set action to "none" and payload to {}.
8. Do NOT include markdown formatting like \`\`\`json. Return pure, valid JSON.
9. The "message" should be natural and helpful. You MUST respond ONLY in either English or Hindi. If the user query is in Hindi or Hinglish, respond in Hindi. For all other queries, respond in English. Never use any other languages.`;

      const responseText = await askAI(prompt);

      // Clean potential markdown output
      const cleanJson = responseText.replace(/```json|```/g, '').trim();

      let aiResponse;
      try {
        aiResponse = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error("Failed to parse AI JSON response:", cleanJson);
        // Fallback if the AI forgets to return JSON format
        return res.json({ response: responseText });
      }

      // 4. Handle Requested Actions (Add / Update)
      try {
        if (aiResponse.action === "create_booking") {
          const p = aiResponse.payload;
          const roomRent = p.roomRent || 0;
          const addOns = p.addOns || 0;
          const receipt = p.receipt || 0;

          await storage.createBooking({
            hotelId,
            guestName: p.guestName || "Unknown Guest",
            checkIn: new Date(p.checkIn),
            checkOut: new Date(p.checkOut),
            roomRent,
            addOns,
            receipt,
            totalCost: roomRent + addOns,
            balance: (roomRent + addOns) - receipt,
            status: p.status || "confirmed",
            numberOfRooms: p.numberOfRooms || 1,
            agencyId: p.agencyId || null,
            comments: p.comments || "Created via AI Assistant"
          } as any);

        } else if (aiResponse.action === "update_booking" && aiResponse.payload.id) {
          const p = aiResponse.payload;
          const id = p.id;
          delete p.id; // Don't try to update the ID

          if (p.checkIn) p.checkIn = new Date(p.checkIn);
          if (p.checkOut) p.checkOut = new Date(p.checkOut);

          const oldBooking = await storage.getBooking(id);
          if (oldBooking) {
            const roomRent = p.roomRent ?? oldBooking.roomRent;
            const addOns = p.addOns ?? oldBooking.addOns;
            const receipt = p.receipt ?? oldBooking.receipt;

            p.totalCost = roomRent + addOns;
            p.balance = p.totalCost - receipt;
            await storage.updateBooking(id, p);
          }

        } else if (aiResponse.action === "create_agency" && aiResponse.payload.name) {
          await storage.createAgency({
            name: aiResponse.payload.name,
            contactEmail: aiResponse.payload.contactEmail || null,
            contactPhone: aiResponse.payload.contactPhone || null
          });

        } else if (aiResponse.action === "update_agency" && aiResponse.payload.id) {
          const p = aiResponse.payload;
          const id = p.id;
          delete p.id;
          await storage.updateAgency(id, p);
        }
      } catch (dbError) {
        console.error("Failed to execute AI action against DB:", dbError);
        return res.json({ response: "I encountered an error while trying to save that information to the database." });
      }

      // 5. Return conversational message
      res.json({ response: aiResponse.message || "Action processed successfully." });
    } catch (err: any) {
      console.error("Chatbot Error:", err);
      res.status(500).json({
        message: "Chat failed to process data",
        errorDetail: err.message || err.toString(),
        stack: err.stack
      });
    }
  });

  app.get(api.ai.agencyScoring.path, requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const hotelId = user.hotelId || 1;

      // Aggregate data for the AI to analyze
      const agencies = await storage.getAgencies();
      const bookings = await storage.getBookingsByHotel(hotelId);

      const agencyStats = agencies.map(agency => {
        const agencyBookings = bookings.filter(b => b.agencyId === agency.id);
        const totalRevenue = agencyBookings.reduce((sum, b) => sum + (b.totalCost || 0), 0);
        return `Agency: ${agency.name} | Total Bookings: ${agencyBookings.length} | Total Revenue Generated: $${totalRevenue / 100}`;
      }).join("\n");

      const prompt = `You are an expert hotel performance analyst. Evaluate these travel agencies based on their booking volume and revenue generation:
${agencyStats || "No agencies found."}

Provide a JSON array of objects with exactly these keys: 
"agencyName" (string), 
"score" (number from 1 to 100 representing their value/performance), 
"insights" (a short sentence explaining the score and actionable advice).
Return ONLY a valid JSON array.`;

      const responseText = await askAI(prompt);
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      res.json(JSON.parse(cleanJson));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Agency scoring failed" });
    }
  });
  // --- End AI Features Routes ---

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
