---
name: Day-end report preorder inclusion
description: The Day End Orders Report must include paid confirmed preorders when their creation or delivery date is in the selected range.
---

The Day End Orders Report is a sales report, not a handover-status report. Include non-deleted preorders in the selected date range even when their status is still `confirmed`.

**Why:** A paid preorder can be a completed sale before its scheduled takeaway or delivery handover. Filtering it by `takeaway`, `handed_over`, or `delivered` makes the report show zero orders and zero payment totals for a valid sale.

**How to apply:** Use the selected creation-date or delivery-date range as the inclusion rule. Do not add an order-type/status exclusion to the report query unless the business rule explicitly changes.