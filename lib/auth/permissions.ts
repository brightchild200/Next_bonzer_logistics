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
    READ_ASSIGNED: 'enquiry:read_assigned',
    READ_TEAM: 'enquiry:read_team',
    READ_ALL: 'enquiry:read_all',
    UPDATE_CS_FIELDS: 'enquiry:update_cs_fields',
    READ_OWN: 'enquiry:read_own',
    UPDATE_SALES_FIELDS: 'enquiry:update_sales_fields',
    ASSIGN_CS: 'enquiry:assign_cs',
    CONVERT_JOB: 'enquiry:convert_job',
  },
  INTERACTION: {
    CREATE: 'interaction:create',
    READ_ALL: 'interaction:read_all',
    READ_OWN: 'interaction:read_own',
    UPDATE: 'interaction:update',
    DEACTIVATE: 'interaction:deactivate',
  },
  FOLLOW_UP: {
    READ_ALL: 'follow_up:read_all',
    READ_OWN: 'follow_up:read_own',
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
  KYC: {
    READ: 'kyc:read',
    UPDATE: 'kyc:update',
  },
  ATTENDANCE: {
    CHECK_IN: 'attendance:check_in',
    CHECK_OUT: 'attendance:check_out',
    READ_OWN: 'attendance:read_own',
    READ_TEAM: 'attendance:read_team',
    READ_ALL: 'attendance:read_all',
  },
  TARGET: {
    CREATE: 'target:create',
    UPDATE: 'target:update',
    READ_OWN: 'target:read_own',
    READ_TEAM: 'target:read_team',
    READ_ALL: 'target:read_all',
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
  | (typeof PERMISSIONS.ADMIN)[keyof typeof PERMISSIONS.ADMIN]
  | (typeof PERMISSIONS.KYC)[keyof typeof PERMISSIONS.KYC]
  | (typeof PERMISSIONS.ATTENDANCE)[keyof typeof PERMISSIONS.ATTENDANCE]
  | (typeof PERMISSIONS.TARGET)[keyof typeof PERMISSIONS.TARGET];

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
  ...Object.values(PERMISSIONS.KYC),
  ...Object.values(PERMISSIONS.ATTENDANCE),
  ...Object.values(PERMISSIONS.TARGET),
];

/**
 * Flat array of all roles for iteration.
 */
export const ALL_ROLES: Role[] = Object.values(ROLES);