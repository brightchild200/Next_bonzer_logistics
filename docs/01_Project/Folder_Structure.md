# Folder Structure

This document describes the high-level folder organization of the Bonzer Logistics ERP project.

The project follows a modular architecture using the Next.js App Router.

---

# Root Structure

```
bonzer-logistics/
│
├── app/
├── components/
├── lib/
├── hooks/
├── supabase/
├── public/
├── docs/
├── types/
├── styles/
├── middleware.ts
├── package.json
└── tsconfig.json
```

---

# app/

Contains all application routes using the Next.js App Router.

Example

```
app/

(auth)/

(app)/

dashboard/

customers/

employees/

interactions/

settings/

api/
```

Responsibilities

- Pages
- Layouts
- Loading UI
- Error UI
- Route Groups

---

# components/

Reusable UI components shared across the application.

Example

```
components/

ui/

common/

layout/

dashboard/

customers/

employees/
```

Contains

- shared UI
- tables
- dialogs
- cards
- navigation
- layouts

---

# lib/

Application logic.

Example

```
lib/

actions/

auth/

permissions/

supabase/

utils/

validators/
```

Contains

- Server Actions
- helper functions
- utilities
- validation
- permission helpers

---

# hooks/

Reusable React hooks.

Example

```
hooks/

use-auth.ts

use-pagination.ts

use-debounce.ts
```

---

# supabase/

Supabase configuration.

Example

```
supabase/

migrations/

seed.sql

functions/

config.toml
```

Contains

- migrations
- database functions
- configuration

---

# public/

Static assets.

Example

```
public/

images/

icons/

logos/
```

---

# styles/

Global styling.

Contains

- globals.css
- Tailwind configuration

---

# types/

Shared TypeScript types.

Example

```
types/

customer.ts

employee.ts

permissions.ts
```

---

# docs/

Project documentation.

```
docs/

01_Project/

02_Architecture/

03_Phases/

04_Milestones/

05_Workflows/

06_UI/

07_Database/

08_API/

09_Audits/

10_Research/

11_Decisions/

12_Roadmap/

CHANGELOG.md

Current_Status.md
```

---

# Module Structure

Every business module should follow a similar organization.

Example

```
customers/

page.tsx

loading.tsx

error.tsx

components/

actions/

types/
```

---

# Server Actions

Business logic should remain inside

```
lib/actions/
```

Never inside UI components.

---

# Shared Components

Reusable components belong inside

```
components/
```

Avoid duplicating components across modules.

---

# Database

All database changes belong inside

```
supabase/migrations/
```

Every schema modification must be migration-based.

---

# Documentation

Documentation lives entirely inside

```
docs/
```

Every completed phase and milestone should update the relevant documentation.

---

# Guiding Principle

The folder structure should remain:

- modular
- scalable
- maintainable
- easy to navigate

New features should extend the existing structure instead of introducing new organizational patterns.