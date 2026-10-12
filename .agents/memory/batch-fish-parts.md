---
name: Batch fish parts and shared stock
description: Product decision for POS part pricing and inventory ownership.
---

Configure part names and per-kg prices on an inventory batch. When creating a later batch, prefill the part list from the latest configured batch so names carry forward, while allowing the new batch’s prices to be edited. Apply the new part list and rates to older stock batches too. POS shows both the whole product card and a separate card for each part; use the current rates and do not ask the cashier to select a batch. Part and whole-product sales consume the oldest eligible received batch first, sharing the batch’s cleaned-weight stock across all parts.

**Why:** The user wants current prices from the latest stock lot but FIFO stock movement; batches still share one cleaned-weight balance across whole-product and part sales.

**How to apply:** Keep the selected part on the order line, let the API allocate stock FIFO, and record each consumed batch allocation so cancellation restores the exact lots. Keep expiry date and time side by side in the stock-entry form.
