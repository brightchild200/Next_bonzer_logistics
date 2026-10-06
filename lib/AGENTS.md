# AGENTS.md

# Bonzer Logistics ERP

This repository contains the Bonzer Logistics ERP built with:

- Next.js App Router
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- shadcn/ui

---

# General Rules

Always understand the existing architecture before making changes.

Reuse existing code whenever possible.

Do not duplicate logic.

Do not create unnecessary folders.

Keep implementations modular and scalable.

Follow existing naming conventions.

Do not modify unrelated files.

---

# Database Rules

Never edit old migrations.

Always create a new migration.

Never delete existing tables without approval.

Prefer backward-compatible schema changes.

---

# TypeScript Rules

Avoid `any`.

Prefer strict typing.

Reuse existing interfaces and types.

---

# React Rules

Prefer Server Components.

Use Client Components only when required.

Keep components reusable.

Avoid business logic inside UI components.

---

# Server Actions

Reuse existing actions whenever possible.

Keep validation server-side.

Never duplicate permission checks.

---

# Security

Respect existing RBAC.

Never bypass authorization.

Never expose sensitive data.

---

# Project Workflow

Before implementing any feature:

1. Review existing architecture.
2. Search for reusable code.
3. Decide file locations.
4. Implement checkpoint by checkpoint.
5. Stop after every checkpoint.

---

# Output Format

Always report:

- Files created
- Files modified
- Decisions made
- Assumptions

Wait for approval before continuing.

---

If role-specific instructions exist inside `.agents/`,
follow them in addition to these global rules.