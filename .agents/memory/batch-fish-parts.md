---
name: Batch fish parts and shared stock
description: Product decision for POS part pricing and inventory ownership.
---

Configure part names and per-kg prices on each inventory batch, not on the product. When multiple batches are active, POS presents each batch’s part variants separately. Selling any part deducts its weight from the selected batch’s shared cleaned-weight quantity; parts do not have independently allocated stock.

**Why:** Batch-specific yields and prices can differ, while inventory is still tracked as one cleaned-weight pool per batch.

**How to apply:** Keep the chosen batch and part on order lines and stock movements so cancellations restore the same batch and history shows the actual source batch.
