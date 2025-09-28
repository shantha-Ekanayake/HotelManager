import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { type User } from "@shared/schema";

export interface AuthRequest extends Request {
  user?: User;
}

// Require JWT secret - fail fast if not provided
const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for JWT authentication");
}

// Type assertion after null check for TypeScript
const jwtSecret: string = JWT_SECRET;

// Role hierarchy and permissions
export const USER_ROLES = {
  it_admin: {
    level: 10,
    description: "Full system access across all properties",
    permissions: ["*"] // All permissions
  },
  admin: {
    level: 9,
    description: "Administrative access to most modules and settings",
    permissions: [
      "users.manage", "properties.manage", "reports.view.all",
      "reservations.manage", "guests.manage", "billing.manage",
      "housekeeping.manage", "maintenance.manage", "rates.manage"
    ]
  },
  operations_manager: {
    level: 8,
    description: "Day-to-day operations management across departments",
    permissions: [
      "reservations.manage", "guests.view", "housekeeping.view",
      "maintenance.view", "reports.view.operational", "front_desk.manage"
    ]
  },
  hotel_manager: {
    level: 7,
    description: "Full property management for assigned property",
    permissions: [
      "reservations.manage", "guests.manage", "billing.view",
      "housekeeping.manage", "maintenance.manage", "reports.view.property",
      "reports.view.financial", "rates.view", "users.view.property", "front_desk.manage"
    ]
  },
  revenue_manager: {
    level: 6,
    description: "Rate and revenue optimization management",
    permissions: [
      "rates.manage", "reports.view.revenue", "reservations.view"
    ]
  },
  accountant: {
    level: 5,
    description: "Financial data and accounting management",
    permissions: [
      "billing.manage", "reports.view.financial", "accounting.manage",
      "folios.manage", "payments.manage"
    ]
  },
  auditor: {
    level: 4,
    description: "Read-only access for compliance and auditing",
    permissions: [
      "*.view", "audit_logs.view", "reports.view.all"
    ]
  },
  maintenance_manager: {
    level: 4,
    description: "Maintenance operations and work order management",
    permissions: [
      "maintenance.manage", "rooms.status.update", "service_requests.manage"
    ]
  },
  housekeeping_supervisor: {
    level: 3,
    description: "Housekeeping operations and staff management",
    permissions: [
      "housekeeping.manage", "rooms.status.update", "tasks.assign"
    ]
  },
  front_desk_staff: {
    level: 2,
    description: "Guest services and front office operations",
    permissions: [
      "reservations.manage", "guests.manage", "folios.manage",
      "payments.process", "check_in.process", "check_out.process",
      "service_requests.create"
    ]
  },
  maintenance_staff: {
    level: 1,
    description: "Maintenance task execution",
    permissions: [
      "maintenance.tasks.update", "service_requests.update.assigned"
    ]
  },
  housekeeping_staff: {
    level: 1,
    description: "Room cleaning and housekeeping tasks",
    permissions: [
      "housekeeping.tasks.update", "rooms.status.update.assigned"
    ]
  }
} as const;

export type UserRole = keyof typeof USER_ROLES;

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username, 
      role: user.role,
      propertyId: user.propertyId 
    },
    jwtSecret,
    { expiresIn: "24h" }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// Check if user has specific permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const role = USER_ROLES[userRole];
  
  // IT Admin has all permissions
  if (userRole === "it_admin") {
    return true;
  }
  
  // Check for wildcard permissions
  if (role.permissions.some(p => p === "*")) {
    return true;
  }
  
  // Check for exact permission match
  if (role.permissions.some(p => p === permission)) {
    return true;
  }
  
  // Check for wildcard pattern match (e.g., "*.view" matches "guests.view")
  const wildcardPermissions = role.permissions.filter(p => p.includes("*"));
  for (const wildcard of wildcardPermissions) {
    const pattern = wildcard.replace("*", ".*");
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(permission)) {
      return true;
    }
  }
  
  return false;
}

// Check if user can access specific property
export function canAccessProperty(user: User, propertyId: string): boolean {
  // IT Admin and Admin can access all properties
  if (user.role === "it_admin" || user.role === "admin") {
    return true;
  }
  
  // Operations Manager may have multi-property access (if propertyId is null)
  if (user.role === "operations_manager" && !user.propertyId) {
    return true;
  }
  
  // Other roles are restricted to their assigned property
  return user.propertyId === propertyId;
}

// Authorization middleware factory
export function authorize(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!hasPermission(req.user.role as UserRole, permission)) {
      return res.status(403).json({ 
        error: "Insufficient permissions",
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
}

// Enhanced property access middleware with required property ID
export function requirePropertyAccess(required: boolean = true) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const propertyId = req.params.propertyId || req.body.propertyId || req.query.propertyId;
    
    // Require property ID if specified
    if (required && !propertyId) {
      return res.status(400).json({ error: "Property ID is required" });
    }
    
    if (propertyId && !canAccessProperty(req.user, propertyId)) {
      return res.status(403).json({ 
        error: "Access denied to this property",
        propertyId,
        userPropertyId: req.user.propertyId
      });
    }

    next();
  };
}

// Login function
export async function login(username: string, password: string): Promise<{ user: User; token: string } | null> {
  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    // Update last login - use type assertion for the update
    await storage.updateUser(user.id, { lastLogin: new Date() } as any);

    const token = generateToken(user);
    
    // Return user without password - ensure password is never included
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: { ...userWithoutPassword, lastLogin: new Date() } as User,
      token
    };
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}