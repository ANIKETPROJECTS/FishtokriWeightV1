---
name: POS takeaway reporting
description: Durable rules for recording and reporting FishTokri POS takeaway sales.
---

POS takeaway sales must request customer creation when a customer is entered, and day-end reporting must match takeaway orders by `createdAt` because they do not have a delivery date.

**Why:** The order can deduct inventory and be stored successfully while remaining absent from the customer list and date-filtered day-end report if these two paths are omitted.

**How to apply:** Keep takeaway orders in Orders History, ensure POS order creation enables customer creation, and include a creation-date branch alongside delivery-date matching in day-end queries.