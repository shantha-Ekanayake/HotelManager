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
  type User,
  type Property,
  type Room,
  type RoomType,
  type Guest,
  type Reservation
} from "@shared/schema";

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
  // Get all properties
  app.get("/api/properties", 
    authenticate, 
    authorize("properties.view"),
    async (req: AuthRequest, res: Response) => {
      try {
        const properties = await storage.getProperties();
        res.json({ properties });
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
        
        const guests = await storage.searchGuests(query as string);
        res.json({ guests });
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
        const updateData = req.body;
        
        const task = await storage.updateHousekeepingTask(id, updateData);
        res.json({ task });
      } catch (error) {
        console.error("Update housekeeping task error:", error);
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
  registerServiceRequestRoutes(app);
  registerHousekeepingRoutes(app);
}