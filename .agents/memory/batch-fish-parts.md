---
name: Batch fish parts and shared stock
description: Product decision for POS part pricing and inventory ownership.
---

Configure part names and per-kg prices on an inventory batch. When creating a later batch, prefill the part list from the latest configured batch so names carry forward, while allowing the new batch’s prices to be edited. If all stock batches are cleared for a fresh test reset, preserve the latest part configuration on the product and use it as the next-batch template. Apply the new part list and rates to older stock batches too. POS shows both the whole product card and a separate card for each part; use the current rates and do not ask the cashier to select a batch. A batch has only one stock quantity: its cleaned final weight. Never divide or derive separate Head/Middle/Tail stock balances. Part and whole-product sales consume the oldest eligible batch first from that shared cleaned-weight stock.

**Why:** The user clarified that parts are pricing/sale choices, not separate inventory pools; sellable stock is the cleaned final product, with current rates applied across lots.

**How to apply:** Treat each batch’s cleaned final weight as its sole stock quantity and ignore legacy per-part weight fields. Show the same overall cleaned-stock quantity on each part card, clearly labeled as total stock rather than a separate part balance. Synchronize part rates onto older lots without changing their quantities or completed orders. Keep a product-level parts template when batches are intentionally cleared, so the first new lot can prefill it. Ignore client batch IDs for part deductions, retain them when restoring legacy orders, and record exact FIFO allocations.
