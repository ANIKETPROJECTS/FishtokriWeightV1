---
name: POS weight-based overage
description: Inventory and billing rules for POS weight-based sales that exceed recorded stock by up to 1 kg.
---

For normal POS takeaway orders, any product sold by weight may be sold up to 1 kg above available stock when some stock remains, regardless of category. Bill the full measured weight, deduct only the available inventory, and record the overage separately in inventory movements. Surmai Head, Body, and Tail share one 1 kg allowance. Do not apply the buffer to zero-stock products, delivery orders, or preorders.

**Why:** The user wants the same allowance for all weight-based products in the POS, not only fish or seafood, while preventing recorded stock from going negative.

**How to apply:** Keep the server as the authoritative check. Preserve the full measured quantity on the order/invoice, cap the inventory deduction at actual stock, and ensure cancellation/edit restores only what was deducted.
