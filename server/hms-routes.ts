import type { Express } from "express";
import { Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { 
  authenticate, 
  authorize, 
  requirePropertyAccess, 
  login, 
  hashPassword,
  type AuthRequest 
} from "./auth";
import {
  insertUserSchema,
  insertPropertySchema,
  insertRoomTypeSchema,
  insertRoomSchema,
  insertGuestSchema,
  insertReservationSchema,
  insertServiceRequestSchema,
  insertHousekeepingTaskSchema,
  insertFolioSchema,
  insertChargeSchema,
  insertPaymentSchema,
  insertGuestSatisfactionSchema,
  insertReportDefinitionSchema,
  insertAnalyticsEventSchema,
  type User,
  type Property,
  type Room,
  type RoomType,
  type Guest,
  type Reservation
} from "@shared/schema";

// Date validation schema for financial reports
const DateRangeSchema = z.object({
  fromDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid fromDate format"
  }),
  toDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid toDate format"
  })
});

// Utility to normalize dates to UTC start/end of day to avoid timezone issues
function normalizeDateRange(fromDateStr: string, toDateStr: string) {
  const fromDate = new Date(fromDateStr);
  const toDate = new Date(toDateStr);
  
  // Normalize to UTC start of day for fromDate
  const normalizedFromDate = new Date(Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
    0, 0, 0, 0
  ));
  
  // Normalize to UTC end of day for toDate  
  const normalizedToDate = new Date(Date.UTC(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
    23, 59, 59, 999
  ));
  
  return { fromDate: normalizedFromDate, toDate: normalizedToDate };
}

// Authentication Routes
export function registerAuthRoutes(app: Express) {
  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const result = await login(username, password);
      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Ensure password is stripped from response
      const { password: _, ...safeUser } = result.user as any;
      
      res.json({
        message: "Login successful",
        user: safeUser,
        token: result.token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticate, async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });

  // Logout (client-side token removal)
  app.post("/api/auth/logout", authenticate, (req: Request, res: Response) => {
    res.json({ message: "Logout successful" });
  });
}

// User Management Routes
export function registerUserRoutes(app: Express) {
  // Get users by property
  app.get("/api/users", 
    authenticate, 
    authorize("users.view"), 
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.query;
        
        if (!propertyId) {
          return res.status(400).json({ error: "Property ID required" });
        }

        const users = await storage.getUsersByProperty(propertyId as string);
        // Remove passwords from response
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        
        res.json({ users: usersWithoutPasswords });
      } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create user
  app.post("/api/users", 
    authenticate, 
    authorize("users.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const userData = insertUserSchema.parse(req.body);
        
        // Hash password before storing
        const hashedPassword = await hashPassword(userData.password);
        
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword
        });
        
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create user error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update user
  app.put("/api/users/:id", 
    authenticate, 
    authorize("users.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Hash password if it's being updated
        if (updateData.password) {
          updateData.password = await hashPassword(updateData.password);
        }
        
        const user = await storage.updateUser(id, updateData);
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ user: userWithoutPassword });
      } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Property Management Routes
export function registerPropertyRoutes(app: Express) {
  // Get all properties (user-scoped for security)
  app.get("/api/properties", 
    authenticate, 
    authorize("properties.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const allProperties = await storage.getProperties();
        // Filter to only properties the user has access to
        const userProperties = allProperties.filter(property => 
          property.id === req.user?.propertyId
        );
        res.json({ properties: userProperties });
      } catch (error) {
        console.error("Get properties error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get property by ID
  app.get("/api/properties/:id", 
    authenticate, 
    authorize("properties.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const property = await storage.getProperty(id);
        
        if (!property) {
          return res.status(404).json({ error: "Property not found" });
        }
        
        res.json({ property });
      } catch (error) {
        console.error("Get property error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create property
  app.post("/api/properties", 
    authenticate, 
    authorize("properties.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyData = insertPropertySchema.parse(req.body);
        const property = await storage.createProperty(propertyData);
        
        res.status(201).json({ property });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create property error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get guests by property
  app.get("/api/properties/:id/guests", 
    authenticate, 
    authorize("guests.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const guests = await storage.getGuestsByProperty(id);
        res.json({ guests });
      } catch (error) {
        console.error("Get guests by property error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get VIP guests by property
  app.get("/api/properties/:id/guests/vip", 
    authenticate, 
    authorize("guests.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const vipGuests = await storage.getVIPGuests(id);
        res.json({ vipGuests });
      } catch (error) {
        console.error("Get VIP guests by property error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Room Management Routes
export function registerRoomRoutes(app: Express) {
  // Get rooms by property
  app.get("/api/properties/:propertyId/rooms", 
    authenticate, 
    authorize("rooms.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const rooms = await storage.getRoomsByProperty(propertyId);
        
        res.json({ rooms });
      } catch (error) {
        console.error("Get rooms error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get room types by property
  app.get("/api/properties/:propertyId/room-types", 
    authenticate, 
    authorize("rooms.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const roomTypes = await storage.getRoomTypesByProperty(propertyId);
        
        res.json({ roomTypes });
      } catch (error) {
        console.error("Get room types error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create room type
  app.post("/api/properties/:propertyId/room-types", 
    authenticate, 
    authorize("rooms.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const roomTypeData = insertRoomTypeSchema.parse({
          ...req.body,
          propertyId
        });
        
        const roomType = await storage.createRoomType(roomTypeData);
        res.status(201).json({ roomType });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create room type error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create room
  app.post("/api/properties/:propertyId/rooms", 
    authenticate, 
    authorize("rooms.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const roomData = insertRoomSchema.parse({
          ...req.body,
          propertyId
        });
        
        const room = await storage.createRoom(roomData);
        res.status(201).json({ room });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create room error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update room status
  app.patch("/api/rooms/:id/status", 
    authenticate, 
    authorize("rooms.status.update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const room = await storage.updateRoom(id, { status, notes });
        res.json({ room });
      } catch (error) {
        console.error("Update room status error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Guest Management Routes
export function registerGuestRoutes(app: Express) {
  // Search guests
  app.get("/api/guests/search", 
    authenticate, 
    authorize("guests.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { query } = req.query;
        
        if (!query) {
          return res.status(400).json({ error: "Search query required" });
        }
        
        // Get all guests first, then filter by property through reservations
        const allGuests = await storage.searchGuests(query as string);
        
        // Get property guests by checking their stay history  
        const propertyGuests = [];
        for (const guest of allGuests) {
          const stayHistory = await storage.getGuestStayHistory(guest.id);
          const hasPropertyStay = stayHistory.some(stay => 
            stay.propertyId === req.user?.propertyId
          );
          if (hasPropertyStay) {
            propertyGuests.push(guest);
          }
        }
        
        res.json({ guests: propertyGuests });
      } catch (error) {
        console.error("Search guests error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get guest by ID
  app.get("/api/guests/:id", 
    authenticate, 
    authorize("guests.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const guest = await storage.getGuest(id);
        
        if (!guest) {
          return res.status(404).json({ error: "Guest not found" });
        }
        
        res.json({ guest });
      } catch (error) {
        console.error("Get guest error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create guest
  app.post("/api/guests", 
    authenticate, 
    authorize("guests.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const guestData = insertGuestSchema.parse(req.body);
        const guest = await storage.createGuest(guestData);
        
        res.status(201).json({ guest });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create guest error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update guest
  app.put("/api/guests/:id", 
    authenticate, 
    authorize("guests.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        const guest = await storage.updateGuest(id, updateData);
        res.json({ guest });
      } catch (error) {
        console.error("Update guest error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get guest profile with CRM data
  app.get("/api/guests/:id/profile", 
    authenticate, 
    authorize("guests.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const profile = await storage.getGuestProfile(id);
        
        if (!profile) {
          return res.status(404).json({ error: "Guest not found" });
        }
        
        res.json({ profile });
      } catch (error) {
        console.error("Get guest profile error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get guest stay history
  app.get("/api/guests/:id/history", 
    authenticate, 
    authorize("guests.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const stayHistory = await storage.getGuestStayHistory(id);
        res.json({ stayHistory });
      } catch (error) {
        console.error("Get guest stay history error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update guest preferences
  app.put("/api/guests/:id/preferences", 
    authenticate, 
    authorize("guests.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { preferences } = req.body;
        
        if (!preferences || typeof preferences !== 'object') {
          return res.status(400).json({ error: "Valid preferences object required" });
        }
        
        const guest = await storage.updateGuestPreferences(id, preferences);
        res.json({ guest });
      } catch (error) {
        console.error("Update guest preferences error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Reservation Management Routes
export function registerReservationRoutes(app: Express) {
  // Get reservations by property
  app.get("/api/properties/:propertyId/reservations", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const reservations = await storage.getReservationsByProperty(propertyId);
        
        res.json({ reservations });
      } catch (error) {
        console.error("Get reservations error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get today's arrivals
  app.get("/api/properties/:propertyId/arrivals/today", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const arrivals = await storage.getArrivalsToday(propertyId);
        
        res.json({ arrivals });
      } catch (error) {
        console.error("Get arrivals error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get today's departures
  app.get("/api/properties/:propertyId/departures/today", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const departures = await storage.getDeparturesToday(propertyId);
        
        res.json({ departures });
      } catch (error) {
        console.error("Get departures error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get reservation by confirmation number
  app.get("/api/reservations/confirmation/:confirmationNumber", 
    authenticate, 
    authorize("reservations.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { confirmationNumber } = req.params;
        const reservation = await storage.getReservationByConfirmation(confirmationNumber);
        
        if (!reservation) {
          return res.status(404).json({ error: "Reservation not found" });
        }
        
        res.json({ reservation });
      } catch (error) {
        console.error("Get reservation error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Check availability
  app.post("/api/properties/:propertyId/availability/check", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const { roomTypeId, arrivalDate, departureDate } = req.body;
        
        if (!roomTypeId || !arrivalDate || !departureDate) {
          return res.status(400).json({ error: "roomTypeId, arrivalDate, and departureDate are required" });
        }
        
        const arrival = new Date(arrivalDate);
        const departure = new Date(departureDate);
        
        if (arrival >= departure) {
          return res.status(400).json({ error: "Departure date must be after arrival date" });
        }
        
        const availability = await storage.checkAvailability(propertyId, roomTypeId, arrival, departure);
        
        res.json({ availability });
      } catch (error) {
        console.error("Check availability error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get room type availability calendar
  app.get("/api/properties/:propertyId/room-types/:roomTypeId/availability", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId, roomTypeId } = req.params;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate query parameters are required" });
        }
        
        const from = new Date(fromDate as string);
        const to = new Date(toDate as string);
        
        const availability = await storage.getRoomTypeAvailability(propertyId, roomTypeId, from, to);
        
        res.json({ availability });
      } catch (error) {
        console.error("Get availability calendar error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Calculate best available rate
  app.post("/api/properties/:propertyId/rates/calculate", 
    authenticate, 
    authorize("reservations.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const { roomTypeId, arrivalDate, departureDate } = req.body;
        
        if (!roomTypeId || !arrivalDate || !departureDate) {
          return res.status(400).json({ error: "roomTypeId, arrivalDate, and departureDate are required" });
        }
        
        const arrival = new Date(arrivalDate);
        const departure = new Date(departureDate);
        const lengthOfStay = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
        
        if (lengthOfStay <= 0) {
          return res.status(400).json({ error: "Invalid date range" });
        }
        
        const bestRate = await storage.calculateBestRate(propertyId, roomTypeId, arrival, departure, lengthOfStay);
        
        if (!bestRate) {
          return res.status(404).json({ error: "No available rates found for the specified criteria" });
        }
        
        res.json({ rate: bestRate });
      } catch (error) {
        console.error("Calculate best rate error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Enhanced reservation creation with availability validation
  app.post("/api/reservations", 
    authenticate, 
    authorize("reservations.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const reservationData = insertReservationSchema.parse(req.body);
        
        // Calculate nights
        const arrivalDate = new Date(reservationData.arrivalDate);
        const departureDate = new Date(reservationData.departureDate);
        const nights = Math.ceil((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (nights <= 0) {
          return res.status(400).json({ error: "Invalid date range" });
        }
        
        // Calculate best rate if not provided
        let totalAmount = reservationData.totalAmount;
        if (!totalAmount) {
          const bestRate = await storage.calculateBestRate(
            reservationData.propertyId,
            reservationData.roomTypeId,
            arrivalDate,
            departureDate,
            nights
          );
          
          if (!bestRate) {
            return res.status(404).json({ error: "No available rates found" });
          }
          
          totalAmount = bestRate.totalAmount.toString();
        }
        
        // Validate rate plan length-of-stay restrictions
        const ratePlan = await storage.getRatePlan(reservationData.ratePlanId);
        if (ratePlan) {
          if (ratePlan.minLengthOfStay && nights < ratePlan.minLengthOfStay) {
            return res.status(400).json({ 
              error: `Minimum length of stay is ${ratePlan.minLengthOfStay} nights` 
            });
          }
          if (ratePlan.maxLengthOfStay && nights > ratePlan.maxLengthOfStay) {
            return res.status(400).json({ 
              error: `Maximum length of stay is ${ratePlan.maxLengthOfStay} nights` 
            });
          }
        }
        
        // Use transactional reservation creation to prevent race conditions
        const result = await storage.createReservationWithValidation({
          ...reservationData,
          nights,
          totalAmount,
          createdBy: req.user?.id
        }, true);
        
        if (!result.success) {
          if (result.error?.includes("No rooms available")) {
            return res.status(409).json({ 
              error: result.error,
              availability: result.availability
            });
          }
          if (result.error?.includes("booking restrictions")) {
            return res.status(409).json({ 
              error: result.error,
              restrictions: result.availability?.restrictions
            });
          }
          return res.status(500).json({ error: result.error || "Reservation creation failed" });
        }
        
        res.status(201).json({ reservation: result.reservation });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create reservation error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Check-in
  app.post("/api/reservations/:id/check-in", 
    authenticate, 
    authorize("check_in.process"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { roomId } = req.body;
        
        const reservation = await storage.updateReservation(id, {
          status: "checked_in",
          roomId,
          checkInTime: new Date()
        } as any);
        
        // Update room status to occupied
        if (roomId) {
          await storage.updateRoom(roomId, { status: "occupied" });
        }
        
        res.json({ reservation });
      } catch (error) {
        console.error("Check-in error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Check-out
  app.post("/api/reservations/:id/check-out", 
    authenticate, 
    authorize("check_out.process"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        
        const reservation = await storage.getReservation(id);
        if (!reservation) {
          return res.status(404).json({ error: "Reservation not found" });
        }
        
        // Update reservation status
        const updatedReservation = await storage.updateReservation(id, {
          status: "checked_out",
          checkOutTime: new Date()
        } as any);
        
        // Update room status to dirty
        if (reservation.roomId) {
          await storage.updateRoom(reservation.roomId, { status: "dirty" });
        }
        
        res.json({ reservation: updatedReservation });
      } catch (error) {
        console.error("Check-out error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Service Request Routes
export function registerServiceRequestRoutes(app: Express) {
  // Get service requests by property
  app.get("/api/properties/:propertyId/service-requests", 
    authenticate, 
    authorize("service_requests.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const { status } = req.query;
        
        let requests;
        if (status) {
          requests = await storage.getServiceRequestsByStatus(propertyId, status as string);
        } else {
          requests = await storage.getServiceRequestsByProperty(propertyId);
        }
        
        res.json({ requests });
      } catch (error) {
        console.error("Get service requests error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create service request
  app.post("/api/service-requests", 
    authenticate, 
    authorize("service_requests.create"),
    async (req: AuthRequest, res: Response) => {
      try {
        const requestData = insertServiceRequestSchema.parse({
          ...req.body,
          requestedBy: req.user?.id
        });
        
        const serviceRequest = await storage.createServiceRequest(requestData);
        res.status(201).json({ request: serviceRequest });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create service request error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update service request
  app.put("/api/service-requests/:id", 
    authenticate, 
    authorize("service_requests.update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        const serviceRequest = await storage.updateServiceRequest(id, updateData);
        res.json({ request: serviceRequest });
      } catch (error) {
        console.error("Update service request error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Housekeeping Routes
export function registerHousekeepingRoutes(app: Express) {
  // Get housekeeping tasks by property
  app.get("/api/properties/:propertyId/housekeeping-tasks", 
    authenticate, 
    authorize("housekeeping.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        const tasks = await storage.getHousekeepingTasksByProperty(propertyId);
        
        res.json({ tasks });
      } catch (error) {
        console.error("Get housekeeping tasks error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get tasks assigned to current user
  app.get("/api/housekeeping-tasks/my-tasks", 
    authenticate, 
    authorize("housekeeping.tasks.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }
        
        const tasks = await storage.getHousekeepingTasksByAssignee(req.user.id);
        res.json({ tasks });
      } catch (error) {
        console.error("Get my housekeeping tasks error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create housekeeping task
  app.post("/api/housekeeping-tasks", 
    authenticate, 
    authorize("housekeeping.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const taskData = insertHousekeepingTaskSchema.parse(req.body);
        const task = await storage.createHousekeepingTask(taskData);
        
        res.status(201).json({ task });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create housekeeping task error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update housekeeping task
  app.put("/api/housekeeping-tasks/:id", 
    authenticate, 
    authorize("housekeeping.tasks.update"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const clientData = req.body;
        
        // Get existing task to verify property access and current state
        const existingTask = await storage.getHousekeepingTask(id);
        if (!existingTask) {
          return res.status(404).json({ error: "Task not found" });
        }
        
        // Verify property access
        if (existingTask.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        // Build server-controlled update data
        const serverUpdateData: any = {
          // Allow client to update these fields
          assignedTo: clientData.assignedTo,
          priority: clientData.priority,
          notes: clientData.notes,
          estimatedDuration: clientData.estimatedDuration,
        };
        
        // Handle status transitions with server-side timestamp control and validation
        if (clientData.status && clientData.status !== existingTask.status) {
          // Define valid status transitions
          const validTransitions: Record<string, string[]> = {
            'pending': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'], 
            'completed': ['inspected', 'cancelled'],
            'inspected': ['cancelled'],
            'cancelled': [] // No transitions from cancelled
          };
          
          // Validate status transition
          const allowedNextStates = validTransitions[existingTask.status] || [];
          if (!allowedNextStates.includes(clientData.status)) {
            return res.status(422).json({ 
              error: `Invalid status transition from ${existingTask.status} to ${clientData.status}. Valid transitions: ${allowedNextStates.join(', ')}`
            });
          }
          
          // Set the new status after validation
          serverUpdateData.status = clientData.status;
          
          // Set appropriate timestamps based on status transitions
          switch (clientData.status) {
            case 'in_progress':
              serverUpdateData.startedAt = new Date();
              break;
            case 'completed':
              serverUpdateData.completedAt = new Date();
              break;
            case 'inspected':
              serverUpdateData.inspectedBy = req.user?.id;
              serverUpdateData.inspectedAt = new Date();
              serverUpdateData.inspectionNotes = clientData.inspectionNotes;
              break;
            case 'cancelled':
              // No additional fields needed for cancellation
              break;
          }
        }
        
        // Server-side inspection handling
        if (clientData.inspectionNotes && existingTask.status === 'completed') {
          serverUpdateData.inspectedBy = req.user?.id;
          serverUpdateData.inspectedAt = new Date();
          serverUpdateData.inspectionNotes = clientData.inspectionNotes;
          serverUpdateData.status = 'inspected';
        }
        
        const task = await storage.updateHousekeepingTask(id, serverUpdateData);
        res.json({ task });
      } catch (error) {
        console.error("Update housekeeping task error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Folio Management Routes
export function registerFolioRoutes(app: Express) {
  // Get folio by ID
  app.get("/api/folios/:id", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const folio = await storage.getFolio(id);
        
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        // Verify property access
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        res.json({ folio });
      } catch (error) {
        console.error("Get folio error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get folio by reservation
  app.get("/api/reservations/:reservationId/folio", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { reservationId } = req.params;
        const folio = await storage.getFolioByReservation(reservationId);
        
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        // Verify property access
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        res.json({ folio });
      } catch (error) {
        console.error("Get folio by reservation error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get folios by guest
  app.get("/api/guests/:guestId/folios", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { guestId } = req.params;
        const folios = await storage.getFoliosByGuest(guestId);
        
        // Filter folios to only those belonging to user's property
        const propertyFolios = folios.filter(folio => folio.propertyId === req.user?.propertyId);
        
        res.json({ folios: propertyFolios });
      } catch (error) {
        console.error("Get folios by guest error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create folio
  app.post("/api/folios", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const folioData = insertFolioSchema.parse(req.body);
        
        // Override propertyId with authenticated user's property for security
        const securefolioData = {
          ...folioData,
          propertyId: req.user?.propertyId || ""
        };
        
        if (!securefolioData.propertyId) {
          return res.status(400).json({ error: "User property not found" });
        }
        
        const folio = await storage.createFolio(securefolioData);
        
        res.status(201).json({ folio });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create folio error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update folio
  app.put("/api/folios/:id", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Verify folio exists and user has property access
        const existingFolio = await storage.getFolio(id);
        if (!existingFolio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        if (existingFolio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        // Prevent updates to closed folios
        if (existingFolio.status === 'closed') {
          return res.status(422).json({ error: "Cannot update closed folio" });
        }
        
        const folio = await storage.updateFolio(id, updateData);
        res.json({ folio });
      } catch (error) {
        console.error("Update folio error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Charge Management Routes
export function registerChargeRoutes(app: Express) {
  // Get charge by ID
  app.get("/api/charges/:id", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const charge = await storage.getCharge(id);
        
        if (!charge) {
          return res.status(404).json({ error: "Charge not found" });
        }
        
        res.json({ charge });
      } catch (error) {
        console.error("Get charge error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get charges by folio
  app.get("/api/folios/:folioId/charges", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { folioId } = req.params;
        
        // Verify folio exists and user has property access
        const folio = await storage.getFolio(folioId);
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        const charges = await storage.getChargesByFolio(folioId);
        
        res.json({ charges });
      } catch (error) {
        console.error("Get charges by folio error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create charge
  app.post("/api/charges", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const chargeData = insertChargeSchema.parse(req.body);
        
        // Verify folio exists and user has property access
        const folio = await storage.getFolio(chargeData.folioId);
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        // Prevent charges to closed folios
        if (folio.status === 'closed') {
          return res.status(422).json({ error: "Cannot add charges to closed folio" });
        }
        
        // Set the posting user and timestamp from the authenticated user
        const chargeWithUser = {
          ...chargeData,
          postedBy: req.user?.id,
          postingDate: new Date(),
          chargeDate: new Date()
        };
        
        const charge = await storage.createCharge(chargeWithUser);
        
        res.status(201).json({ charge });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create charge error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update charge
  app.put("/api/charges/:id", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        const charge = await storage.updateCharge(id, updateData);
        res.json({ charge });
      } catch (error) {
        console.error("Update charge error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Void charge
  app.post("/api/charges/:id/void", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { voidReason } = req.body;
        
        if (!voidReason) {
          return res.status(400).json({ error: "Void reason is required" });
        }
        
        // Verify charge exists and user has property access
        const charge = await storage.getCharge(id);
        if (!charge) {
          return res.status(404).json({ error: "Charge not found" });
        }
        
        // Get folio to verify property access
        const folio = await storage.getFolio(charge.folioId);
        if (!folio) {
          return res.status(404).json({ error: "Associated folio not found" });
        }
        
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        // Prevent voiding already voided charges
        if (charge.isVoided) {
          return res.status(422).json({ error: "Charge is already voided" });
        }
        
        const voidedCharge = await storage.voidCharge(id, voidReason, req.user?.id || "");
        res.json({ charge: voidedCharge });
      } catch (error) {
        console.error("Void charge error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Payment Management Routes
export function registerPaymentRoutes(app: Express) {
  // Get payment by ID
  app.get("/api/payments/:id", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const payment = await storage.getPayment(id);
        
        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }
        
        res.json({ payment });
      } catch (error) {
        console.error("Get payment error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Get payments by folio
  app.get("/api/folios/:folioId/payments", 
    authenticate, 
    authorize("billing.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { folioId } = req.params;
        
        // Verify folio exists and user has property access
        const folio = await storage.getFolio(folioId);
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        const payments = await storage.getPaymentsByFolio(folioId);
        
        res.json({ payments });
      } catch (error) {
        console.error("Get payments by folio error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Create payment
  app.post("/api/payments", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const paymentData = insertPaymentSchema.parse(req.body);
        
        // Verify folio exists and user has property access
        const folio = await storage.getFolio(paymentData.folioId);
        if (!folio) {
          return res.status(404).json({ error: "Folio not found" });
        }
        
        if (folio.propertyId !== req.user?.propertyId) {
          return res.status(403).json({ error: "Access denied - property mismatch" });
        }
        
        // Prevent payments to closed folios
        if (folio.status === 'closed') {
          return res.status(422).json({ error: "Cannot add payments to closed folio" });
        }
        
        // Restrict to safe payment methods for now (no card processing)
        const safePaymentMethods = ['cash', 'check', 'bank_transfer', 'other'];
        if (!safePaymentMethods.includes(paymentData.paymentMethod)) {
          return res.status(422).json({ error: "Payment method not supported - card processing requires gateway integration" });
        }
        
        // Set the posting user and timestamp from the authenticated user
        const paymentWithUser = {
          ...paymentData,
          postedBy: req.user?.id,
          paymentDate: new Date(),
          status: 'pending' as const
        };
        
        const payment = await storage.createPayment(paymentWithUser);
        
        res.status(201).json({ payment });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create payment error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Update payment
  app.put("/api/payments/:id", 
    authenticate, 
    authorize("billing.manage"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        const payment = await storage.updatePayment(id, updateData);
        res.json({ payment });
      } catch (error) {
        console.error("Update payment error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Billing Summary Routes
export function registerBillingRoutes(app: Express) {
  // Get billing summary by property
  app.get("/api/properties/:propertyId/billing/summary", 
    authenticate, 
    authorize("billing.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { propertyId } = req.params;
        
        // Get billing summary data from various sources
        const properties = await storage.getProperties();
        const currentProperty = properties.find(p => p.id === propertyId);
        
        if (!currentProperty) {
          return res.status(404).json({ error: "Property not found" });
        }

        // TODO: Implement actual billing summary calculations
        // For now, return mock data structure
        const summary = {
          totalRevenue: 0,
          totalOutstanding: 0,
          totalRefunds: 0,
          totalCharges: 0,
          totalPayments: 0,
          openFolios: 0
        };
        
        res.json({ summary });
      } catch (error) {
        console.error("Get billing summary error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Reporting and Analytics Routes  
export function registerReportingRoutes(app: Express) {
  // Dashboard Analytics - Key metrics for dashboard
  app.get("/api/dashboard/analytics",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        // Get today's metrics
        const todayMetrics = await storage.getDailyMetric(propertyId, today);
        const yesterdayMetrics = await storage.getDailyMetric(propertyId, yesterday);
        
        // Calculate real-time metrics if no daily metrics available
        const realtimeMetrics = !todayMetrics ? 
          await storage.calculateDailyMetrics(propertyId, today) : null;
        
        // Get recent guest satisfaction ratings
        const recentRatings = await storage.getAverageRatings(propertyId, lastMonth, today);
        
        // Get monthly metrics for trends
        const monthlyMetrics = await storage.getDailyMetrics(propertyId, lastMonth, today);
        
        res.json({
          todayMetrics: todayMetrics || realtimeMetrics,
          yesterdayMetrics,
          monthlyTrend: monthlyMetrics,
          guestSatisfaction: recentRatings
        });
      } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Daily Metrics Routes
  app.get("/api/daily-metrics",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate are required" });
        }
        
        const metrics = await storage.getDailyMetrics(
          propertyId, 
          new Date(fromDate as string), 
          new Date(toDate as string)
        );
        
        res.json({ metrics });
      } catch (error) {
        console.error("Get daily metrics error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.post("/api/daily-metrics/calculate",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { date } = req.body;
        
        if (!date) {
          return res.status(400).json({ error: "Date is required" });
        }
        
        const metrics = await storage.calculateDailyMetrics(propertyId, new Date(date));
        
        res.json({ metrics });
      } catch (error) {
        console.error("Calculate daily metrics error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Guest Satisfaction Routes
  app.get("/api/guest-satisfaction",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        const satisfaction = await storage.getGuestSatisfactionByProperty(
          propertyId,
          fromDate ? new Date(fromDate as string) : undefined,
          toDate ? new Date(toDate as string) : undefined
        );
        
        res.json({ satisfaction });
      } catch (error) {
        console.error("Get guest satisfaction error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.get("/api/guest-satisfaction/ratings",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        const ratings = await storage.getAverageRatings(
          propertyId,
          fromDate ? new Date(fromDate as string) : undefined,
          toDate ? new Date(toDate as string) : undefined
        );
        
        res.json({ ratings });
      } catch (error) {
        console.error("Get average ratings error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.post("/api/guest-satisfaction",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const satisfactionData = insertGuestSatisfactionSchema.parse(req.body);
        const propertyId = req.user?.propertyId!;
        
        // Ensure property ID matches authenticated user's property
        if (satisfactionData.propertyId !== propertyId) {
          return res.status(403).json({ error: "Property access denied" });
        }
        
        const satisfaction = await storage.createGuestSatisfaction(satisfactionData);
        
        res.status(201).json({ satisfaction });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create guest satisfaction error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Report Management Routes
  app.get("/api/reports/definitions",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { type } = req.query;
        
        const definitions = await storage.getReportDefinitions(
          propertyId, 
          type as string
        );
        
        res.json({ definitions });
      } catch (error) {
        console.error("Get report definitions error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.get("/api/reports/definitions/:id",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const propertyId = req.user?.propertyId!;
        
        const definition = await storage.getReportDefinition(id, propertyId);
        
        if (!definition) {
          return res.status(404).json({ error: "Report definition not found" });
        }
        
        res.json({ definition });
      } catch (error) {
        console.error("Get report definition error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.post("/api/reports/definitions",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const reportData = insertReportDefinitionSchema.parse(req.body);
        const propertyId = req.user?.propertyId!;
        
        // Ensure property ID matches authenticated user's property
        if (reportData.propertyId !== propertyId) {
          return res.status(403).json({ error: "Property access denied" });
        }
        
        // Set the created by user
        const reportWithUser = {
          ...reportData,
          createdBy: req.user?.id!
        };
        
        const definition = await storage.createReportDefinition(reportWithUser);
        
        res.status(201).json({ definition });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create report definition error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.put("/api/reports/definitions/:id",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        const propertyId = req.user?.propertyId!;
        
        const definition = await storage.updateReportDefinition(id, updateData, propertyId);
        
        res.json({ definition });
      } catch (error) {
        console.error("Update report definition error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.delete("/api/reports/definitions/:id",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const propertyId = req.user?.propertyId!;
        
        const success = await storage.deleteReportDefinition(id, propertyId);
        
        if (!success) {
          return res.status(404).json({ error: "Report definition not found" });
        }
        
        res.json({ message: "Report definition deleted successfully" });
      } catch (error) {
        console.error("Delete report definition error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Analytics Events Routes
  app.get("/api/analytics/events",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate, eventCategory } = req.query;
        
        const events = await storage.getAnalyticsEvents(
          propertyId,
          fromDate ? new Date(fromDate as string) : undefined,
          toDate ? new Date(toDate as string) : undefined,
          eventCategory as string
        );
        
        res.json({ events });
      } catch (error) {
        console.error("Get analytics events error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.post("/api/analytics/events",
    authenticate,
    authorize("reports.manage"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const eventData = insertAnalyticsEventSchema.parse(req.body);
        const propertyId = req.user?.propertyId!;
        
        // Ensure property ID matches authenticated user's property
        if (eventData.propertyId !== propertyId) {
          return res.status(403).json({ error: "Property access denied" });
        }
        
        // Set the user who triggered the event
        const eventWithUser = {
          ...eventData,
          userId: req.user?.id!
        };
        
        const event = await storage.createAnalyticsEvent(eventWithUser);
        
        res.status(201).json({ event });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        console.error("Create analytics event error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Comprehensive Reporting Routes
  app.get("/api/reports/occupancy",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate are required" });
        }
        
        const report = await storage.getOccupancyReport(
          propertyId,
          new Date(fromDate as string),
          new Date(toDate as string)
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get occupancy report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.get("/api/reports/revenue",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate are required" });
        }
        
        const report = await storage.getRevenueReport(
          propertyId,
          new Date(fromDate as string),
          new Date(toDate as string)
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get revenue report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.get("/api/reports/housekeeping",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate are required" });
        }
        
        const report = await storage.getHousekeepingReport(
          propertyId,
          new Date(fromDate as string),
          new Date(toDate as string)
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get housekeeping report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  app.get("/api/reports/guest-analytics",
    authenticate,
    authorize("reports.view"),
    requirePropertyAccess(),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId!;
        const { fromDate, toDate } = req.query;
        
        if (!fromDate || !toDate) {
          return res.status(400).json({ error: "fromDate and toDate are required" });
        }
        
        const report = await storage.getGuestAnalytics(
          propertyId,
          new Date(fromDate as string),
          new Date(toDate as string)
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get guest analytics error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Financial Reports Routes
export function registerFinancialReportingRoutes(app: Express) {
  // Folio Summary Report
  app.get("/api/financial-reports/folio-summary",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Get property ID from authenticated user to ensure proper scoping
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate, toDate } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getFolioSummaryReport(
          propertyId,
          fromDate,
          toDate
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get folio summary report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Charges Analysis Report
  app.get("/api/financial-reports/charges-analysis",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Get property ID from authenticated user to ensure proper scoping
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate, toDate } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getChargesAnalysisReport(
          propertyId,
          fromDate,
          toDate
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get charges analysis report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Payment Analysis Report
  app.get("/api/financial-reports/payment-analysis",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Get property ID from authenticated user to ensure proper scoping
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate, toDate } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getPaymentAnalysisReport(
          propertyId,
          fromDate,
          toDate
        );
        
        res.json({ report });
      } catch (error) {
        console.error("Get payment analysis report error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Accounting Export Data
  app.get("/api/financial-reports/accounting-export",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Get property ID from authenticated user to ensure proper scoping
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate, toDate } = normalizeDateRange(fromDateStr, toDateStr);
        
        const exportData = await storage.getAccountingExportData(
          propertyId,
          fromDate,
          toDate
        );
        
        res.json({ exportData });
      } catch (error) {
        console.error("Get accounting export data error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Frontend-Expected Financial Reports Endpoints
  
  // Overview endpoint for frontend
  app.get("/api/reports/financial/overview",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate: from, toDate: to } = normalizeDateRange(fromDateStr, toDateStr);
        
        // Get financial overview data
        const overview = await storage.getFolioSummaryReport(propertyId, from, to);
        
        res.json({
          totalRevenue: overview.totalRevenue || 0,
          totalExpenses: overview.totalExpenses || 0,
          netProfit: (overview.totalRevenue || 0) - (overview.totalExpenses || 0)
        });
      } catch (error) {
        console.error("Get financial overview error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Revenue details endpoint for frontend
  app.get("/api/reports/financial/revenue-details", 
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate: from, toDate: to } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getChargesAnalysisReport(propertyId, from, to);
        const revenueCharges = report.filter(charge => parseFloat(charge.amount) > 0);
        
        res.json(revenueCharges);
      } catch (error) {
        console.error("Get revenue details error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Expense details endpoint for frontend
  app.get("/api/reports/financial/expense-details",
    authenticate,
    authorize("reports.view.financial"), 
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate: from, toDate: to } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getChargesAnalysisReport(propertyId, from, to);
        const expenseCharges = report.filter(charge => parseFloat(charge.amount) < 0);
        
        res.json(expenseCharges);
      } catch (error) {
        console.error("Get expense details error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  // Payment history endpoint for frontend
  app.get("/api/reports/financial/payment-history",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate: from, toDate: to } = normalizeDateRange(fromDateStr, toDateStr);
        
        const report = await storage.getPaymentAnalysisReport(propertyId, from, to);
        
        res.json(report);
      } catch (error) {
        console.error("Get payment history error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Financial Summary Dashboard
  app.get("/api/financial-reports/financial-dashboard",
    authenticate,
    authorize("reports.view.financial"),
    async (req: AuthRequest, res: Response) => {
      try {
        // Get property ID from authenticated user to ensure proper scoping
        const propertyId = req.user?.propertyId;
        
        if (!propertyId) {
          return res.status(400).json({ error: "User property ID not found" });
        }
        
        // Validate date range parameters
        const dateValidation = DateRangeSchema.safeParse(req.query);
        if (!dateValidation.success) {
          return res.status(400).json({ error: "Invalid date parameters", details: dateValidation.error.errors });
        }
        
        const { fromDate: fromDateStr, toDate: toDateStr } = dateValidation.data;
        const { fromDate: from, toDate: to } = normalizeDateRange(fromDateStr, toDateStr);
        
        // Get all financial reports for dashboard
        const [
          folioSummary,
          chargesAnalysis,
          paymentAnalysis,
          revenueReport
        ] = await Promise.all([
          storage.getFolioSummaryReport(propertyId, from, to),
          storage.getChargesAnalysisReport(propertyId, from, to),
          storage.getPaymentAnalysisReport(propertyId, from, to),
          storage.getRevenueReport(propertyId, from, to)
        ]);
        
        const dashboard = {
          summary: {
            totalRevenue: revenueReport.totalRevenue,
            totalCharges: folioSummary.totalCharges,
            totalPayments: folioSummary.totalPayments,
            outstandingBalance: folioSummary.outstandingBalance,
            avgDailyRate: revenueReport.avgDailyRate,
            revpar: revenueReport.revpar
          },
          folioMetrics: {
            totalFolios: folioSummary.totalFolios,
            openFolios: folioSummary.openFolios,
            closedFolios: folioSummary.closedFolios,
            avgFolioValue: folioSummary.avgFolioValue
          },
          paymentMetrics: {
            totalPayments: paymentAnalysis.totalPayments,
            paymentsByMethod: paymentAnalysis.paymentsByMethod,
            refundsAnalysis: paymentAnalysis.refundsAnalysis
          },
          chargeMetrics: {
            totalCharges: chargesAnalysis.totalCharges,
            totalTaxes: chargesAnalysis.totalTaxes,
            voidedCharges: chargesAnalysis.voidedCharges,
            topChargeTypes: Object.entries(chargesAnalysis.chargesByCode)
              .sort(([,a], [,b]) => b.amount - a.amount)
              .slice(0, 5)
              .map(([code, data]) => ({ code, ...data }))
          },
          trends: {
            dailyCharges: chargesAnalysis.dailyChargesTrend,
            dailyPayments: paymentAnalysis.dailyPaymentsTrend
          }
        };
        
        res.json({ dashboard });
      } catch (error) {
        console.error("Get financial dashboard error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

// Register all HMS routes
export function registerHMSRoutes(app: Express) {
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerPropertyRoutes(app);
  registerRoomRoutes(app);
  registerGuestRoutes(app);
  registerReservationRoutes(app);
  registerFolioRoutes(app);
  registerChargeRoutes(app);
  registerPaymentRoutes(app);
  registerBillingRoutes(app);
  registerServiceRequestRoutes(app);
  registerHousekeepingRoutes(app);
  registerReportingRoutes(app);
  registerFinancialReportingRoutes(app);
}