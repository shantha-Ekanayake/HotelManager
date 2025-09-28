import { eq, and, desc, asc, gte, lte, lt, or, sql, isNull, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type RoomType,
  type InsertRoomType,
  type Guest,
  type InsertGuest,
  type Reservation,
  type InsertReservation,
  type Folio,
  type InsertFolio,
  type Charge,
  type InsertCharge,
  type Payment,
  type InsertPayment,
  type ServiceRequest,
  type InsertServiceRequest,
  type HousekeepingTask,
  type InsertHousekeepingTask,
  type RatePlan,
  type InsertRatePlan,
  type DailyRate,
  type InsertDailyRate,
  users,
  properties,
  rooms,
  roomTypes,
  guests,
  reservations,
  folios,
  charges,
  payments,
  serviceRequests,
  housekeepingTasks,
  ratePlans,
  dailyRates
} from "@shared/schema";

export interface IHMSStorage {
  // User Management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getUsersByProperty(propertyId: string): Promise<User[]>;
  
  // Property Management
  getProperty(id: string): Promise<Property | undefined>;
  getProperties(): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property>;
  
  // Room Management
  getRoom(id: string): Promise<Room | undefined>;
  getRoomsByProperty(propertyId: string): Promise<Room[]>;
  getRoomByNumber(propertyId: string, roomNumber: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room>;
  
  // Room Type Management
  getRoomType(id: string): Promise<RoomType | undefined>;
  getRoomTypesByProperty(propertyId: string): Promise<RoomType[]>;
  createRoomType(roomType: InsertRoomType): Promise<RoomType>;
  updateRoomType(id: string, roomType: Partial<InsertRoomType>): Promise<RoomType>;
  
  // Guest Management
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestByEmail(email: string): Promise<Guest | undefined>;
  searchGuests(query: string): Promise<Guest[]>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: string, guest: Partial<InsertGuest>): Promise<Guest>;
  
  // Guest CRM Features
  getGuestStayHistory(guestId: string): Promise<Reservation[]>;
  getGuestsByProperty(propertyId: string): Promise<Guest[]>;
  getVIPGuests(propertyId: string): Promise<Guest[]>;
  updateGuestPreferences(guestId: string, preferences: Record<string, any>): Promise<Guest>;
  getGuestProfile(guestId: string): Promise<{
    guest: Guest;
    stayHistory: Reservation[];
    totalStays: number;
    totalRevenue: number;
    lastStayDate?: Date;
  } | undefined>;
  
  // Rate Plan Management
  getRatePlan(id: string): Promise<RatePlan | undefined>;
  getRatePlansByProperty(propertyId: string): Promise<RatePlan[]>;
  createRatePlan(ratePlan: InsertRatePlan): Promise<RatePlan>;
  updateRatePlan(id: string, ratePlan: Partial<InsertRatePlan>): Promise<RatePlan>;
  
  // Daily Rate Management
  getDailyRate(propertyId: string, roomTypeId: string, ratePlanId: string, date: Date): Promise<DailyRate | undefined>;
  getDailyRates(propertyId: string, fromDate: Date, toDate: Date): Promise<DailyRate[]>;
  createDailyRate(dailyRate: InsertDailyRate): Promise<DailyRate>;
  updateDailyRate(id: string, dailyRate: Partial<InsertDailyRate>): Promise<DailyRate>;
  
  // Availability Management
  checkAvailability(propertyId: string, roomTypeId: string, arrivalDate: Date, departureDate: Date): Promise<{
    available: boolean;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    restrictions: any[];
  }>;
  getRoomTypeAvailability(propertyId: string, roomTypeId: string, fromDate: Date, toDate: Date): Promise<{
    date: Date;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    closeToArrival: boolean;
    closeToDeparture: boolean;
    stopSell: boolean;
  }[]>;
  
  // Rate Calculation
  calculateBestRate(propertyId: string, roomTypeId: string, arrivalDate: Date, departureDate: Date, lengthOfStay: number): Promise<{
    ratePlan: RatePlan;
    dailyRates: DailyRate[];
    totalAmount: number;
    averageNightlyRate: number;
  } | null>;
  
  // Transactional Reservation Creation
  createReservationWithValidation(reservation: InsertReservation, validateAvailability: boolean): Promise<{
    success: boolean;
    reservation?: Reservation;
    error?: string;
    availability?: any;
  }>;
  
  // Reservation Management
  getReservation(id: string): Promise<Reservation | undefined>;
  getReservationByConfirmation(confirmationNumber: string): Promise<Reservation | undefined>;
  getReservationsByProperty(propertyId: string): Promise<Reservation[]>;
  getReservationsByDateRange(propertyId: string, fromDate: Date, toDate: Date): Promise<Reservation[]>;
  getArrivalsToday(propertyId: string): Promise<Reservation[]>;
  getDeparturesToday(propertyId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation>;
  
  // Folio Management
  getFolio(id: string): Promise<Folio | undefined>;
  getFolioByReservation(reservationId: string): Promise<Folio | undefined>;
  getFoliosByGuest(guestId: string): Promise<Folio[]>;
  createFolio(folio: InsertFolio): Promise<Folio>;
  updateFolio(id: string, folio: Partial<InsertFolio>): Promise<Folio>;
  
  // Charge Management
  getCharge(id: string): Promise<Charge | undefined>;
  getChargesByFolio(folioId: string): Promise<Charge[]>;
  createCharge(charge: InsertCharge): Promise<Charge>;
  updateCharge(id: string, charge: Partial<InsertCharge>): Promise<Charge>;
  voidCharge(id: string, voidReason: string, voidedBy: string): Promise<Charge>;
  
  // Payment Management
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByFolio(folioId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;
  
  // Service Request Management
  getServiceRequest(id: string): Promise<ServiceRequest | undefined>;
  getServiceRequestsByProperty(propertyId: string): Promise<ServiceRequest[]>;
  getServiceRequestsByStatus(propertyId: string, status: string): Promise<ServiceRequest[]>;
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  updateServiceRequest(id: string, request: Partial<InsertServiceRequest>): Promise<ServiceRequest>;
  
  // Housekeeping Management
  getHousekeepingTask(id: string): Promise<HousekeepingTask | undefined>;
  getHousekeepingTasksByProperty(propertyId: string): Promise<HousekeepingTask[]>;
  getHousekeepingTasksByAssignee(assignedTo: string): Promise<HousekeepingTask[]>;
  createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask>;
  updateHousekeepingTask(id: string, task: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask>;
}

export class DatabaseStorage implements IHMSStorage {
  // User Management
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users).set({
      ...user,
      updatedAt: new Date()
    }).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getUsersByProperty(propertyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.propertyId, propertyId));
  }

  // Property Management
  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.isActive, true));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(property).returning();
    return result[0];
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property> {
    const result = await db.update(properties).set({
      ...property,
      updatedAt: new Date()
    }).where(eq(properties.id, id)).returning();
    return result[0];
  }

  // Room Management
  async getRoom(id: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
    return result[0];
  }

  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    return await db.select().from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true)))
      .orderBy(asc(rooms.roomNumber));
  }

  async getRoomByNumber(propertyId: string, roomNumber: string): Promise<Room | undefined> {
    const result = await db.select().from(rooms)
      .where(and(
        eq(rooms.propertyId, propertyId),
        eq(rooms.roomNumber, roomNumber)
      )).limit(1);
    return result[0];
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const result = await db.insert(rooms).values(room).returning();
    return result[0];
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const result = await db.update(rooms).set({
      ...room,
      updatedAt: new Date()
    }).where(eq(rooms.id, id)).returning();
    return result[0];
  }

  // Room Type Management
  async getRoomType(id: string): Promise<RoomType | undefined> {
    const result = await db.select().from(roomTypes).where(eq(roomTypes.id, id)).limit(1);
    return result[0];
  }

  async getRoomTypesByProperty(propertyId: string): Promise<RoomType[]> {
    return await db.select().from(roomTypes)
      .where(and(eq(roomTypes.propertyId, propertyId), eq(roomTypes.isActive, true)));
  }

  async createRoomType(roomType: InsertRoomType): Promise<RoomType> {
    const insertData: any = roomType;
    const result = await db.insert(roomTypes).values(insertData).returning();
    return result[0];
  }

  async updateRoomType(id: string, roomType: Partial<InsertRoomType>): Promise<RoomType> {
    const updateData: any = { ...roomType, updatedAt: new Date() };
    const result = await db.update(roomTypes).set(updateData).where(eq(roomTypes.id, id)).returning();
    return result[0];
  }

  // Guest Management
  async getGuest(id: string): Promise<Guest | undefined> {
    const result = await db.select().from(guests).where(eq(guests.id, id)).limit(1);
    return result[0];
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    const result = await db.select().from(guests).where(eq(guests.email, email)).limit(1);
    return result[0];
  }

  async searchGuests(query: string): Promise<Guest[]> {
    // Enhanced search across multiple fields for CRM
    const searchTerm = `%${query.toLowerCase()}%`;
    
    return await db.select().from(guests)
      .where(
        or(
          sql`LOWER(${guests.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${guests.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${guests.email}) LIKE ${searchTerm}`,
          sql`${guests.phone} LIKE ${searchTerm}`,
          sql`LOWER(${guests.idNumber}) LIKE ${searchTerm}`,
          sql`LOWER(CONCAT(${guests.firstName}, ' ', ${guests.lastName})) LIKE ${searchTerm}`
        )
      )
      .orderBy(desc(guests.updatedAt))
      .limit(20);
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const result = await db.insert(guests).values(guest).returning();
    return result[0];
  }

  async updateGuest(id: string, guest: Partial<InsertGuest>): Promise<Guest> {
    const result = await db.update(guests).set({
      ...guest,
      updatedAt: new Date()
    }).where(eq(guests.id, id)).returning();
    return result[0];
  }

  // Guest CRM Features Implementation
  async getGuestStayHistory(guestId: string): Promise<Reservation[]> {
    return await db.select().from(reservations)
      .where(eq(reservations.guestId, guestId))
      .orderBy(desc(reservations.arrivalDate));
  }

  async getGuestsByProperty(propertyId: string): Promise<Guest[]> {
    // Get guests who have reservations at this property
    const guestsWithReservations = await db.selectDistinct({ 
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      address: guests.address,
      city: guests.city,
      state: guests.state,
      country: guests.country,
      postalCode: guests.postalCode,
      dateOfBirth: guests.dateOfBirth,
      idType: guests.idType,
      idNumber: guests.idNumber,
      nationality: guests.nationality,
      preferences: guests.preferences,
      vipStatus: guests.vipStatus,
      notes: guests.notes,
      createdAt: guests.createdAt,
      updatedAt: guests.updatedAt
    })
    .from(guests)
    .innerJoin(reservations, eq(reservations.guestId, guests.id))
    .where(eq(reservations.propertyId, propertyId))
    .orderBy(desc(guests.createdAt));
    
    return guestsWithReservations;
  }

  async getVIPGuests(propertyId: string): Promise<Guest[]> {
    // Get VIP guests who have reservations at this property
    const vipGuests = await db.selectDistinct({ 
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      email: guests.email,
      phone: guests.phone,
      address: guests.address,
      city: guests.city,
      state: guests.state,
      country: guests.country,
      postalCode: guests.postalCode,
      dateOfBirth: guests.dateOfBirth,
      idType: guests.idType,
      idNumber: guests.idNumber,
      nationality: guests.nationality,
      preferences: guests.preferences,
      vipStatus: guests.vipStatus,
      notes: guests.notes,
      createdAt: guests.createdAt,
      updatedAt: guests.updatedAt
    })
    .from(guests)
    .innerJoin(reservations, eq(reservations.guestId, guests.id))
    .where(and(
      eq(reservations.propertyId, propertyId),
      eq(guests.vipStatus, true)
    ))
    .orderBy(desc(guests.createdAt));
    
    return vipGuests;
  }

  async updateGuestPreferences(guestId: string, preferences: Record<string, any>): Promise<Guest> {
    const result = await db.update(guests).set({
      preferences,
      updatedAt: new Date()
    }).where(eq(guests.id, guestId)).returning();
    return result[0];
  }

  async getGuestProfile(guestId: string): Promise<{
    guest: Guest;
    stayHistory: Reservation[];
    totalStays: number;
    totalRevenue: number;
    lastStayDate?: Date;
  } | undefined> {
    // Get guest information
    const guest = await this.getGuest(guestId);
    if (!guest) return undefined;

    // Get stay history
    const stayHistory = await this.getGuestStayHistory(guestId);
    
    // Calculate statistics
    const totalStays = stayHistory.length;
    const totalRevenue = stayHistory.reduce((sum, reservation) => 
      sum + parseFloat(reservation.totalAmount.toString()), 0
    );
    const lastStayDate = stayHistory.length > 0 ? stayHistory[0].arrivalDate : undefined;

    return {
      guest,
      stayHistory,
      totalStays,
      totalRevenue,
      lastStayDate
    };
  }

  // Rate Plan Management
  async getRatePlan(id: string): Promise<RatePlan | undefined> {
    const result = await db.select().from(ratePlans).where(eq(ratePlans.id, id)).limit(1);
    return result[0];
  }

  async getRatePlansByProperty(propertyId: string): Promise<RatePlan[]> {
    return await db.select().from(ratePlans)
      .where(and(eq(ratePlans.propertyId, propertyId), eq(ratePlans.isActive, true)));
  }

  async createRatePlan(ratePlan: InsertRatePlan): Promise<RatePlan> {
    const result = await db.insert(ratePlans).values(ratePlan).returning();
    return result[0];
  }

  async updateRatePlan(id: string, ratePlan: Partial<InsertRatePlan>): Promise<RatePlan> {
    const result = await db.update(ratePlans).set({
      ...ratePlan,
      updatedAt: new Date()
    }).where(eq(ratePlans.id, id)).returning();
    return result[0];
  }

  // Daily Rate Management
  async getDailyRate(propertyId: string, roomTypeId: string, ratePlanId: string, date: Date): Promise<DailyRate | undefined> {
    const result = await db.select().from(dailyRates)
      .where(and(
        eq(dailyRates.propertyId, propertyId),
        eq(dailyRates.roomTypeId, roomTypeId),
        eq(dailyRates.ratePlanId, ratePlanId),
        eq(dailyRates.date, date)
      )).limit(1);
    return result[0];
  }

  async getDailyRates(propertyId: string, fromDate: Date, toDate: Date): Promise<DailyRate[]> {
    return await db.select().from(dailyRates)
      .where(and(
        eq(dailyRates.propertyId, propertyId),
        gte(dailyRates.date, fromDate),
        lte(dailyRates.date, toDate)
      ))
      .orderBy(asc(dailyRates.date));
  }

  async createDailyRate(dailyRate: InsertDailyRate): Promise<DailyRate> {
    const result = await db.insert(dailyRates).values(dailyRate).returning();
    return result[0];
  }

  async updateDailyRate(id: string, dailyRate: Partial<InsertDailyRate>): Promise<DailyRate> {
    const result = await db.update(dailyRates).set({
      ...dailyRate,
      updatedAt: new Date()
    }).where(eq(dailyRates.id, id)).returning();
    return result[0];
  }

  // Reservation Management
  async getReservation(id: string): Promise<Reservation | undefined> {
    const result = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return result[0];
  }

  async getReservationByConfirmation(confirmationNumber: string): Promise<Reservation | undefined> {
    const result = await db.select().from(reservations)
      .where(eq(reservations.confirmationNumber, confirmationNumber)).limit(1);
    return result[0];
  }

  async getReservationsByProperty(propertyId: string): Promise<Reservation[]> {
    return await db.select().from(reservations)
      .where(eq(reservations.propertyId, propertyId))
      .orderBy(desc(reservations.arrivalDate));
  }

  async getReservationsByDateRange(propertyId: string, fromDate: Date, toDate: Date): Promise<Reservation[]> {
    return await db.select().from(reservations)
      .where(and(
        eq(reservations.propertyId, propertyId),
        gte(reservations.arrivalDate, fromDate),
        lte(reservations.departureDate, toDate)
      ))
      .orderBy(asc(reservations.arrivalDate));
  }

  async getArrivalsToday(propertyId: string): Promise<Reservation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select().from(reservations)
      .where(and(
        eq(reservations.propertyId, propertyId),
        gte(reservations.arrivalDate, today),
        lte(reservations.arrivalDate, tomorrow)
      ))
      .orderBy(asc(reservations.arrivalDate));
  }

  async getDeparturesToday(propertyId: string): Promise<Reservation[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.select().from(reservations)
      .where(and(
        eq(reservations.propertyId, propertyId),
        gte(reservations.departureDate, today),
        lte(reservations.departureDate, tomorrow)
      ))
      .orderBy(asc(reservations.departureDate));
  }

  async createReservation(reservation: InsertReservation): Promise<Reservation> {
    // Generate confirmation number
    const confirmationNumber = `RES-${Date.now()}`;
    const result = await db.insert(reservations).values({
      ...reservation,
      confirmationNumber
    }).returning();
    return result[0];
  }

  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation> {
    const result = await db.update(reservations).set({
      ...reservation,
      updatedAt: new Date()
    }).where(eq(reservations.id, id)).returning();
    return result[0];
  }

  // Folio Management
  async getFolio(id: string): Promise<Folio | undefined> {
    const result = await db.select().from(folios).where(eq(folios.id, id)).limit(1);
    return result[0];
  }

  async getFolioByReservation(reservationId: string): Promise<Folio | undefined> {
    const result = await db.select().from(folios)
      .where(eq(folios.reservationId, reservationId)).limit(1);
    return result[0];
  }

  async getFoliosByGuest(guestId: string): Promise<Folio[]> {
    return await db.select().from(folios)
      .where(eq(folios.guestId, guestId))
      .orderBy(desc(folios.createdAt));
  }

  async createFolio(folio: InsertFolio): Promise<Folio> {
    // Generate folio number
    const folioNumber = `F-${Date.now()}`;
    const result = await db.insert(folios).values({
      ...folio,
      folioNumber
    }).returning();
    return result[0];
  }

  async updateFolio(id: string, folio: Partial<InsertFolio>): Promise<Folio> {
    const result = await db.update(folios).set({
      ...folio,
      updatedAt: new Date()
    }).where(eq(folios.id, id)).returning();
    return result[0];
  }

  // Charge Management
  async getCharge(id: string): Promise<Charge | undefined> {
    const result = await db.select().from(charges).where(eq(charges.id, id)).limit(1);
    return result[0];
  }

  async getChargesByFolio(folioId: string): Promise<Charge[]> {
    return await db.select().from(charges)
      .where(and(eq(charges.folioId, folioId), eq(charges.isVoided, false)))
      .orderBy(desc(charges.chargeDate));
  }

  async createCharge(charge: InsertCharge): Promise<Charge> {
    const result = await db.insert(charges).values(charge).returning();
    return result[0];
  }

  async updateCharge(id: string, charge: Partial<InsertCharge>): Promise<Charge> {
    const result = await db.update(charges).set(charge).where(eq(charges.id, id)).returning();
    return result[0];
  }

  async voidCharge(id: string, voidReason: string, voidedBy: string): Promise<Charge> {
    const result = await db.update(charges).set({
      isVoided: true,
      voidReason,
      voidedBy,
      voidedAt: new Date()
    }).where(eq(charges.id, id)).returning();
    return result[0];
  }

  // Payment Management
  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }

  async getPaymentsByFolio(folioId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.folioId, folioId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment> {
    const result = await db.update(payments).set(payment).where(eq(payments.id, id)).returning();
    return result[0];
  }

  // Service Request Management
  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const result = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    return result[0];
  }

  async getServiceRequestsByProperty(propertyId: string): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests)
      .where(eq(serviceRequests.propertyId, propertyId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceRequestsByStatus(propertyId: string, status: string): Promise<ServiceRequest[]> {
    return await db.select().from(serviceRequests)
      .where(and(
        eq(serviceRequests.propertyId, propertyId),
        eq(serviceRequests.status, status as any)
      ))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const result = await db.insert(serviceRequests).values(request).returning();
    return result[0];
  }

  async updateServiceRequest(id: string, request: Partial<InsertServiceRequest>): Promise<ServiceRequest> {
    const result = await db.update(serviceRequests).set({
      ...request,
      updatedAt: new Date()
    }).where(eq(serviceRequests.id, id)).returning();
    return result[0];
  }

  // Housekeeping Management
  async getHousekeepingTask(id: string): Promise<HousekeepingTask | undefined> {
    const result = await db.select().from(housekeepingTasks).where(eq(housekeepingTasks.id, id)).limit(1);
    return result[0];
  }

  async getHousekeepingTasksByProperty(propertyId: string): Promise<HousekeepingTask[]> {
    return await db.select().from(housekeepingTasks)
      .where(eq(housekeepingTasks.propertyId, propertyId))
      .orderBy(desc(housekeepingTasks.createdAt));
  }

  async getHousekeepingTasksByAssignee(assignedTo: string): Promise<HousekeepingTask[]> {
    return await db.select().from(housekeepingTasks)
      .where(eq(housekeepingTasks.assignedTo, assignedTo))
      .orderBy(desc(housekeepingTasks.createdAt));
  }

  async createHousekeepingTask(task: InsertHousekeepingTask): Promise<HousekeepingTask> {
    const result = await db.insert(housekeepingTasks).values(task).returning();
    return result[0];
  }

  async updateHousekeepingTask(id: string, task: Partial<InsertHousekeepingTask>): Promise<HousekeepingTask> {
    const result = await db.update(housekeepingTasks).set({
      ...task,
      updatedAt: new Date()
    }).where(eq(housekeepingTasks.id, id)).returning();
    return result[0];
  }

  // Availability Management Implementation
  async checkAvailability(propertyId: string, roomTypeId: string, arrivalDate: Date, departureDate: Date): Promise<{
    available: boolean;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    restrictions: any[];
  }> {
    try {
      // Get total rooms for this room type
      const totalRoomsResult = await db.select({ count: sql<number>`count(*)` })
        .from(rooms)
        .where(and(
          eq(rooms.propertyId, propertyId),
          eq(rooms.roomTypeId, roomTypeId),
          eq(rooms.isActive, true)
        ));
      
      const totalRooms = totalRoomsResult[0]?.count || 0;

      // Check per-night availability (minimum availability across all nights)
      let minAvailableRooms = totalRooms;
      const currentDate = new Date(arrivalDate);
      
      while (currentDate < departureDate) {
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        
        // Count reservations that occupy this specific night
        const occupiedOnNightResult = await db.select({ count: sql<number>`count(*)` })
          .from(reservations)
          .where(and(
            eq(reservations.propertyId, propertyId),
            eq(reservations.roomTypeId, roomTypeId),
            // Reservation occupies this night if: arrival <= currentDate AND departure > currentDate
            sql`${reservations.arrivalDate} <= ${currentDate}`,
            sql`${reservations.departureDate} > ${currentDate}`,
            sql`${reservations.status} IN ('confirmed', 'checked_in')`
          ));

        const occupiedOnNight = occupiedOnNightResult[0]?.count || 0;
        const availableOnNight = totalRooms - occupiedOnNight;
        minAvailableRooms = Math.min(minAvailableRooms, availableOnNight);
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const availableRooms = minAvailableRooms;
      const occupiedRooms = totalRooms - availableRooms;

      // Check for daily rate restrictions
      const restrictions: any[] = [];
      
      // Normalize dates to midnight for proper comparison
      const normalizedArrival = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
      const normalizedDeparture = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());
      
      // Check restrictions for stayed nights [arrival, departure) and departure date
      const stayedNightsRates = await db.select()
        .from(dailyRates)
        .where(and(
          eq(dailyRates.propertyId, propertyId),
          eq(dailyRates.roomTypeId, roomTypeId),
          gte(dailyRates.date, normalizedArrival),
          lt(dailyRates.date, normalizedDeparture) // Stayed nights: [arrival, departure)
        ));

      // Check close-to-arrival on arrival date
      const arrivalDateRate = await db.select()
        .from(dailyRates)
        .where(and(
          eq(dailyRates.propertyId, propertyId),
          eq(dailyRates.roomTypeId, roomTypeId),
          eq(dailyRates.date, normalizedArrival)
        ))
        .limit(1);

      // Check close-to-departure on departure date
      const departureDateRate = await db.select()
        .from(dailyRates)
        .where(and(
          eq(dailyRates.propertyId, propertyId),
          eq(dailyRates.roomTypeId, roomTypeId),
          eq(dailyRates.date, normalizedDeparture)
        ))
        .limit(1);

      // Process restrictions for stayed nights (stop-sell only)
      for (const rate of stayedNightsRates) {
        if (rate.stopSell) {
          restrictions.push({ type: 'stop_sell', date: rate.date });
        }
      }

      // Check close-to-arrival on arrival date
      if (arrivalDateRate[0]?.closeToArrival) {
        restrictions.push({ type: 'close_to_arrival', date: arrivalDateRate[0].date });
      }

      // Check close-to-departure on departure date
      if (departureDateRate[0]?.closeToDeparture) {
        restrictions.push({ type: 'close_to_departure', date: departureDateRate[0].date });
      }

      const hasBlockingRestrictions = restrictions.some(r => 
        r.type === 'stop_sell' || 
        r.type === 'close_to_arrival' || 
        r.type === 'close_to_departure'
      );
      
      const available = availableRooms > 0 && !hasBlockingRestrictions;

      return {
        available,
        totalRooms,
        occupiedRooms,
        availableRooms,
        restrictions
      };
    } catch (error) {
      console.error("Check availability error:", error);
      throw error;
    }
  }

  async getRoomTypeAvailability(propertyId: string, roomTypeId: string, fromDate: Date, toDate: Date): Promise<{
    date: Date;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    closeToArrival: boolean;
    closeToDeparture: boolean;
    stopSell: boolean;
  }[]> {
    try {
      // Get total rooms for this room type
      const totalRoomsResult = await db.select({ count: sql<number>`count(*)` })
        .from(rooms)
        .where(and(
          eq(rooms.propertyId, propertyId),
          eq(rooms.roomTypeId, roomTypeId),
          eq(rooms.isActive, true)
        ));
      
      const totalRooms = totalRoomsResult[0]?.count || 0;
      const results: any[] = [];

      // Iterate through each date
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);

        // Get occupied rooms for this specific date
        const occupiedRoomsResult = await db.select({ count: sql<number>`count(*)` })
          .from(reservations)
          .where(and(
            eq(reservations.propertyId, propertyId),
            eq(reservations.roomTypeId, roomTypeId),
            sql`${reservations.arrivalDate} <= ${currentDate}`,
            sql`${reservations.departureDate} > ${currentDate}`,
            sql`${reservations.status} IN ('confirmed', 'checked_in')`
          ));

        const occupiedRooms = occupiedRoomsResult[0]?.count || 0;

        // Get daily rate restrictions
        const dailyRate = await db.select()
          .from(dailyRates)
          .where(and(
            eq(dailyRates.propertyId, propertyId),
            eq(dailyRates.roomTypeId, roomTypeId),
            eq(dailyRates.date, currentDate)
          ))
          .limit(1);

        const rate = dailyRate[0];

        results.push({
          date: new Date(currentDate),
          totalRooms,
          occupiedRooms,
          availableRooms: totalRooms - occupiedRooms,
          closeToArrival: rate?.closeToArrival || false,
          closeToDeparture: rate?.closeToDeparture || false,
          stopSell: rate?.stopSell || false
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return results;
    } catch (error) {
      console.error("Get room type availability error:", error);
      throw error;
    }
  }

  async calculateBestRate(propertyId: string, roomTypeId: string, arrivalDate: Date, departureDate: Date, lengthOfStay: number): Promise<{
    ratePlan: RatePlan;
    dailyRates: DailyRate[];
    totalAmount: number;
    averageNightlyRate: number;
  } | null> {
    try {
      // Get active rate plans for this property that satisfy length of stay restrictions
      const availableRatePlans = await db.select()
        .from(ratePlans)
        .where(and(
          eq(ratePlans.propertyId, propertyId),
          eq(ratePlans.isActive, true),
          or(
            sql`${ratePlans.minLengthOfStay} IS NULL`,
            lte(ratePlans.minLengthOfStay, lengthOfStay)
          ),
          or(
            sql`${ratePlans.maxLengthOfStay} IS NULL`,
            gte(ratePlans.maxLengthOfStay, lengthOfStay)
          )
        ));

      let bestOffer: any = null;
      let lowestTotal = Infinity;

      for (const ratePlan of availableRatePlans) {
        // Get daily rates for this rate plan and date range
        const dailyRatesForPlan = await db.select()
          .from(dailyRates)
          .where(and(
            eq(dailyRates.propertyId, propertyId),
            eq(dailyRates.roomTypeId, roomTypeId),
            eq(dailyRates.ratePlanId, ratePlan.id),
            gte(dailyRates.date, arrivalDate),
            lt(dailyRates.date, departureDate)
          ))
          .orderBy(asc(dailyRates.date));

        // Check if we have rates for all dates
        if (dailyRatesForPlan.length !== lengthOfStay) {
          continue; // Skip this rate plan if not all dates have rates
        }

        // Check for stop-sell restrictions
        const hasStopSell = dailyRatesForPlan.some(rate => rate.stopSell);
        if (hasStopSell) {
          continue; // Skip this rate plan if any date has stop-sell
        }

        // Calculate total amount
        const totalAmount = dailyRatesForPlan.reduce((sum, rate) => {
          return sum + parseFloat(rate.rate);
        }, 0);

        if (totalAmount < lowestTotal) {
          lowestTotal = totalAmount;
          bestOffer = {
            ratePlan,
            dailyRates: dailyRatesForPlan,
            totalAmount,
            averageNightlyRate: totalAmount / lengthOfStay
          };
        }
      }

      return bestOffer;
    } catch (error) {
      console.error("Calculate best rate error:", error);
      throw error;
    }
  }

  // Transactional reservation creation with availability validation
  async createReservationWithValidation(reservation: InsertReservation, validateAvailability: boolean = true): Promise<{
    success: boolean;
    reservation?: Reservation;
    error?: string;
    availability?: any;
  }> {
    try {
      return await db.transaction(async (tx) => {
        if (validateAvailability) {
          // Check availability within the transaction
          const arrivalDate = new Date(reservation.arrivalDate);
          const departureDate = new Date(reservation.departureDate);
          
          // Get total rooms for this room type (with transaction context)
          const totalRoomsResult = await tx.select({ count: sql<number>`count(*)` })
            .from(rooms)
            .where(and(
              eq(rooms.propertyId, reservation.propertyId),
              eq(rooms.roomTypeId, reservation.roomTypeId),
              eq(rooms.isActive, true)
            ));
          
          const totalRooms = totalRoomsResult[0]?.count || 0;

          // Check per-night availability (minimum availability across all nights)
          let minAvailableRooms = totalRooms;
          const currentDate = new Date(arrivalDate);
          
          while (currentDate < departureDate) {
            // Count reservations that occupy this specific night (with transaction context)
            const occupiedOnNightResult = await tx.select({ count: sql<number>`count(*)` })
              .from(reservations)
              .where(and(
                eq(reservations.propertyId, reservation.propertyId),
                eq(reservations.roomTypeId, reservation.roomTypeId),
                // Reservation occupies this night if: arrival <= currentDate AND departure > currentDate
                sql`${reservations.arrivalDate} <= ${currentDate}`,
                sql`${reservations.departureDate} > ${currentDate}`,
                sql`${reservations.status} IN ('confirmed', 'checked_in')`
              ));

            const occupiedOnNight = occupiedOnNightResult[0]?.count || 0;
            const availableOnNight = totalRooms - occupiedOnNight;
            minAvailableRooms = Math.min(minAvailableRooms, availableOnNight);
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          const availableRooms = minAvailableRooms;

          if (availableRooms <= 0) {
            return {
              success: false,
              error: "No rooms available for the selected dates",
              availability: { available: false, totalRooms, availableRooms }
            };
          }

          // Check for rate restrictions within transaction
          const normalizedArrival = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
          const normalizedDeparture = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());
          
          // Check restrictions with proper boundary logic
          const stayedNightsRates = await tx.select()
            .from(dailyRates)
            .where(and(
              eq(dailyRates.propertyId, reservation.propertyId),
              eq(dailyRates.roomTypeId, reservation.roomTypeId),
              gte(dailyRates.date, normalizedArrival),
              lt(dailyRates.date, normalizedDeparture) // Stayed nights: [arrival, departure)
            ));

          // Check close-to-arrival on arrival date
          const arrivalDateRate = await tx.select()
            .from(dailyRates)
            .where(and(
              eq(dailyRates.propertyId, reservation.propertyId),
              eq(dailyRates.roomTypeId, reservation.roomTypeId),
              eq(dailyRates.date, normalizedArrival)
            ))
            .limit(1);

          // Check close-to-departure on departure date
          const departureDateRate = await tx.select()
            .from(dailyRates)
            .where(and(
              eq(dailyRates.propertyId, reservation.propertyId),
              eq(dailyRates.roomTypeId, reservation.roomTypeId),
              eq(dailyRates.date, normalizedDeparture)
            ))
            .limit(1);

          const hasBlockingRestrictions = 
            stayedNightsRates.some(rate => rate.stopSell) ||
            arrivalDateRate[0]?.closeToArrival ||
            departureDateRate[0]?.closeToDeparture;

          if (hasBlockingRestrictions) {
            return {
              success: false,
              error: "Selected dates have booking restrictions",
              availability: { available: false, availableRooms: 0 }
            };
          }
        }

        // Create the reservation within the same transaction
        const confirmationNumber = `RES-${Date.now()}`;
        const result = await tx.insert(reservations).values({
          ...reservation,
          confirmationNumber
        }).returning();

        return {
          success: true,
          reservation: result[0]
        };
      });
    } catch (error) {
      console.error("Transactional reservation creation error:", error);
      return {
        success: false,
        error: "Database transaction failed"
      };
    }
  }
}

export const hmsStorage = new DatabaseStorage();