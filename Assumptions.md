# Assumptions

| # | Ambiguity in the brief | Assumption we made |
|---|---|---|
| 1 | The spec describes water tankers, but our project is auto parts | Same structure, new domain: hydrants become warehouse stock, tankers and drivers become parts and riders, subsidised becomes workshop trade orders |
| 2 | Group size is 3 to 4 | Instructor approved a group of 2 for this scenario |
| 3 | "5 pages" | Login and register is a modal on every page, so it does not count as a page. The staff console is one page whose view depends on role |
| 4 | What "approval" means | Retail orders skip approval and start as `Approved`. Workshop orders start as `Pending Approval` and need a Store Manager |
| 5 | Workshop credit | An approved workshop has a credit limit set by the manager. Ordering reduces available credit, and cancelling, rejecting or a failed delivery gives it back. A monthly reset is a backend task |
| 6 | Stock reservation | Stock is deducted when the order is placed and returned on cancel, reject or failed delivery |
| 7 | Fitment | Each part lists compatible make, model and year range. Parts with no fitment data show "not listed" |
| 8 | Who can cancel | Customers can cancel only before packing (`Pending Approval` or `Approved`) |
| 9 | Disputes | Only after `Delivered`. The Store Manager resolves with a written note, and the order becomes `Resolved` |
| 10 | Failed deliveries | The rider must pick a reason. The order becomes `Failed` and stock and credit are restored |
| 11 | Payments | Payment method is recorded but no real payment happens |
| 12 | Authentication in Phase 1 | Mock login against `/users`. Real hashing and tokens come in Phase 2 |
| 13 | Zones | Not used in Phase 1. The manager sees all orders. Zones can be added in Phase 2 |
| 14 | Pakistani formats | CNIC `12345-1234567-1`, phone `03XX-XXXXXXX`, currency Rs |
| 15 | Group variation | Group of 2, as approved by the instructor. If the instructor named a specific validation rule, add it here and in the forms |
| 16 | Read versus change | Each role sees and acts only on what fits it: managers cannot dispatch, riders see only their own trips, customers see only their own orders |
