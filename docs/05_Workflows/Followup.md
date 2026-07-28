# Follow-up Workflow

## Status

✅ Frozen

---

# Purpose

A follow-up represents the continuation of an existing customer interaction.

It should never exist independently.

---

# Workflow

Interaction

↓

Follow-up 1

↓

Follow-up 2

↓

Follow-up 3

↓

Enquiry (Optional)

---

# Business Rules

- Every follow-up belongs to one interaction.
- Multiple follow-ups are allowed.
- Follow-ups are assigned to the creator (self).
- Follow-ups maintain the conversation history.
- Planned Notes describe the next action.
- Previous Notes preserve historical context.

---

# Status

- Pending
- Completed
- Cancelled

When a follow-up is marked as Completed, the completion timestamp must be recorded.

---

# Responsibilities

Salesperson

- Complete follow-up
- Record discussion
- Schedule next follow-up
- Create enquiry if required

Sales Manager

- Monitor overdue follow-ups

Admin

- Full visibility

---

# Outcome

The customer conversation progresses until either:

- Another follow-up is scheduled, or
- An enquiry is created.