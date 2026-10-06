---
name: POS takeaway reporting
description: Durable rules for recording and reporting FishTokri POS takeaway sales.
---

POS takeaway orders may be created without a customer name or phone and should display as "Walk-in". Create a customer record when a name and valid phone number are supplied. Day-end reporting must match takeaway orders by `createdAt` because they do not have a delivery date.

**Why:** the user asked that name and phone not be compulsory for POS sales.

**How to apply:** Allow anonymous walk-in takeaway sales, create customer records when full contact details are entered, keep delivery contact/address requirements, and include takeaways in day-end reports by creation date.