import { eq, and, desc, asc, gte, lte, lt, gt, or, sql, isNull, isNotNull, inArray } from "drizzle-orm";
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
  type DailyMetric,
  type InsertDailyMetric,
  type GuestSatisfaction,
  type InsertGuestSatisfaction,
  type ReportDefinition,
  type InsertReportDefinition,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
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
  dailyRates,
  dailyMetrics,
  guestSatisfaction,
  reportDefinitions,
  analyticsEvents
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
  
  // Daily Metrics & Analytics
  getDailyMetric(propertyId: string, date: Date): Promise<DailyMetric | undefined>;
  getDailyMetrics(propertyId: string, fromDate: Date, toDate: Date): Promise<DailyMetric[]>;
  createOrUpdateDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric>;
  calculateDailyMetrics(propertyId: string, date: Date): Promise<DailyMetric>;
  
  // Guest Satisfaction
  getGuestSatisfaction(id: string, propertyId?: string): Promise<GuestSatisfaction | undefined>;
  getGuestSatisfactionByProperty(propertyId: string, fromDate?: Date, toDate?: Date): Promise<GuestSatisfaction[]>;
  getGuestSatisfactionByReservation(reservationId: string): Promise<GuestSatisfaction | undefined>;
  createGuestSatisfaction(satisfaction: InsertGuestSatisfaction): Promise<GuestSatisfaction>;
  getAverageRatings(propertyId: string, fromDate?: Date, toDate?: Date): Promise<{
    overallRating: number;
    roomRating: number;
    serviceRating: number;
    cleanlinessRating: number;
    valueRating: number;
    locationRating: number;
    recommendationRate: number;
    totalResponses: number;
  }>;
  
  // Report Management
  getReportDefinition(id: string, propertyId?: string): Promise<ReportDefinition | undefined>;
  getReportDefinitions(propertyId: string, type?: string): Promise<ReportDefinition[]>;
  createReportDefinition(report: InsertReportDefinition): Promise<ReportDefinition>;
  updateReportDefinition(id: string, report: Partial<InsertReportDefinition>, propertyId?: string): Promise<ReportDefinition>;
  deleteReportDefinition(id: string, propertyId?: string): Promise<boolean>;
  
  // Analytics Events
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAnalyticsEvents(propertyId: string, fromDate?: Date, toDate?: Date, eventCategory?: string): Promise<AnalyticsEvent[]>;
  
  // Comprehensive Reporting Methods
  getOccupancyReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    date: Date;
    occupancyRate: number;
    totalRooms: number;
    occupiedRooms: number;
    adr: number;
    revpar: number;
    totalRevenue: number;
  }[]>;
  
  getRevenueReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalRevenue: number;
    roomRevenue: number;
    otherRevenue: number;
    avgDailyRate: number;
    revpar: number;
    totalNights: number;
    totalGuests: number;
  }>;
  
  getHousekeepingReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalTasks: number;
    completedTasks: number;
    avgCompletionTime: number;
    tasksByStatus: Record<string, number>;
    tasksByType: Record<string, number>;
    staffPerformance: {
      staffId: string;
      staffName: string;
      tasksCompleted: number;
      avgCompletionTime: number;
    }[];
  }>;
  
  getGuestAnalytics(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalGuests: number;
    newGuests: number;
    returningGuests: number;
    vipGuests: number;
    avgLengthOfStay: number;
    topSourceMarkets: { source: string; count: number }[];
    guestSatisfactionSummary: {
      avgOverallRating: number;
      totalSurveys: number;
      recommendationRate: number;
    };
  }>;
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

  // Daily Metrics & Analytics Implementation
  async getDailyMetric(propertyId: string, date: Date): Promise<DailyMetric | undefined> {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const result = await db.select().from(dailyMetrics)
      .where(and(
        eq(dailyMetrics.propertyId, propertyId),
        eq(dailyMetrics.metricDate, normalizedDate)
      )).limit(1);
    return result[0];
  }

  async getDailyMetrics(propertyId: string, fromDate: Date, toDate: Date): Promise<DailyMetric[]> {
    return await db.select().from(dailyMetrics)
      .where(and(
        eq(dailyMetrics.propertyId, propertyId),
        gte(dailyMetrics.metricDate, fromDate),
        lte(dailyMetrics.metricDate, toDate)
      ))
      .orderBy(desc(dailyMetrics.metricDate));
  }

  async createOrUpdateDailyMetric(metric: InsertDailyMetric): Promise<DailyMetric> {
    const normalizedDate = new Date(metric.metricDate.getFullYear(), metric.metricDate.getMonth(), metric.metricDate.getDate());
    
    // Try to find existing metric for this date
    const existing = await this.getDailyMetric(metric.propertyId, normalizedDate);
    
    if (existing) {
      // Update existing metric
      const result = await db.update(dailyMetrics).set({
        ...metric,
        metricDate: normalizedDate,
        updatedAt: new Date()
      }).where(eq(dailyMetrics.id, existing.id)).returning();
      return result[0];
    } else {
      // Create new metric
      const result = await db.insert(dailyMetrics).values({
        ...metric,
        metricDate: normalizedDate
      }).returning();
      return result[0];
    }
  }

  async calculateDailyMetrics(propertyId: string, date: Date): Promise<DailyMetric> {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nextDay = new Date(normalizedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get total rooms for the property
    const totalRoomsResult = await db.select({ count: sql<number>`count(*)` })
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.isActive, true)));
    const totalRooms = totalRoomsResult[0]?.count || 0;

    // Get occupied rooms for the date (check-in overlapping with the date)
    const occupiedRoomsResult = await db.select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(and(
        eq(reservations.propertyId, propertyId),
        or(
          eq(reservations.status, 'checked_in'),
          eq(reservations.status, 'confirmed')
        ),
        lte(reservations.arrivalDate, normalizedDate),
        gt(reservations.departureDate, normalizedDate)
      ));
    const occupiedRooms = occupiedRoomsResult[0]?.count || 0;

    // Get out of order rooms
    const outOfOrderRoomsResult = await db.select({ count: sql<number>`count(*)` })
      .from(rooms)
      .where(and(
        eq(rooms.propertyId, propertyId),
        eq(rooms.status, 'out_of_order'),
        eq(rooms.isActive, true)
      ));
    const outOfOrderRooms = outOfOrderRoomsResult[0]?.count || 0;

    const availableRooms = totalRooms - occupiedRooms - outOfOrderRooms;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Get daily revenue from charges
    const revenueResult = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(${charges.totalAmount}), 0)`,
      roomRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${charges.chargeCode} = 'ROOM' THEN ${charges.totalAmount} ELSE 0 END), 0)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .innerJoin(reservations, eq(folios.reservationId, reservations.id))
    .where(and(
      eq(reservations.propertyId, propertyId),
      gte(charges.chargeDate, normalizedDate),
      lt(charges.chargeDate, nextDay),
      eq(charges.isVoided, false)
    ));

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const roomRevenue = Number(revenueResult[0]?.roomRevenue || 0);
    const adr = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0;
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

    // Get guest counts
    const guestResult = await db.select({
      totalGuests: sql<number>`COALESCE(SUM(${reservations.adults} + ${reservations.children}), 0)`,
      walkIns: sql<number>`COALESCE(SUM(CASE WHEN ${reservations.source} = 'walk_in' THEN 1 ELSE 0 END), 0)`,
      noShows: sql<number>`COALESCE(SUM(CASE WHEN ${reservations.status} = 'no_show' THEN 1 ELSE 0 END), 0)`,
      cancellations: sql<number>`COALESCE(SUM(CASE WHEN ${reservations.status} = 'cancelled' THEN 1 ELSE 0 END), 0)`
    })
    .from(reservations)
    .where(and(
      eq(reservations.propertyId, propertyId),
      eq(reservations.arrivalDate, normalizedDate)
    ));

    const totalGuests = Number(guestResult[0]?.totalGuests || 0);
    const walkIns = Number(guestResult[0]?.walkIns || 0);
    const noShows = Number(guestResult[0]?.noShows || 0);
    const cancellations = Number(guestResult[0]?.cancellations || 0);

    // Calculate average length of stay
    const avgLengthResult = await db.select({
      avgLength: sql<number>`COALESCE(AVG(${reservations.nights}), 0)`
    })
    .from(reservations)
    .where(and(
      eq(reservations.propertyId, propertyId),
      eq(reservations.arrivalDate, normalizedDate),
      or(
        eq(reservations.status, 'checked_in'),
        eq(reservations.status, 'checked_out')
      )
    ));

    const avgLengthOfStay = Number(avgLengthResult[0]?.avgLength || 0);

    const metricData: InsertDailyMetric = {
      propertyId,
      metricDate: normalizedDate,
      totalRooms,
      occupiedRooms,
      availableRooms,
      outOfOrderRooms,
      occupancyRate: occupancyRate.toFixed(2),
      adr: adr.toFixed(2),
      revpar: revpar.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      roomRevenue: roomRevenue.toFixed(2),
      totalGuests,
      walkIns,
      noShows,
      cancellations,
      avgLengthOfStay: avgLengthOfStay.toFixed(2)
    };

    return await this.createOrUpdateDailyMetric(metricData);
  }

  // Guest Satisfaction Implementation
  async getGuestSatisfaction(id: string, propertyId?: string): Promise<GuestSatisfaction | undefined> {
    const conditions = [eq(guestSatisfaction.id, id)];
    if (propertyId) {
      conditions.push(eq(guestSatisfaction.propertyId, propertyId));
    }
    const result = await db.select().from(guestSatisfaction).where(and(...conditions)).limit(1);
    return result[0];
  }

  async getGuestSatisfactionByProperty(propertyId: string, fromDate?: Date, toDate?: Date): Promise<GuestSatisfaction[]> {
    const conditions = [eq(guestSatisfaction.propertyId, propertyId)];
    
    if (fromDate && toDate) {
      conditions.push(
        gte(guestSatisfaction.surveyDate, fromDate),
        lte(guestSatisfaction.surveyDate, toDate)
      );
    }
    
    return await db.select().from(guestSatisfaction)
      .where(and(...conditions))
      .orderBy(desc(guestSatisfaction.surveyDate));
  }

  async getGuestSatisfactionByReservation(reservationId: string): Promise<GuestSatisfaction | undefined> {
    const result = await db.select().from(guestSatisfaction)
      .where(eq(guestSatisfaction.reservationId, reservationId))
      .limit(1);
    return result[0];
  }

  async createGuestSatisfaction(satisfaction: InsertGuestSatisfaction): Promise<GuestSatisfaction> {
    const result = await db.insert(guestSatisfaction).values(satisfaction).returning();
    return result[0];
  }

  async getAverageRatings(propertyId: string, fromDate?: Date, toDate?: Date): Promise<{
    overallRating: number;
    roomRating: number;
    serviceRating: number;
    cleanlinessRating: number;
    valueRating: number;
    locationRating: number;
    recommendationRate: number;
    totalResponses: number;
  }> {
    const conditions = [eq(guestSatisfaction.propertyId, propertyId)];
    
    if (fromDate && toDate) {
      conditions.push(
        gte(guestSatisfaction.surveyDate, fromDate),
        lte(guestSatisfaction.surveyDate, toDate)
      );
    }

    const result = await db.select({
      overallRating: sql<number>`COALESCE(AVG(${guestSatisfaction.overallRating}), 0)`,
      roomRating: sql<number>`COALESCE(AVG(${guestSatisfaction.roomRating}), 0)`,
      serviceRating: sql<number>`COALESCE(AVG(${guestSatisfaction.serviceRating}), 0)`,
      cleanlinessRating: sql<number>`COALESCE(AVG(${guestSatisfaction.cleanlinessRating}), 0)`,
      valueRating: sql<number>`COALESCE(AVG(${guestSatisfaction.valueRating}), 0)`,
      locationRating: sql<number>`COALESCE(AVG(${guestSatisfaction.locationRating}), 0)`,
      recommendationRate: sql<number>`COALESCE(AVG(CASE WHEN ${guestSatisfaction.recommendToFriend} = true THEN 100.0 ELSE 0.0 END), 0)`,
      totalResponses: sql<number>`COUNT(*)`
    })
    .from(guestSatisfaction)
    .where(and(...conditions));

    const ratings = result[0];
    return {
      overallRating: Number(ratings?.overallRating || 0),
      roomRating: Number(ratings?.roomRating || 0),
      serviceRating: Number(ratings?.serviceRating || 0),
      cleanlinessRating: Number(ratings?.cleanlinessRating || 0),
      valueRating: Number(ratings?.valueRating || 0),
      locationRating: Number(ratings?.locationRating || 0),
      recommendationRate: Number(ratings?.recommendationRate || 0),
      totalResponses: Number(ratings?.totalResponses || 0)
    };
  }

  // Report Management Implementation
  async getReportDefinition(id: string, propertyId?: string): Promise<ReportDefinition | undefined> {
    const conditions = [eq(reportDefinitions.id, id)];
    if (propertyId) {
      conditions.push(eq(reportDefinitions.propertyId, propertyId));
    }
    const result = await db.select().from(reportDefinitions).where(and(...conditions)).limit(1);
    return result[0];
  }

  async getReportDefinitions(propertyId: string, type?: string): Promise<ReportDefinition[]> {
    let whereClause = and(eq(reportDefinitions.propertyId, propertyId), eq(reportDefinitions.isActive, true));
    
    if (type) {
      whereClause = and(whereClause, eq(reportDefinitions.type, type as any));
    }

    return await db.select().from(reportDefinitions)
      .where(whereClause)
      .orderBy(desc(reportDefinitions.createdAt));
  }

  async createReportDefinition(report: InsertReportDefinition): Promise<ReportDefinition> {
    const result = await db.insert(reportDefinitions).values(report).returning();
    return result[0];
  }

  async updateReportDefinition(id: string, report: Partial<InsertReportDefinition>, propertyId?: string): Promise<ReportDefinition> {
    const conditions = [eq(reportDefinitions.id, id)];
    if (propertyId) {
      conditions.push(eq(reportDefinitions.propertyId, propertyId));
    }
    const result = await db.update(reportDefinitions).set({
      ...report,
      updatedAt: new Date()
    }).where(and(...conditions)).returning();
    return result[0];
  }

  async deleteReportDefinition(id: string, propertyId?: string): Promise<boolean> {
    const conditions = [eq(reportDefinitions.id, id)];
    if (propertyId) {
      conditions.push(eq(reportDefinitions.propertyId, propertyId));
    }
    const result = await db.update(reportDefinitions).set({
      isActive: false,
      updatedAt: new Date()
    }).where(and(...conditions)).returning();
    return result.length > 0;
  }

  // Analytics Events Implementation
  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const result = await db.insert(analyticsEvents).values(event).returning();
    return result[0];
  }

  async getAnalyticsEvents(propertyId: string, fromDate?: Date, toDate?: Date, eventCategory?: string): Promise<AnalyticsEvent[]> {
    const conditions = [eq(analyticsEvents.propertyId, propertyId)];
    
    if (fromDate && toDate) {
      conditions.push(
        gte(analyticsEvents.timestamp, fromDate),
        lte(analyticsEvents.timestamp, toDate)
      );
    }
    
    if (eventCategory) {
      conditions.push(eq(analyticsEvents.eventCategory, eventCategory));
    }

    return await db.select().from(analyticsEvents)
      .where(and(...conditions))
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(1000); // Limit for performance
  }

  // Comprehensive Reporting Methods Implementation
  async getOccupancyReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    date: Date;
    occupancyRate: number;
    totalRooms: number;
    occupiedRooms: number;
    adr: number;
    revpar: number;
    totalRevenue: number;
  }[]> {
    return await db.select({
      date: dailyMetrics.metricDate,
      occupancyRate: sql<number>`CAST(${dailyMetrics.occupancyRate} AS DECIMAL)`,
      totalRooms: dailyMetrics.totalRooms,
      occupiedRooms: dailyMetrics.occupiedRooms,
      adr: sql<number>`CAST(${dailyMetrics.adr} AS DECIMAL)`,
      revpar: sql<number>`CAST(${dailyMetrics.revpar} AS DECIMAL)`,
      totalRevenue: sql<number>`CAST(${dailyMetrics.totalRevenue} AS DECIMAL)`
    })
    .from(dailyMetrics)
    .where(and(
      eq(dailyMetrics.propertyId, propertyId),
      gte(dailyMetrics.metricDate, fromDate),
      lte(dailyMetrics.metricDate, toDate)
    ))
    .orderBy(asc(dailyMetrics.metricDate));
  }

  async getRevenueReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalRevenue: number;
    roomRevenue: number;
    otherRevenue: number;
    avgDailyRate: number;
    revpar: number;
    totalNights: number;
    totalGuests: number;
  }> {
    const result = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${dailyMetrics.totalRevenue} AS DECIMAL)), 0)`,
      roomRevenue: sql<number>`COALESCE(SUM(CAST(${dailyMetrics.roomRevenue} AS DECIMAL)), 0)`,
      avgDailyRate: sql<number>`COALESCE(AVG(CAST(${dailyMetrics.adr} AS DECIMAL)), 0)`,
      revpar: sql<number>`COALESCE(AVG(CAST(${dailyMetrics.revpar} AS DECIMAL)), 0)`,
      totalNights: sql<number>`COALESCE(SUM(${dailyMetrics.occupiedRooms}), 0)`,
      totalGuests: sql<number>`COALESCE(SUM(${dailyMetrics.totalGuests}), 0)`
    })
    .from(dailyMetrics)
    .where(and(
      eq(dailyMetrics.propertyId, propertyId),
      gte(dailyMetrics.metricDate, fromDate),
      lte(dailyMetrics.metricDate, toDate)
    ));

    const data = result[0];
    const totalRevenue = Number(data?.totalRevenue || 0);
    const roomRevenue = Number(data?.roomRevenue || 0);
    
    return {
      totalRevenue,
      roomRevenue,
      otherRevenue: totalRevenue - roomRevenue,
      avgDailyRate: Number(data?.avgDailyRate || 0),
      revpar: Number(data?.revpar || 0),
      totalNights: Number(data?.totalNights || 0),
      totalGuests: Number(data?.totalGuests || 0)
    };
  }

  async getHousekeepingReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalTasks: number;
    completedTasks: number;
    avgCompletionTime: number;
    tasksByStatus: Record<string, number>;
    tasksByType: Record<string, number>;
    staffPerformance: {
      staffId: string;
      staffName: string;
      tasksCompleted: number;
      avgCompletionTime: number;
    }[];
  }> {
    // Get basic task statistics
    const taskStats = await db.select({
      totalTasks: sql<number>`COUNT(*)`,
      completedTasks: sql<number>`SUM(CASE WHEN ${housekeepingTasks.status} IN ('completed', 'inspected') THEN 1 ELSE 0 END)`,
      avgCompletionTime: sql<number>`
        COALESCE(
          AVG(
            CASE 
              WHEN ${housekeepingTasks.completedAt} IS NOT NULL AND ${housekeepingTasks.startedAt} IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (${housekeepingTasks.completedAt} - ${housekeepingTasks.startedAt})) / 60 
              ELSE NULL 
            END
          ), 
          0
        )
      `
    })
    .from(housekeepingTasks)
    .where(and(
      eq(housekeepingTasks.propertyId, propertyId),
      gte(housekeepingTasks.createdAt, fromDate),
      lte(housekeepingTasks.createdAt, toDate)
    ));

    // Get tasks by status
    const statusStats = await db.select({
      status: housekeepingTasks.status,
      count: sql<number>`COUNT(*)`
    })
    .from(housekeepingTasks)
    .where(and(
      eq(housekeepingTasks.propertyId, propertyId),
      gte(housekeepingTasks.createdAt, fromDate),
      lte(housekeepingTasks.createdAt, toDate)
    ))
    .groupBy(housekeepingTasks.status);

    // Get tasks by type
    const typeStats = await db.select({
      taskType: housekeepingTasks.taskType,
      count: sql<number>`COUNT(*)`
    })
    .from(housekeepingTasks)
    .where(and(
      eq(housekeepingTasks.propertyId, propertyId),
      gte(housekeepingTasks.createdAt, fromDate),
      lte(housekeepingTasks.createdAt, toDate)
    ))
    .groupBy(housekeepingTasks.taskType);

    // Get staff performance
    const staffPerformance = await db.select({
      staffId: housekeepingTasks.assignedTo,
      staffName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unassigned')`,
      tasksCompleted: sql<number>`COUNT(*)`,
      avgCompletionTime: sql<number>`
        COALESCE(
          AVG(
            CASE 
              WHEN ${housekeepingTasks.completedAt} IS NOT NULL AND ${housekeepingTasks.startedAt} IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (${housekeepingTasks.completedAt} - ${housekeepingTasks.startedAt})) / 60 
              ELSE NULL 
            END
          ), 
          0
        )
      `
    })
    .from(housekeepingTasks)
    .leftJoin(users, eq(housekeepingTasks.assignedTo, users.id))
    .where(and(
      eq(housekeepingTasks.propertyId, propertyId),
      gte(housekeepingTasks.createdAt, fromDate),
      lte(housekeepingTasks.createdAt, toDate),
      or(
        eq(housekeepingTasks.status, 'completed'),
        eq(housekeepingTasks.status, 'inspected')
      )
    ))
    .groupBy(housekeepingTasks.assignedTo, users.firstName, users.lastName)
    .orderBy(desc(sql`tasksCompleted`));

    const tasksByStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      tasksByStatus[stat.status] = Number(stat.count);
    });

    const tasksByType: Record<string, number> = {};
    typeStats.forEach(stat => {
      tasksByType[stat.taskType] = Number(stat.count);
    });

    return {
      totalTasks: Number(taskStats[0]?.totalTasks || 0),
      completedTasks: Number(taskStats[0]?.completedTasks || 0),
      avgCompletionTime: Number(taskStats[0]?.avgCompletionTime || 0),
      tasksByStatus,
      tasksByType,
      staffPerformance: staffPerformance.map(staff => ({
        staffId: staff.staffId || '',
        staffName: staff.staffName || 'Unassigned',
        tasksCompleted: Number(staff.tasksCompleted),
        avgCompletionTime: Number(staff.avgCompletionTime)
      }))
    };
  }

  async getGuestAnalytics(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalGuests: number;
    newGuests: number;
    returningGuests: number;
    vipGuests: number;
    avgLengthOfStay: number;
    topSourceMarkets: { source: string; count: number }[];
    guestSatisfactionSummary: {
      avgOverallRating: number;
      totalSurveys: number;
      recommendationRate: number;
    };
  }> {
    // Get basic guest statistics
    const guestStats = await db.select({
      totalGuests: sql<number>`COUNT(DISTINCT ${reservations.guestId})`,
      avgLengthOfStay: sql<number>`COALESCE(AVG(${reservations.nights}), 0)`
    })
    .from(reservations)
    .where(and(
      eq(reservations.propertyId, propertyId),
      gte(reservations.arrivalDate, fromDate),
      lte(reservations.arrivalDate, toDate)
    ));

    // Get new vs returning guests
    const newReturnStats = await db.select({
      newGuests: sql<number>`
        COUNT(DISTINCT CASE 
          WHEN (
            SELECT COUNT(*) 
            FROM ${reservations} r2 
            WHERE r2.guest_id = ${reservations.guestId} 
            AND r2.arrival_date < ${reservations.arrivalDate}
          ) = 0 
          THEN ${reservations.guestId} 
        END)
      `,
      returningGuests: sql<number>`
        COUNT(DISTINCT CASE 
          WHEN (
            SELECT COUNT(*) 
            FROM ${reservations} r2 
            WHERE r2.guest_id = ${reservations.guestId} 
            AND r2.arrival_date < ${reservations.arrivalDate}
          ) > 0 
          THEN ${reservations.guestId} 
        END)
      `
    })
    .from(reservations)
    .where(and(
      eq(reservations.propertyId, propertyId),
      gte(reservations.arrivalDate, fromDate),
      lte(reservations.arrivalDate, toDate)
    ));

    // Get VIP guests count
    const vipStats = await db.select({
      vipGuests: sql<number>`COUNT(DISTINCT ${guests.id})`
    })
    .from(reservations)
    .innerJoin(guests, eq(reservations.guestId, guests.id))
    .where(and(
      eq(reservations.propertyId, propertyId),
      eq(guests.vipStatus, true),
      gte(reservations.arrivalDate, fromDate),
      lte(reservations.arrivalDate, toDate)
    ));

    // Get top source markets
    const sourceMarkets = await db.select({
      source: reservations.source,
      count: sql<number>`COUNT(*)`
    })
    .from(reservations)
    .where(and(
      eq(reservations.propertyId, propertyId),
      gte(reservations.arrivalDate, fromDate),
      lte(reservations.arrivalDate, toDate)
    ))
    .groupBy(reservations.source)
    .orderBy(desc(sql`count`))
    .limit(5);

    // Get guest satisfaction summary
    const satisfactionSummary = await db.select({
      avgOverallRating: sql<number>`COALESCE(AVG(${guestSatisfaction.overallRating}), 0)`,
      totalSurveys: sql<number>`COUNT(*)`,
      recommendationRate: sql<number>`COALESCE(AVG(CASE WHEN ${guestSatisfaction.recommendToFriend} = true THEN 100.0 ELSE 0.0 END), 0)`
    })
    .from(guestSatisfaction)
    .where(and(
      eq(guestSatisfaction.propertyId, propertyId),
      gte(guestSatisfaction.surveyDate, fromDate),
      lte(guestSatisfaction.surveyDate, toDate)
    ));

    return {
      totalGuests: Number(guestStats[0]?.totalGuests || 0),
      newGuests: Number(newReturnStats[0]?.newGuests || 0),
      returningGuests: Number(newReturnStats[0]?.returningGuests || 0),
      vipGuests: Number(vipStats[0]?.vipGuests || 0),
      avgLengthOfStay: Number(guestStats[0]?.avgLengthOfStay || 0),
      topSourceMarkets: sourceMarkets.map(market => ({
        source: market.source,
        count: Number(market.count)
      })),
      guestSatisfactionSummary: {
        avgOverallRating: Number(satisfactionSummary[0]?.avgOverallRating || 0),
        totalSurveys: Number(satisfactionSummary[0]?.totalSurveys || 0),
        recommendationRate: Number(satisfactionSummary[0]?.recommendationRate || 0)
      }
    };
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

  // =====================================
  // FINANCIAL REPORTING METHODS
  // =====================================

  // Get Folio Summary Report
  async getFolioSummaryReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalFolios: number;
    openFolios: number;
    closedFolios: number;
    totalCharges: number;
    totalPayments: number;
    outstandingBalance: number;
    avgFolioValue: number;
    foliosByStatus: Record<string, number>;
    paymentMethodBreakdown: Record<string, number>;
  }> {
    // Get folios that have charges or payments within the date range for consistency with detailed reports
    const foliosWithActivity = await db.selectDistinct({
      folioId: folios.id
    })
    .from(folios)
    .leftJoin(charges, eq(charges.folioId, folios.id))
    .leftJoin(payments, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      or(
        and(gte(charges.postingDate, fromDate), lte(charges.postingDate, toDate)),
        and(gte(payments.createdAt, fromDate), lte(payments.createdAt, toDate))
      )
    ));

    const activeFolioIds = foliosWithActivity.map(f => f.folioId);
    
    // Get folio statistics for folios with activity in date range
    const folioStats = activeFolioIds.length > 0 ? await db.select({
      totalFolios: sql<number>`COUNT(*)`,
      openFolios: sql<number>`SUM(CASE WHEN ${folios.status} = 'open' THEN 1 ELSE 0 END)`,
      closedFolios: sql<number>`SUM(CASE WHEN ${folios.status} = 'closed' THEN 1 ELSE 0 END)`,
      totalCharges: sql<number>`COALESCE(SUM(CAST(${folios.totalCharges} AS DECIMAL)), 0)`,
      totalPayments: sql<number>`COALESCE(SUM(CAST(${folios.totalPayments} AS DECIMAL)), 0)`,
      outstandingBalance: sql<number>`COALESCE(SUM(CAST(${folios.balance} AS DECIMAL)), 0)`,
      avgFolioValue: sql<number>`COALESCE(AVG(CAST(${folios.totalCharges} AS DECIMAL)), 0)`
    })
    .from(folios)
    .where(and(
      eq(folios.propertyId, propertyId),
      inArray(folios.id, activeFolioIds)
    )) : [];

    // Get folios by status for folios with activity in date range
    const statusBreakdown = activeFolioIds.length > 0 ? await db.select({
      status: folios.status,
      count: sql<number>`COUNT(*)`
    })
    .from(folios)
    .where(and(
      eq(folios.propertyId, propertyId),
      inArray(folios.id, activeFolioIds)
    ))
    .groupBy(folios.status) : [];

    // Get payment method breakdown
    const paymentBreakdown = await db.select({
      paymentMethod: payments.paymentMethod,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'completed'),
      gte(payments.createdAt, fromDate),
      lte(payments.createdAt, toDate)
    ))
    .groupBy(payments.paymentMethod);

    const foliosByStatus: Record<string, number> = {};
    statusBreakdown.forEach(stat => {
      foliosByStatus[stat.status] = Number(stat.count);
    });

    const paymentMethodBreakdown: Record<string, number> = {};
    paymentBreakdown.forEach(stat => {
      paymentMethodBreakdown[stat.paymentMethod] = Number(stat.totalAmount);
    });

    const data = folioStats[0];
    return {
      totalFolios: Number(data?.totalFolios || 0),
      openFolios: Number(data?.openFolios || 0),
      closedFolios: Number(data?.closedFolios || 0),
      totalCharges: Number(data?.totalCharges || 0),
      totalPayments: Number(data?.totalPayments || 0),
      outstandingBalance: Number(data?.outstandingBalance || 0),
      avgFolioValue: Number(data?.avgFolioValue || 0),
      foliosByStatus,
      paymentMethodBreakdown
    };
  }

  // Get Charges Analysis Report
  async getChargesAnalysisReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalCharges: number;
    totalTaxes: number;
    chargesByCode: Record<string, { amount: number; count: number; description: string }>;
    dailyChargesTrend: { date: string; amount: number; count: number }[];
    voidedCharges: { amount: number; count: number; reasons: Record<string, number> };
  }> {
    // Get total charges and taxes
    const chargeSummary = await db.select({
      totalCharges: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS DECIMAL)), 0)`,
      totalTaxes: sql<number>`COALESCE(SUM(CAST(${charges.taxAmount} AS DECIMAL)), 0)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, false),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ));

    // Get charges by code
    const chargesByCodeData = await db.select({
      chargeCode: charges.chargeCode,
      description: charges.description,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, false),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ))
    .groupBy(charges.chargeCode, charges.description)
    .orderBy(desc(sql`SUM(CAST(${charges.totalAmount} AS DECIMAL))`));

    // Get daily charges trend
    const dailyTrend = await db.select({
      date: sql<string>`DATE(${charges.postingDate})`,
      amount: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, false),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ))
    .groupBy(sql`DATE(${charges.postingDate})`)
    .orderBy(sql`DATE(${charges.postingDate})`);

    // Get voided charges analysis
    const voidedChargesData = await db.select({
      totalVoidedAmount: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS DECIMAL)), 0)`,
      voidedCount: sql<number>`COUNT(*)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, true),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ));

    // Get void reasons breakdown
    const voidReasons = await db.select({
      voidReason: charges.voidReason,
      count: sql<number>`COUNT(*)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, true),
      isNotNull(charges.voidReason),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ))
    .groupBy(charges.voidReason);

    const chargesByCode: Record<string, { amount: number; count: number; description: string }> = {};
    chargesByCodeData.forEach(charge => {
      chargesByCode[charge.chargeCode] = {
        amount: Number(charge.totalAmount),
        count: Number(charge.count),
        description: charge.description
      };
    });

    const voidReasonMap: Record<string, number> = {};
    voidReasons.forEach(reason => {
      if (reason.voidReason) {
        voidReasonMap[reason.voidReason] = Number(reason.count);
      }
    });

    const voidedData = voidedChargesData[0];
    const summaryData = chargeSummary[0];

    return {
      totalCharges: Number(summaryData?.totalCharges || 0),
      totalTaxes: Number(summaryData?.totalTaxes || 0),
      chargesByCode,
      dailyChargesTrend: dailyTrend.map(trend => ({
        date: trend.date,
        amount: Number(trend.amount),
        count: Number(trend.count)
      })),
      voidedCharges: {
        amount: Number(voidedData?.totalVoidedAmount || 0),
        count: Number(voidedData?.voidedCount || 0),
        reasons: voidReasonMap
      }
    };
  }

  // Get Payment Analysis Report
  async getPaymentAnalysisReport(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    totalPayments: number;
    paymentsByMethod: Record<string, { amount: number; count: number; avgAmount: number }>;
    paymentsByStatus: Record<string, number>;
    refundsAnalysis: { totalRefunds: number; refundCount: number; topReasons: Record<string, number> };
    dailyPaymentsTrend: { date: string; amount: number; count: number }[];
  }> {
    // Get total payments
    const paymentSummary = await db.select({
      totalPayments: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'completed'),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ));

    // Get payments by method
    const paymentsByMethodData = await db.select({
      paymentMethod: payments.paymentMethod,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`,
      avgAmount: sql<number>`COALESCE(AVG(CAST(${payments.amount} AS DECIMAL)), 0)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'completed'),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .groupBy(payments.paymentMethod)
    .orderBy(desc(sql`SUM(CAST(${payments.amount} AS DECIMAL))`));

    // Get payments by status
    const paymentsByStatusData = await db.select({
      status: payments.status,
      count: sql<number>`COUNT(*)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .groupBy(payments.status);

    // Get refunds analysis
    const refundsData = await db.select({
      totalRefunds: sql<number>`COALESCE(SUM(CAST(${payments.refundAmount} AS DECIMAL)), 0)`,
      refundCount: sql<number>`COUNT(*)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'refunded'),
      isNotNull(payments.refundAmount),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ));

    // Get refund reasons
    const refundReasons = await db.select({
      refundReason: payments.refundReason,
      count: sql<number>`COUNT(*)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'refunded'),
      isNotNull(payments.refundReason),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .groupBy(payments.refundReason);

    // Get daily payments trend
    const dailyTrend = await db.select({
      date: sql<string>`DATE(${payments.paymentDate})`,
      amount: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`,
      count: sql<number>`COUNT(*)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'completed'),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .groupBy(sql`DATE(${payments.paymentDate})`)
    .orderBy(sql`DATE(${payments.paymentDate})`);

    const paymentsByMethod: Record<string, { amount: number; count: number; avgAmount: number }> = {};
    paymentsByMethodData.forEach(payment => {
      paymentsByMethod[payment.paymentMethod] = {
        amount: Number(payment.totalAmount),
        count: Number(payment.count),
        avgAmount: Number(payment.avgAmount)
      };
    });

    const paymentsByStatus: Record<string, number> = {};
    paymentsByStatusData.forEach(status => {
      paymentsByStatus[status.status] = Number(status.count);
    });

    const refundReasonMap: Record<string, number> = {};
    refundReasons.forEach(reason => {
      if (reason.refundReason) {
        refundReasonMap[reason.refundReason] = Number(reason.count);
      }
    });

    const refundsAnalysis = refundsData[0];
    const summaryData = paymentSummary[0];

    return {
      totalPayments: Number(summaryData?.totalPayments || 0),
      paymentsByMethod,
      paymentsByStatus,
      refundsAnalysis: {
        totalRefunds: Number(refundsAnalysis?.totalRefunds || 0),
        refundCount: Number(refundsAnalysis?.refundCount || 0),
        topReasons: refundReasonMap
      },
      dailyPaymentsTrend: dailyTrend.map(trend => ({
        date: trend.date,
        amount: Number(trend.amount),
        count: Number(trend.count)
      }))
    };
  }

  // Get Accounting Export Data
  async getAccountingExportData(propertyId: string, fromDate: Date, toDate: Date): Promise<{
    folioCharges: {
      folioNumber: string;
      guestName: string;
      chargeDate: string;
      chargeCode: string;
      description: string;
      amount: number;
      taxAmount: number;
      totalAmount: number;
    }[];
    paymentSummary: {
      folioNumber: string;
      guestName: string;
      paymentDate: string;
      paymentMethod: string;
      amount: number;
      status: string;
      transactionId?: string;
    }[];
    dailySummary: {
      date: string;
      totalRevenue: number;
      totalCharges: number;
      totalPayments: number;
      totalTax: number;
    }[];
  }> {
    // Get detailed charges for export
    const folioCharges = await db.select({
      folioNumber: folios.folioNumber,
      guestName: sql<string>`COALESCE(${guests.firstName} || ' ' || ${guests.lastName}, 'Unknown')`,
      chargeDate: sql<string>`${charges.chargeDate}::text`,
      chargeCode: charges.chargeCode,
      description: charges.description,
      amount: charges.amount,
      taxAmount: charges.taxAmount,
      totalAmount: charges.totalAmount
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .innerJoin(guests, eq(folios.guestId, guests.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, false),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ))
    .orderBy(charges.postingDate, folios.folioNumber);

    // Get payment summary for export
    const paymentSummary = await db.select({
      folioNumber: folios.folioNumber,
      guestName: sql<string>`COALESCE(${guests.firstName} || ' ' || ${guests.lastName}, 'Unknown')`,
      paymentDate: sql<string>`${payments.paymentDate}::text`,
      paymentMethod: payments.paymentMethod,
      amount: payments.amount,
      status: payments.status,
      transactionId: payments.transactionId
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .innerJoin(guests, eq(folios.guestId, guests.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .orderBy(payments.paymentDate, folios.folioNumber);

    // Get daily summary for export
    const dailySummary = await db.select({
      date: sql<string>`DATE(${charges.postingDate})`,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${charges.amount} AS DECIMAL)), 0)`,
      totalCharges: sql<number>`COALESCE(SUM(CAST(${charges.totalAmount} AS DECIMAL)), 0)`,
      totalTax: sql<number>`COALESCE(SUM(CAST(${charges.taxAmount} AS DECIMAL)), 0)`
    })
    .from(charges)
    .innerJoin(folios, eq(charges.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(charges.isVoided, false),
      gte(charges.postingDate, fromDate),
      lte(charges.postingDate, toDate)
    ))
    .groupBy(sql`DATE(${charges.postingDate})`)
    .orderBy(sql`DATE(${charges.postingDate})`);

    // Get daily payments total
    const dailyPayments = await db.select({
      date: sql<string>`DATE(${payments.paymentDate})`,
      totalPayments: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL)), 0)`
    })
    .from(payments)
    .innerJoin(folios, eq(payments.folioId, folios.id))
    .where(and(
      eq(folios.propertyId, propertyId),
      eq(payments.status, 'completed'),
      gte(payments.paymentDate, fromDate),
      lte(payments.paymentDate, toDate)
    ))
    .groupBy(sql`DATE(${payments.paymentDate})`)
    .orderBy(sql`DATE(${payments.paymentDate})`);

    // Merge daily summaries
    const dailySummaryWithPayments = dailySummary.map(day => {
      const matchingPayment = dailyPayments.find(p => p.date === day.date);
      return {
        date: day.date,
        totalRevenue: Number(day.totalRevenue),
        totalCharges: Number(day.totalCharges),
        totalPayments: Number(matchingPayment?.totalPayments || 0),
        totalTax: Number(day.totalTax)
      };
    });

    return {
      folioCharges: folioCharges.map(charge => ({
        folioNumber: charge.folioNumber,
        guestName: charge.guestName,
        chargeDate: charge.chargeDate,
        chargeCode: charge.chargeCode,
        description: charge.description,
        amount: Number(charge.amount),
        taxAmount: Number(charge.taxAmount),
        totalAmount: Number(charge.totalAmount)
      })),
      paymentSummary: paymentSummary.map(payment => ({
        folioNumber: payment.folioNumber,
        guestName: payment.guestName,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
        status: payment.status,
        transactionId: payment.transactionId || undefined
      })),
      dailySummary: dailySummaryWithPayments
    };
  }
}

export const hmsStorage = new DatabaseStorage();