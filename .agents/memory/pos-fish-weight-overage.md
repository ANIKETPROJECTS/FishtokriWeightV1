---
name: POS fish weight overage
description: The inventory and billing rule for POS fish sales that exceed recorded stock by up to 1 kg.
---

For normal POS takeaway orders, kg-priced fish may be sold up to 1 kg above available stock when some stock remains. Bill the full measured weight, deduct only the available inventory, and record the overage separately in inventory movements. Surmai Head, Body, and Tail share one 1 kg allowance. Do not apply the buffer to zero-stock products, non-fish products, delivery orders, or preorders.

**Why:** The user wants small water-related weight differences accepted at POS without making recorded stock negative, and chose to keep the excess visible rather than deducting it.

**How to apply:** Keep the server as the authoritative check. When changing POS stock behavior, preserve the full measured quantity on the order/invoice, cap the inventory deduction at actual stock, and ensure cancellation/edit restores only what was deducted.
