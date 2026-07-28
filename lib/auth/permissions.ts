/**
 * Centralized role definitions.
 * Single source of truth for all role identifiers.
 */
export const ROLES = {
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALESPERSON: 'salesperson',
  CUSTOMER_SERVICE: 'customer_service',
  PRICING: 'pricing',
  OPERATIONS: 'operations',
  ACCOUNTS: 'accounts',
} as const;

/**
 * Centralized permission definitions.
 * Single source of truth for all permission strings.
 * Format: {resource}:{action}
 */
export const PERMISSIONS = {
  CUSTOMER: {
    CREATE: 'customer:create',
    READ: 'customer:read',
    UPDATE: 'customer:update',
    DEACTIVATE: 'customer:deactivate',
  },
  ENQUIRY: {
    CREATE: 'enquiry:create',
    READ: 'enquiry:read',
    UPDATE: 'enquiry:update',
    ASSIGN: 'enquiry:assign',
    CONVERT: 'enquiry:convert',
  },
  INTERACTION: {
    CREATE: 'interaction:create',
    READ_ALL: 'interaction:read_all',
    UPDATE: 'interaction:update',
    DEACTIVATE: 'interaction:deactivate',
  },
  FOLLOW_UP: {
    READ_ALL: 'follow_up:read_all',
    UPDATE_OWN: 'follow_up:update_own',
  },
  PRICING: {
    READ: 'pricing:read',
    UPDATE: 'pricing:update',
  },
  JOB: {
    CREATE: 'job:create',
    READ: 'job:read',
    UPDATE: 'job:update',
  },
  ADMIN: {
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DEACTIVATE: 'user:deactivate',
    USER_ASSIGN_ROLES: 'user:assign_roles',
  },
} as const;

/**
 * Union type of all valid role identifiers.
 */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Union type of all valid permission strings.
 * Derived from PERMISSIONS constants - no magic strings.
 */
export type Permission =
  | (typeof PERMISSIONS.CUSTOMER)[keyof typeof PERMISSIONS.CUSTOMER]
  | (typeof PERMISSIONS.ENQUIRY)[keyof typeof PERMISSIONS.ENQUIRY]
  | (typeof PERMISSIONS.INTERACTION)[keyof typeof PERMISSIONS.INTERACTION]
  | (typeof PERMISSIONS.FOLLOW_UP)[keyof typeof PERMISSIONS.FOLLOW_UP]
  | (typeof PERMISSIONS.PRICING)[keyof typeof PERMISSIONS.PRICING]
  | (typeof PERMISSIONS.JOB)[keyof typeof PERMISSIONS.JOB]
  | (typeof PERMISSIONS.ADMIN)[keyof typeof PERMISSIONS.ADMIN];

/**
 * Flat array of all permissions for iteration.
 */
export const ALL_PERMISSIONS: Permission[] = [
  ...Object.values(PERMISSIONS.CUSTOMER),
  ...Object.values(PERMISSIONS.ENQUIRY),
  ...Object.values(PERMISSIONS.INTERACTION),
  ...Object.values(PERMISSIONS.FOLLOW_UP),
  ...Object.values(PERMISSIONS.PRICING),
  ...Object.values(PERMISSIONS.JOB),
  ...Object.values(PERMISSIONS.ADMIN),
];

/**
 * Flat array of all roles for iteration.
 */
export const ALL_ROLES: Role[] = Object.values(ROLES);