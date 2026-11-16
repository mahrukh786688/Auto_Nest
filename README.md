# AutoNest: Auto Parts Ordering and Dispatch System

Web Engineering Lab project, IQRA University. This repository holds **Phase 1: the complete frontend** with a mock REST API. In Phase 2 the mock API is replaced by a real backend.

**Team (2 members, approved by the instructor):** _Member 1 name / ID_, _Member 2 name / ID_

## What it does
AutoNest lets customers find auto parts that fit their car, order them, and track delivery. Workshops get trade orders that a Store Manager approves. Warehouse staff pack and dispatch orders, riders deliver them, and an Administrator manages parts, prices and users.

## Pages (5)
| Page | File | Purpose |
|---|---|---|
| Catalog | `index.html` | Search, filter by make, category, brand and price, sort, paginate. Login and register modal. |
| Part details | `product.html?id=` | Specs, stock, "Does this fit my car?" checker, add to cart |
| Cart and checkout | `checkout.html` | Edit cart, validated delivery form, retail or workshop order |
| My orders | `orders.html` | Status timeline, cancel, confirm or report a problem |
| Staff console | `staff.html` | One page, content depends on role (manager, warehouse, rider, admin) |

## Run it
You need Node.js 18 or newer.

```bash
npm install
npm run api     # mock API on http://localhost:3000 (json-server, data/db.json)
npm run web     # website on http://localhost:5500 (second terminal)
```
Open http://localhost:5500. You can also open the folder with VS Code Live Server. The API must be running, because every page loads its data with `fetch`.

To reset the demo data, run `git checkout data/db.json`.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Customer (retail) | customer@autonest.pk | Pass@123 |
| Customer (approved workshop, Rs 100,000 credit) | workshop@autonest.pk | Pass@123 |
| Customer (workshop application pending) | zaid@autonest.pk | Pass@123 |
| Store Manager | manager@autonest.pk | Pass@123 |
| Warehouse Operator | warehouse@autonest.pk | Pass@123 |
| Rider | rider@autonest.pk | Pass@123 |
| Administrator | admin@autonest.pk | Admin@123 |

## Try the full flow
1. Log in as `workshop@autonest.pk`, add parts, check out as **Workshop** (status: Pending Approval).
2. Log in as the manager and approve it. Log in as the warehouse operator, pack it, pick a rider and send it out.
3. Log in as the rider on a phone-width screen, tap Arrived, then Delivered.
4. Back as the workshop, confirm delivery or report a problem. The manager resolves disputes.

## Project structure
```
index.html product.html checkout.html orders.html staff.html
css/style.css          shared styles (mobile first, Grid and Flexbox)
js/common.js           API layer, session, header, login modal, validation
js/catalog.js product.js checkout.js orders.js staff.js
data/db.json           mock database served by json-server
docs/                  API contract, assumptions, use case diagram
```

## How a request flows (for the viva)
Click, then an event handler in the page script, then `api()` in `common.js` calls `fetch` against the mock API, then the JSON response is rendered with template strings into the DOM (passed through `esc()` to prevent HTML injection). Role-based buttons are chosen when rendering, from `order.status` and the logged-in user's `role`.

## Requirements checklist
- Every page loads data with Fetch from the mock API, with no hardcoded parts or orders.
- Dynamic DOM rendering, role and status based actions.
- Validation on every form (CNIC, phone, email, password, stock, credit limit, mandatory failure reason).
- Responsive from 360 px to laptop, large tap targets on the Rider screen, labelled inputs, visible focus, dark mode.
- Documentation in `docs/`.

## Known limits of Phase 1
Login and roles are simulated on the client (passwords sit in the mock data), and stock updates are not atomic. Phase 2 moves both to the server with authentication, a database transaction for each order, and protection against double booking.

## Git workflow
Each member works on their own branch and opens a pull request into `main`. Commit messages should say what changed, because the final contribution statement has to match the Git history.
