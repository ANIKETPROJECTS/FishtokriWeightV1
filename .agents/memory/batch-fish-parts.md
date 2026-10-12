---
name: Batch fish parts and shared stock
description: Product decision for POS part pricing and inventory ownership.
---

Configure part names and per-kg prices on an inventory batch. When creating a later batch, prefill the part list from the latest configured batch so names carry forward, while allowing the new batch’s prices to be edited. Apply the new part list and rates to older stock batches too. POS shows both the whole product card and a separate card for each part; use the current rates and do not ask the cashier to select a batch. Part and whole-product sales consume the oldest eligible received batch first, sharing the batch’s cleaned-weight stock across all parts.

**Why:** The user wants every available lot sold at the latest rates but FIFO stock movement; batches still share one cleaned-weight balance across whole-product and part sales.

**How to apply:** When saving a new configured batch, synchronize its parts and rates onto older lots without changing quantities or completed orders. Ignore client batch IDs for part deductions, but retain them when restoring legacy orders; record exact FIFO allocations for history/cancellation. Place expiry date/time side by side.
