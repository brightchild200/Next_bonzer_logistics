# Database Architecture

## Overview

Bonzer Logistics ERP uses PostgreSQL (via Supabase) as its primary relational database.

The database is designed around normalized business entities, strong referential integrity, migration-driven schema management, and Row Level Security (RLS).

The primary objectives are:

- Data consistency
- High integrity
- Scalability
- Security
- Performance
- Maintainability

---

# Database Philosophy

The database is considered the source of truth for all business data.

Business rules are enforced through:

- Constraints
- Foreign Keys
- Triggers
- Server Actions
- Row Level Security

Whenever possible, data integrity is enforced at the database level rather than relying solely on application logic.

---

# Database Design Principles

The schema follows several core principles.

## Normalization

Data is stored only once.

Instead of duplicating records across modules, related tables reference the primary record using foreign keys.

Example:

Customer information exists only in the Customer Master.

Interactions, enquiries, quotations, and jobs reference the customer rather than storing duplicate customer details.

---

## Referential Integrity

Relationships are enforced using foreign key constraints.

Examples:

```
Customer
    │
    ├── Customer Interactions
    │
    ├── Follow-ups
    │
    ├── Enquiries
    │
    ├── Quotations
    │
    └── Jobs
```

This prevents orphaned records and maintains data consistency.

---

## Migration-Driven Development

All schema modifications must be introduced through migrations.

Never modify production tables manually.

Every migration should be:

- Version controlled
- Reviewed
- Repeatable where practical
- Documented

Migration files are stored in:

```
supabase/migrations/
```

---

# Database Structure

The database is organised into logical business domains.

Current domains include:

- Authentication
- Employees
- Roles & Permissions
- Customer Master
- Party Masters
- Customer Interactions
- Follow-ups

Future domains include:

- Enquiries
- Pricing
- Quotations
- Operations
- Jobs
- Audit Logs

---

# Primary Entities

## Users

Stores authenticated users.

Managed through Supabase Authentication.

---

## Profiles

Stores employee information associated with authenticated users.

Contains:

- Employee code
- Name
- Email
- Status
- Profile information

---

## Roles

Defines available business roles.

Examples:

- Admin
- Sales Manager
- Salesperson
- Customer Service
- Pricing
- Operations
- Accounts

---

## Permissions

Represents granular application permissions.

Examples:

- customers.create
- customers.update
- enquiries.assign

Authorization is permission-driven rather than role-driven.

---

## User Roles

Maps users to one or more business roles.

Supports multi-role employees.

---

## Role Permissions

Maps permissions to roles.

Changing a role's permissions automatically updates access for all assigned users.

---

## Customer Master

Acts as the Single Source of Truth for customer information.

Every business module references the Customer Master.

No duplicate customer records should exist across modules.

---

## Party Masters

Stores logistics-specific party relationships.

Examples include:

- Shipper
- Consignee

These reference the Customer Master rather than duplicating customer data.

---

## Customer Interactions

Represents the root conversation with a customer.

An interaction records the initial communication that may later lead to business opportunities.

---

## Follow-ups

Represents the continuation of an existing interaction.

Multiple follow-ups may belong to a single interaction.

Follow-ups never create duplicate interaction records.

---

# Future Entity Relationships

```
Customer

│

├── Interaction

│      │

│      └── Follow-ups

│

└── Enquiry

        │

        ├── Pricing

        │

        ├── Quotation

        │

        └── Job
```

This hierarchy reflects the intended business workflow.

---

# Constraints

The database enforces integrity using:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- NOT NULL Constraints

Where appropriate, business validation is also enforced using triggers and database functions.

---

# Row Level Security (RLS)

Sensitive tables are protected using Row Level Security.

Policies determine which records a user can:

- View
- Create
- Update
- Delete

Application code should never bypass RLS.

---

# Indexing Strategy

Indexes are created on frequently queried columns.

Examples include:

- IDs
- Foreign Keys
- Employee Codes
- Customer References
- Company Names
- Status Fields

Indexes improve search and lookup performance while maintaining efficient query execution.

---

# Transactions

Business operations affecting multiple tables should execute within database transactions.

This ensures:

- Atomicity
- Consistency
- Rollback on failure

Partial writes should never leave the database in an inconsistent state.

---

# Audit Strategy

Future releases will introduce audit logging for critical business events.

Examples include:

- Record creation
- Record updates
- Permission changes
- Status transitions
- Workflow approvals

Audit logs will be append-only and immutable.

---

# Performance Considerations

The database is designed to support:

- Efficient indexing
- Pagination
- Server-side filtering
- Optimised joins
- Scalable query execution

Large datasets should always be queried using pagination rather than loading complete tables.

---

# Database Documentation

Every schema modification should update:

- Database documentation
- Migration history
- Phase documentation (if applicable)
- Changelog (for production-impacting changes)

Database documentation should always reflect the current production schema.