---
name: POS weight-based overage
description: Inventory and billing rules for POS weight-based sales that exceed recorded stock by up to 1 kg.
---

For normal POS takeaway orders, any product sold by weight may be sold up to 1 kg above available stock when some stock remains, regardless of category. Bill the full measured weight, deduct only the available inventory, and record the overage separately in inventory movements. Surmai Head, Body, and Tail share one 1 kg allowance. Do not apply the buffer to zero-stock products, delivery orders, or preorders.

**Why:** The user wants the same allowance for all weight-based products in the POS, not only fish or seafood, while preventing recorded stock from going negative.

For Surmai, the parent product's cleaned batch quantity is the single stock pool. POS selects and weighs the whole product at its one per-kg price; Head, Body, or Tail may be saved only as an optional note on that order line. They are never separate POS products or stock pools. Legacy per-part weights and prices are not authoritative.

**Why:** The user wants to record fish inventory as one cleaned total and add a small part note at billing, without partwise weights, separate products, or different prices.

**How to apply:** Keep the server as the authoritative stock check. Preserve partName as optional order/invoice metadata while deducting/restoring against the parent SKU. Preserve the full measured quantity on the order/invoice, cap inventory deduction at actual stock, and ensure cancellation/edit restores only what was deducted.
