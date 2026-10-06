# Customer Workflow

## Status

✅ Frozen

---

# Purpose

The Customer Master serves as the Single Source of Truth for all customer information across the ERP.

Every business process references an existing customer record rather than creating duplicate customer data.

---

# Workflow

Lead / Prospect

↓

Create Customer

↓

Customer Master

↓

Available Across ERP

- Customer Interactions
- Enquiries
- Pricing
- Quotations
- Jobs

---

# Customer Creation

A customer can be created from:

- Customer Management
- Customer Interaction screen

After creation, the customer becomes immediately available throughout the ERP.

---

# Validation

The system validates:

- Company Name
- GST Number
- PAN Number
- Duplicate Company Names
- Required Fields

Validation occurs at:

- Client
- Server
- Database

---

# Business Rules

- Customer Master is the Single Source of Truth.
- Duplicate customer records are not allowed.
- A customer may act as both a shipper and consignee.
- Customer information should never be duplicated in downstream modules.

---

# Related Modules

- Customer Interactions
- Enquiry
- Pricing
- Quotation
- Job