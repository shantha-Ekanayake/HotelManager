import bcrypt from "bcryptjs";
import type {
  User, InsertUser, Property, InsertProperty, Room, InsertRoom,
  RoomType, InsertRoomType, Guest, InsertGuest, Reservation, InsertReservation,
  Folio, InsertFolio, Charge, InsertCharge, Payment, InsertPayment,
  ServiceRequest, InsertServiceRequest, HousekeepingTask, InsertHousekeepingTask,
  RatePlan, InsertRatePlan, DailyRate, InsertDailyRate,
  DailyMetric, InsertDailyMetric, GuestSatisfaction, InsertGuestSatisfaction,
  ReportDefinition, InsertReportDefinition, AnalyticsEvent, InsertAnalyticsEvent
} from "@shared/schema";
import type { IHMSStorage } from "./database-storage";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class MemStorage implements IHMSStorage {
  private users: Map<string, User> = new Map();
  private properties: Map<string, Property> = new Map();
  private rooms: Map<string, Room> = new Map();
  private roomTypes: Map<string, RoomType> = new Map();
  private guests: Map<string, Guest> = new Map();
  private reservations: Map<string, Reservation> = new Map();
  private folios: Map<string, Folio> = new Map();
  private charges: Map<string, Charge> = new Map();
  private payments: Map<string, Payment> = new Map();
  private serviceRequests: Map<string, ServiceRequest> = new Map();
  private housekeepingTasks: Map<string, HousekeepingTask> = new Map();
  private ratePlans: Map<string, RatePlan> = new Map();
  private dailyRates: Map<string, DailyRate> = new Map();
  private dailyMetrics: Map<string, DailyMetric> = new Map();
  private guestSatisfaction: Map<string, GuestSatisfaction> = new Map();
  private reportDefinitions: Map<string, ReportDefinition> = new Map();
  private analyticsEvents: Map<string, AnalyticsEvent> = new Map();

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    // Create demo property
    const property: Property = {
      id: "prop-demo",
      name: "Grand Hotel Demo",
      address: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      postalCode: "94102",
      phone: "+1-555-0100",
      email: "info@grandhotel.com",
      currency: "USD",
      timezone: "America/Los_Angeles",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.properties.set(property.id, property);

    // Create demo users with hashed passwords (using hashSync for synchronous seeding)
    const hashedPassword = bcrypt.hashSync("password123", 10);
    const hashedAdminPassword = bcrypt.hashSync("admin123", 10);
    const hashedFrontDeskPassword = bcrypt.hashSync("frontdesk123", 10);

    const users: User[] = [
      {
        id: "user-manager",
        username: "manager",
        password: hashedPassword,
        email: "manager@grandhotel.com",
        firstName: "John",
        lastName: "Manager",
        role: "hotel_manager",
        propertyId: property.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "user-admin",
        username: "admin",
        password: hashedAdminPassword,
        email: "admin@grandhotel.com",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        propertyId: property.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "user-frontdesk",
        username: "frontdesk",
        password: hashedFrontDeskPassword,
        email: "frontdesk@grandhotel.com",
        firstName: "Sarah",
        lastName: "Receptionist",
        role: "front_desk_staff",
        propertyId: property.id,
        isActive: true,
        lastLogin: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    users.forEach(user => this.users.set(user.id, user));

    // Create room types
    const roomTypes: RoomType[] = [
      {
        id: "rt-standard",
        propertyId: property.id,
        name: "Standard Room",
        description: "Comfortable room with queen bed",
        maxOccupancy: 2,
        baseRate: "129.99",
        amenities: ["WiFi", "TV", "Air Conditioning"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "rt-deluxe",
        propertyId: property.id,
        name: "Deluxe Suite",
        description: "Spacious suite with king bed and living area",
        maxOccupancy: 4,
        baseRate: "249.99",
        amenities: ["WiFi", "TV", "Air Conditioning", "Mini Bar", "Coffee Maker"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    roomTypes.forEach(rt => this.roomTypes.set(rt.id, rt));

    // Create rooms
    const rooms: Room[] = [
      {
        id: "room-101",
        propertyId: property.id,
        roomTypeId: "rt-standard",
        roomNumber: "101",
        floor: 1,
        status: "available",
        isActive: true,
        notes: null,
        lastCleaned: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "room-102",
        propertyId: property.id,
        roomTypeId: "rt-standard",
        roomNumber: "102",
        floor: 1,
        status: "available",
        isActive: true,
        notes: null,
        lastCleaned: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "room-201",
        propertyId: property.id,
        roomTypeId: "rt-deluxe",
        roomNumber: "201",
        floor: 2,
        status: "available",
        isActive: true,
        notes: null,
        lastCleaned: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    rooms.forEach(room => this.rooms.set(room.id, room));

    // Create a demo guest
    const guest: Guest = {
      id: "guest-demo",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.johnson@email.com",
      phone: "+1-555-0199",
      address: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      postalCode: "90001",
      dateOfBirth: new Date("1985-05-15"),
      idType: "Passport",
      idNumber: "P12345678",
      nationality: "USA",
      preferences: { roomType: "suite", floor: "high" },
      vipStatus: false,
      notes: "Prefers quiet rooms",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.guests.set(guest.id, guest);

    // Create a rate plan
    const ratePlan: RatePlan = {
      id: "rp-standard",
      propertyId: property.id,
      name: "Standard Rate",
      description: "Standard booking rate",
      isActive: true,
      minLengthOfStay: 1,
      maxLengthOfStay: null,
      cancellationPolicy: "Free cancellation up to 24 hours before check-in",
      isRefundable: true,
      advanceBookingDays: null,
      restrictions: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.ratePlans.set(ratePlan.id, ratePlan);
  }

  // User Management
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: generateId(),
      ...user,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    const updated = { ...existing, ...user, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async getUsersByProperty(propertyId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.propertyId === propertyId);
  }

  // Property Management
  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const newProperty: Property = {
      id: generateId(),
      ...property,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Property;
    this.properties.set(newProperty.id, newProperty);
    return newProperty;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property> {
    const existing = this.properties.get(id);
    if (!existing) throw new Error("Property not found");
    const updated = { ...existing, ...property, updatedAt: new Date() };
    this.properties.set(id, updated);
    return updated;
  }

  // Room Management
  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(r => r.propertyId === propertyId);
  }

  async getRoomByNumber(propertyId: string, roomNumber: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(r => r.propertyId === propertyId && r.roomNumber === roomNumber);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const newRoom: Room = {
      id: generateId(),
      ...room,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Room;
    this.rooms.set(newRoom.id, newRoom);
    return newRoom;
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const existing = this.rooms.get(id);
    if (!existing) throw new Error("Room not found");
    const updated = { ...existing, ...room, updatedAt: new Date() };
    this.rooms.set(id, updated);
    return updated;
  }

  // Room Type Management
  async getRoomType(id: string): Promise<RoomType | undefined> {
    return this.roomTypes.get(id);
  }

  async getRoomTypesByProperty(propertyId: string): Promise<RoomType[]> {
    return Array.from(this.roomTypes.values()).filter(rt => rt.propertyId === propertyId);
  }

  async createRoomType(roomType: InsertRoomType): Promise<RoomType> {
    const newRoomType: RoomType = {
      id: generateId(),
      ...roomType,
      createdAt: new Date(),
      updatedAt: new Date()
    } as RoomType;
    this.roomTypes.set(newRoomType.id, newRoomType);
    return newRoomType;
  }

  async updateRoomType(id: string, roomType: Partial<InsertRoomType>): Promise<RoomType> {
    const existing = this.roomTypes.get(id);
    if (!existing) throw new Error("Room type not found");
    const updated = { ...existing, ...roomType, updatedAt: new Date() };
    this.roomTypes.set(id, updated);
    return updated;
  }

  // Guest Management
  async getGuest(id: string): Promise<Guest | undefined> {
    return this.guests.get(id);
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    return Array.from(this.guests.values()).find(g => g.email === email);
  }

  async searchGuests(query: string): Promise<Guest[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.guests.values()).filter(g =>
      g.firstName.toLowerCase().includes(lowerQuery) ||
      g.lastName.toLowerCase().includes(lowerQuery) ||
      g.email?.toLowerCase().includes(lowerQuery)
    );
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const newGuest: Guest = {
      id: generateId(),
      ...guest,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Guest;
    this.guests.set(newGuest.id, newGuest);
    return newGuest;
  }

  async updateGuest(id: string, guest: Partial<InsertGuest>): Promise<Guest> {
    const existing = this.guests.get(id);
    if (!existing) throw new Error("Guest not found");
    const updated = { ...existing, ...guest, updatedAt: new Date() };
    this.guests.set(id, updated);
    return updated;
  }

  // Guest CRM Features
  async getGuestStayHistory(guestId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter(r => r.guestId === guestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getGuestsByProperty(propertyId: string): Promise<Guest[]> {
    const reservations = Array.from(this.reservations.values()).filter(r => r.propertyId === propertyId);
    const guestIds = new Set(reservations.map(r => r.guestId));
    return Array.from(this.guests.values()).filter(g => guestIds.has(g.id));
  }

  async getVIPGuests(propertyId: string): Promise<Guest[]> {
    const propertyGuests = await this.getGuestsByProperty(propertyId);
    return propertyGuests.filter(g => g.vipStatus);
  }

  async updateGuestPreferences(guestId: string, preferences: Record<string, any>): Promise<Guest> {
    const guest = this.guests.get(guestId);
    if (!guest) throw new Error("Guest not found");
    const updated = { ...guest, preferences, updatedAt: new Date() };
    this.guests.set(guestId, updated);
    return updated;
  }

  async getGuestProfile(guestId: string): Promise<{
    guest: Guest;
    stayHistory: Reservation[];
    totalStays: number;
    totalRevenue: number;
    lastStayDate?: Date;
  } | undefined> {
    const guest = this.guests.get(guestId);
    if (!guest) return undefined;

    const stayHistory = await this.getGuestStayHistory(guestId);
    const totalStays = stayHistory.length;
    const totalRevenue = stayHistory.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
    const lastStayDate = stayHistory.length > 0 ? new Date(stayHistory[0].checkInDate) : undefined;

    return { guest, stayHistory, totalStays, totalRevenue, lastStayDate };
  }

  // Rate Plan Management
  async getRatePlan(id: string): Promise<RatePlan | undefined> {
    return this.ratePlans.get(id);
  }

  async getRatePlansByProperty(propertyId: string): Promise<RatePlan[]> {
    return Array.from(this.ratePlans.values()).filter(rp => rp.propertyId === propertyId);
  }

  async createRatePlan(ratePlan: InsertRatePlan): Promise<RatePlan> {
    const newRatePlan: RatePlan = {
      id: generateId(),
      ...ratePlan,
      createdAt: new Date(),
      updatedAt: new Date()
    } as RatePlan;
    this.ratePlans.set(newRatePlan.id, newRatePlan);
    return newRatePlan;
  }

  async updateRatePlan(id: string, ratePlan: Partial<InsertRatePlan>): Promise<RatePlan> {
    const existing = this.ratePlans.get(id);
    if (!existing) throw new Error("Rate plan not found");
    const updated = { ...existing, ...ratePlan, updatedAt: new Date() };
    this.ratePlans.set(id, updated);
    return updated;
  }

  // Stub implementations for remaining methods (simplified for demo)
  async getDailyRate(): Promise<DailyRate | undefined> { return undefined; }
  async getDailyRates(): Promise<DailyRate[]> { return []; }
  async createDailyRate(dailyRate: InsertDailyRate): Promise<DailyRate> {
    const newRate: DailyRate = { id: generateId(), ...dailyRate, createdAt: new Date(), updatedAt: new Date() } as DailyRate;
    this.dailyRates.set(newRate.id, newRate);
    return newRate;
  }
  async updateDailyRate(id: string, dailyRate: Partial<InsertDailyRate>): Promise<DailyRate> {
    const existing = this.dailyRates.get(id);
    if (!existing) throw new Error("Daily rate not found");
    const updated = { ...existing, ...dailyRate, updatedAt: new Date() };
    this.dailyRates.set(id, updated);
    return updated;
  }
  async checkAvailability(): Promise<any> {
    return { available: true, totalRooms: 10, occupiedRooms: 2, availableRooms: 8, restrictions: [] };
  }
  async getRoomTypeAvailability(): Promise<any[]> { return []; }
  async calculateBestRate(): Promise<any> { return null; }
  async createReservationWithValidation(reservation: InsertReservation, validateAvailability: boolean): Promise<{
    success: boolean;
    reservation?: Reservation;
    error?: string;
    availability?: any;
  }> {
    try {
      // Create the reservation
      const newReservation = await this.createReservation(reservation);
      
      // Automatically create a folio for the reservation
      await this.createFolio({
        reservationId: newReservation.id,
        guestId: newReservation.guestId,
        propertyId: newReservation.propertyId,
        status: "open",
        totalCharges: "0",
        totalPayments: "0",
        balance: "0",
        notes: `Auto-created for reservation ${newReservation.confirmationNumber}`
      });
      
      return { success: true, reservation: newReservation };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create reservation" };
    }
  }
  async getReservation(id: string): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }
  async getReservationByConfirmation(confirmationNumber: string): Promise<Reservation | undefined> {
    return Array.from(this.reservations.values()).find(r => r.confirmationNumber === confirmationNumber);
  }
  async getReservationsByProperty(propertyId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => r.propertyId === propertyId);
  }
  async getReservationsByDateRange(propertyId: string, fromDate: Date, toDate: Date): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => 
      r.propertyId === propertyId &&
      r.arrivalDate >= fromDate &&
      r.arrivalDate <= toDate
    );
  }
  
  async getArrivalsToday(propertyId: string): Promise<Reservation[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    return Array.from(this.reservations.values()).filter(r =>
      r.propertyId === propertyId &&
      r.arrivalDate >= startOfDay &&
      r.arrivalDate <= endOfDay
    );
  }
  
  async getDeparturesToday(propertyId: string): Promise<Reservation[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    return Array.from(this.reservations.values()).filter(r =>
      r.propertyId === propertyId &&
      r.departureDate >= startOfDay &&
      r.departureDate <= endOfDay
    );
  }
  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    const confirmationNumber = `RES-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newReservation: Reservation = {
      id: generateId(),
      confirmationNumber,
      ...reservation,
      checkInTime: null,
      checkOutTime: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Reservation;
    this.reservations.set(newReservation.id, newReservation);
    return newReservation;
  }
  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation> {
    const existing = this.reservations.get(id);
    if (!existing) throw new Error("Reservation not found");
    const updated = { ...existing, ...reservation, updatedAt: new Date() };
    this.reservations.set(id, updated);
    return updated;
  }

  // Folio Management
  async getFolio(id: string): Promise<Folio | undefined> {
    return this.folios.get(id);
  }
  async getFolioByReservation(reservationId: string): Promise<Folio | undefined> {
    return Array.from(this.folios.values()).find(f => f.reservationId === reservationId);
  }
  async getFoliosByGuest(guestId: string): Promise<Folio[]> {
    return Array.from(this.folios.values()).filter(f => f.guestId === guestId);
  }
  async getFoliosByProperty(propertyId: string): Promise<Folio[]> {
    return Array.from(this.folios.values()).filter(f => f.propertyId === propertyId);
  }
  async getFoliosByDateRange(): Promise<Folio[]> { return []; }
  async calculateFolioBalance(folioId: string): Promise<{ totalCharges: number; totalPayments: number; balance: number }> {
    const charges = await this.getChargesByFolio(folioId);
    const payments = await this.getPaymentsByFolio(folioId);
    const totalCharges = charges.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    return { totalCharges, totalPayments, balance: totalCharges - totalPayments };
  }
  async createFolio(folio: InsertFolio): Promise<Folio> {
    const folioNumber = `F-${Date.now()}`;
    const newFolio: Folio = {
      id: generateId(),
      folioNumber,
      ...folio,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Folio;
    this.folios.set(newFolio.id, newFolio);
    return newFolio;
  }
  async updateFolio(id: string, folio: Partial<InsertFolio>): Promise<Folio> {
    const existing = this.folios.get(id);
    if (!existing) throw new Error("Folio not found");
    const updated = { ...existing, ...folio, updatedAt: new Date() };
    this.folios.set(id, updated);
    return updated;
  }

  // Charge Management
  async getCharge(id: string): Promise<Charge | undefined> {
    return this.charges.get(id);
  }
  async getChargesByFolio(folioId: string): Promise<Charge[]> {
    return Array.from(this.charges.values()).filter(c => c.folioId === folioId);
  }
  async getChargesByProperty(propertyId: string): Promise<Charge[]> {
    return Array.from(this.charges.values()).filter(c => c.propertyId === propertyId);
  }
  async getChargesByDateRange(propertyId: string, fromDate: Date, toDate: Date): Promise<Charge[]> {
    return Array.from(this.charges.values()).filter(c => 
      c.propertyId === propertyId &&
      new Date(c.chargeDate) >= fromDate &&
      new Date(c.chargeDate) <= toDate
    );
  }
  async getRevenueCharges(propertyId: string, fromDate: Date, toDate: Date): Promise<Charge[]> {
    return (await this.getChargesByDateRange(propertyId, fromDate, toDate))
      .filter(c => !c.isVoid && (c.chargeType === 'room_charge' || c.chargeType === 'service_charge'));
  }
  async getExpenseCharges(propertyId: string, fromDate: Date, toDate: Date): Promise<Charge[]> {
    return (await this.getChargesByDateRange(propertyId, fromDate, toDate))
      .filter(c => !c.isVoid && (c.chargeType === 'expense' || c.chargeType === 'refund'));
  }
  async createCharge(charge: InsertCharge): Promise<Charge> {
    const newCharge: Charge = {
      id: generateId(),
      ...charge,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Charge;
    this.charges.set(newCharge.id, newCharge);
    return newCharge;
  }
  async updateCharge(id: string, charge: Partial<InsertCharge>): Promise<Charge> {
    const existing = this.charges.get(id);
    if (!existing) throw new Error("Charge not found");
    const updated = { ...existing, ...charge, updatedAt: new Date() };
    this.charges.set(id, updated);
    return updated;
  }
  async voidCharge(id: string, voidReason: string, voidedBy: string): Promise<Charge> {
    return this.updateCharge(id, { isVoid: true, voidReason, voidedBy, voidedAt: new Date() });
  }

  // Payment Management
  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  async getPaymentsByFolio(folioId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.folioId === folioId);
  }
  async getPaymentsByProperty(propertyId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.propertyId === propertyId);
  }
  async getPaymentsByDateRange(propertyId: string, fromDate: Date, toDate: Date): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p =>
      p.propertyId === propertyId &&
      new Date(p.paymentDate) >= fromDate &&
      new Date(p.paymentDate) <= toDate
    );
  }
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment: Payment = {
      id: generateId(),
      ...payment,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Payment;
    this.payments.set(newPayment.id, newPayment);
    return newPayment;
  }
  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment> {
    const existing = this.payments.get(id);
    if (!existing) throw new Error("Payment not found");
    const updated = { ...existing, ...payment, updatedAt: new Date() };
    this.payments.set(id, updated);
    return updated;
  }

  // Service Request Management
  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    return this.serviceRequests.get(id);
  }
  async getServiceRequestsByProperty(propertyId: string): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequests.values()).filter(sr => sr.propertyId === propertyId);
  }
  async getServiceRequestsByRoom(): Promise<ServiceRequest[]> { return []; }
  async getServiceRequestsByStatus(): Promise<ServiceRequest[]> { return []; }
  async createServiceRequest(serviceRequest: InsertServiceRequest): Promise<ServiceRequest> {
    const newServiceRequest: ServiceRequest = {
      id: generateId(),
      ...serviceRequest,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ServiceRequest;
    this.serviceRequests.set(newServiceRequest.id, newServiceRequest);
    return newServiceRequest;
  }
  async updateServiceRequest(id: string, serviceRequest: Partial<InsertServiceRequest>): Promise<ServiceRequest> {
    const existing = this.serviceRequests.get(id);
    if (!existing) throw new Error("Service request not found");
    const updated = { ...existing, ...serviceRequest, updatedAt: new Date() };
    this.serviceRequests.set(id, updated);
    return updated;
  }

  // Housekeeping Task Management
  async getHousekeepingTask(id: string): Promise<HousekeepingTask | undefined> {
    return this.housekeepingTasks.get(id);
  }
  async getHousekeepingTasksByProperty(): Promise<HousekeepingTask[]> { return []; }
  async getHousekeepingTasksByRoom(): Promise<HousekeepingTask[]> { return []; }
  async getHousekeepingTasksByDate(): Promise<HousekeepingTask[]> { return []; }
  async createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask> {
    const newTask: HousekeepingTask = {
      id: generateId(),
      ...task,
      createdAt: new Date(),
      updatedAt: new Date()
    } as HousekeepingTask;
    this.housekeepingTasks.set(newTask.id, newTask);
    return newTask;
  }
  async updateHousekeepingTask(id: string, task: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask> {
    const existing = this.housekeepingTasks.get(id);
    if (!existing) throw new Error("Housekeeping task not found");
    const updated = { ...existing, ...task, updatedAt: new Date() };
    this.housekeepingTasks.set(id, updated);
    return updated;
  }

  // Daily Metrics
  async getDailyMetric(): Promise<DailyMetric | undefined> { return undefined; }
  async getDailyMetricsByDateRange(): Promise<DailyMetric[]> { return []; }
  async createDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
    const newMetric: DailyMetric = {
      id: generateId(),
      ...metric,
      createdAt: new Date(),
      updatedAt: new Date()
    } as DailyMetric;
    this.dailyMetrics.set(newMetric.id, newMetric);
    return newMetric;
  }
  async updateDailyMetric(id: string, metric: Partial<InsertDailyMetric>): Promise<DailyMetric> {
    const existing = this.dailyMetrics.get(id);
    if (!existing) throw new Error("Daily metric not found");
    const updated = { ...existing, ...metric, updatedAt: new Date() };
    this.dailyMetrics.set(id, updated);
    return updated;
  }

  // Guest Satisfaction
  async getGuestSatisfaction(id: string): Promise<GuestSatisfaction | undefined> {
    return this.guestSatisfaction.get(id);
  }
  async getGuestSatisfactionByReservation(): Promise<GuestSatisfaction | undefined> { return undefined; }
  async getGuestSatisfactionsByProperty(): Promise<GuestSatisfaction[]> { return []; }
  async createGuestSatisfaction(satisfaction: InsertGuestSatisfaction): Promise<GuestSatisfaction> {
    const newSatisfaction: GuestSatisfaction = {
      id: generateId(),
      ...satisfaction,
      createdAt: new Date(),
      updatedAt: new Date()
    } as GuestSatisfaction;
    this.guestSatisfaction.set(newSatisfaction.id, newSatisfaction);
    return newSatisfaction;
  }
  async updateGuestSatisfaction(id: string, satisfaction: Partial<InsertGuestSatisfaction>): Promise<GuestSatisfaction> {
    const existing = this.guestSatisfaction.get(id);
    if (!existing) throw new Error("Guest satisfaction not found");
    const updated = { ...existing, ...satisfaction, updatedAt: new Date() };
    this.guestSatisfaction.set(id, updated);
    return updated;
  }

  // Report Definitions
  async getReportDefinition(id: string): Promise<ReportDefinition | undefined> {
    return this.reportDefinitions.get(id);
  }
  async getReportDefinitionsByProperty(): Promise<ReportDefinition[]> { return []; }
  async createReportDefinition(definition: InsertReportDefinition): Promise<ReportDefinition> {
    const newDefinition: ReportDefinition = {
      id: generateId(),
      ...definition,
      createdAt: new Date(),
      updatedAt: new Date()
    } as ReportDefinition;
    this.reportDefinitions.set(newDefinition.id, newDefinition);
    return newDefinition;
  }
  async updateReportDefinition(id: string, definition: Partial<InsertReportDefinition>): Promise<ReportDefinition> {
    const existing = this.reportDefinitions.get(id);
    if (!existing) throw new Error("Report definition not found");
    const updated = { ...existing, ...definition, updatedAt: new Date() };
    this.reportDefinitions.set(id, updated);
    return updated;
  }

  // Analytics Events
  async getAnalyticsEvent(id: string): Promise<AnalyticsEvent | undefined> {
    return this.analyticsEvents.get(id);
  }
  async getAnalyticsEventsByProperty(): Promise<AnalyticsEvent[]> { return []; }
  async getAnalyticsEventsByType(): Promise<AnalyticsEvent[]> { return []; }
  async getAnalyticsEventsByDateRange(): Promise<AnalyticsEvent[]> { return []; }
  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const newEvent: AnalyticsEvent = {
      id: generateId(),
      ...event,
      createdAt: new Date()
    } as AnalyticsEvent;
    this.analyticsEvents.set(newEvent.id, newEvent);
    return newEvent;
  }

  // Additional required methods
  async checkIn(): Promise<any> { return { success: true }; }
  async checkOut(): Promise<any> { return { success: true }; }
  async getOccupancyReport(): Promise<any> { return []; }
  
  async getRevenueReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalRevenue: number;
    roomRevenue: number;
    otherRevenue: number;
    avgDailyRate: number;
    revpar: number;
  }> {
    return {
      totalRevenue: 0,
      roomRevenue: 0,
      otherRevenue: 0,
      avgDailyRate: 0,
      revpar: 0
    };
  }

  async getFolioSummaryReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalFolios: number;
    openFolios: number;
    closedFolios: number;
    totalCharges: number;
    totalPayments: number;
    outstandingBalance: number;
    totalRevenue?: number;
    totalExpenses?: number;
  }> {
    return {
      totalFolios: 0,
      openFolios: 0,
      closedFolios: 0,
      totalCharges: 0,
      totalPayments: 0,
      outstandingBalance: 0,
      totalRevenue: 0,
      totalExpenses: 0
    };
  }

  async getChargesAnalysisReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalCharges: number;
    totalTaxes: number;
    chargesByCode: Record<string, { amount: number; count: number; description: string }>;
    dailyChargesTrend: { date: string; amount: number; count: number }[];
    voidedCharges: { amount: number; count: number; reasons: Record<string, number> };
  }> {
    return {
      totalCharges: 0,
      totalTaxes: 0,
      chargesByCode: {},
      dailyChargesTrend: [],
      voidedCharges: {
        amount: 0,
        count: 0,
        reasons: {}
      }
    };
  }

  async getPaymentAnalysisReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalPayments: number;
    paymentsByMethod: Record<string, { amount: number; count: number; avgAmount: number }>;
    paymentsByStatus: Record<string, number>;
    refundsAnalysis: { totalRefunds: number; refundCount: number; topReasons: Record<string, number> };
    dailyPaymentsTrend: { date: string; amount: number; count: number }[];
  }> {
    return {
      totalPayments: 0,
      paymentsByMethod: {},
      paymentsByStatus: {},
      refundsAnalysis: {
        totalRefunds: 0,
        refundCount: 0,
        topReasons: {}
      },
      dailyPaymentsTrend: []
    };
  }

  async getAccountingExportData(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    folioCharges: any[];
    totalCharges: number;
    totalTaxes: number;
    totalPayments: number;
  }> {
    return {
      folioCharges: [],
      totalCharges: 0,
      totalTaxes: 0,
      totalPayments: 0
    };
  }
  
  async getDashboardStats(): Promise<any> {
    return {
      totalRooms: this.rooms.size,
      occupiedRooms: 0,
      availableRooms: this.rooms.size,
      todayArrivals: 0,
      todayDepartures: 0,
      totalRevenue: 0
    };
  }
}

export const memStorage = new MemStorage();
export type { IHMSStorage };
