# UI Architecture

## Overview

The Bonzer Logistics ERP user interface is built using the Next.js App Router, React, Tailwind CSS, and shadcn/ui.

The UI architecture follows a component-driven design system where reusable components, consistent layouts, and standardized interaction patterns provide a predictable user experience across the application.

The UI layer is responsible only for presentation and user interaction. All business logic is handled by Server Actions.

---

# UI Design Principles

The interface follows these principles:

- Consistency
- Simplicity
- Reusability
- Accessibility
- Responsiveness
- Performance

Every screen should feel like part of the same application.

---

# Technology Stack

Frontend technologies include:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

---

# Application Structure

The application is organised using the App Router.

```
app/

(auth)

(app)

customers/

employees/

dashboard/

settings/
```

Each module owns its own pages while sharing common layouts and UI components.

---

# Layout Architecture

The application uses nested layouts.

```
Root Layout

↓

Authentication Layout

↓

Application Layout

↓

Module Layout

↓

Page
```

Shared navigation, headers and common UI elements are provided by layouts instead of individual pages.

---

# Component Architecture

Components are organised into reusable layers.

```
components/

ui/

common/

layout/

dashboard/

customers/

employees/
```

---

## UI Components

Basic building blocks.

Examples:

- Button
- Input
- Badge
- Dialog
- Card
- Table
- Select
- Dropdown

These are primarily sourced from shadcn/ui.

---

## Shared Components

Reusable components shared across modules.

Examples:

- PageHeader
- SearchBar
- StatusBadge
- ConfirmationDialog
- DataTable
- EmptyState
- LoadingState
- Pagination

---

## Module Components

Components specific to a business module.

Examples:

```
customers/

CustomerForm

CustomerTable

CustomerFilters
```

---

# Page Structure

Every page should follow a consistent layout.

```
Page Header

↓

Actions

↓

Filters

↓

Content

↓

Pagination
```

Users should immediately understand where information and actions are located.

---

# Forms

Forms should follow a consistent pattern.

```
Header

↓

Grouped Fields

↓

Validation Messages

↓

Primary Action

↓

Secondary Action
```

Validation feedback should appear close to the affected field.

---

# Tables

Tables should use consistent behaviour.

Features include:

- Search
- Sorting
- Pagination
- Status Badges
- Row Actions
- Empty States

Large datasets should always be paginated.

---

# Dialogs

Dialogs should be used for:

- Create
- Edit
- Delete Confirmation
- Important Actions

Dialogs should remain focused on a single task.

---

# Navigation

Navigation should remain consistent throughout the application.

Primary navigation provides access to business modules.

Secondary navigation is provided where required within modules.

---

# Design System

The application follows a unified design system.

Standardised elements include:

- Typography
- Colours
- Icons
- Buttons
- Cards
- Tables
- Forms
- Dialogs
- Status Badges

Custom styling should be avoided unless necessary.

---

# Responsive Design

The interface is designed for desktop-first usage while remaining responsive across devices.

Layouts should adapt gracefully without altering functionality.

---

# Accessibility

UI components should support:

- Keyboard navigation
- Visible focus states
- Screen reader labels
- Sufficient colour contrast

Accessibility should be considered during development rather than added later.

---

# Loading States

Every asynchronous operation should provide visual feedback.

Examples:

- Skeleton Loaders
- Loading Spinners
- Disabled Buttons
- Progress Indicators

Users should always understand that work is in progress.

---

# Error Handling

User-facing errors should be:

- Clear
- Actionable
- Non-technical

Unexpected system errors should be logged while displaying friendly messages to users.

---

# UI Philosophy

The UI exists to make business workflows intuitive.

It should never contain business logic or permission decisions.

Its responsibilities are limited to:

- Displaying information
- Collecting user input
- Invoking Server Actions
- Presenting results

Keeping presentation separate from business logic improves maintainability, consistency, and long-term scalability.