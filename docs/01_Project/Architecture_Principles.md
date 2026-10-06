# Architecture Principles

This document defines the core architectural rules followed throughout the Bonzer Logistics ERP project.

These principles should remain consistent across all future development.

---

# 1. Customer Master is the Single Source of Truth

Customer information is stored only once.

Every business module references the Customer Master instead of maintaining duplicate customer records.

---

# 2. Workflow Before Implementation

Business workflows are finalized before development begins.

Implementation follows approved workflows.

---

# 3. Separation of Business Logic and UI

Business logic remains independent of the user interface.

UI improvements must never change business behaviour.

---

# 4. Modular Architecture

Every module is independently maintainable.

Examples:

- Authentication
- CRM
- Pricing
- Operations
- Jobs

---

# 5. Multi-role RBAC

Permissions are role-based.

Users may possess multiple roles simultaneously.

Access is permission-driven rather than hardcoded.

---

# 6. Server-first Development

Business operations execute on the server whenever appropriate.

The client is responsible only for presentation and interaction.

---

# 7. Validation at Multiple Layers

Validation should occur at:

- Client
- Server
- Database

---

# 8. Reusable Components

UI components should be shared whenever possible.

Duplicate implementations should be avoided.

---

# 9. Documentation-driven Development

Architecture decisions must be documented.

Major workflow changes should update documentation before implementation.

---

# 10. Living Documentation

Documentation evolves alongside the project.

Completed phases, milestones, workflows, and architectural decisions are recorded as development progresses.