import { eq, and, desc, asc, gte, lte, isNull, isNotNull } from "drizzle-orm";
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
    // Simple search implementation - can be enhanced with full-text search
    return await db.select().from(guests)
      .where(
        // Simple OR conditions for basic search
        // In production, you'd want proper full-text search
        eq(guests.firstName, query)
      )
      .limit(10);
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
}

export const hmsStorage = new DatabaseStorage();