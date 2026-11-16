# API Contract (Phase 1 mock API)

Base URL: `http://localhost:3000`. Served by json-server 0.17 from `data/db.json`. All bodies are JSON. In Phase 2 the same shapes are served by the real backend, with auth added.

## Resources

**User** `{ id, name, email, password, role: customer|manager|warehouse|rider|admin, phone, cnic, address, accountType: retail|workshop|staff, workshopStatus: none|pending|approved|rejected, creditLimit, creditUsed }`

**Product** `{ id, name, brand, category, price, stock, makes[], description, icon, partNo, fitment: [{make, model, yearFrom, yearTo}] }`

**Order** `{ id, customerId, items: [{productId, name, price, qty}], total, orderType: retail|workshop, status, address, phone, payment, note, riderId, createdAt, history: [{status, at, by}], rejectReason?, failReason?, disputeReason?, resolution? }`

**Vehicle** `{ id, make, models[] }`  **Category** `{ id, name }`

## Order statuses
`Pending Approval` (workshop only), then `Approved`, `Packed`, `Out for Delivery`, `Arrived`, `Delivered`, `Confirmed`.
Side branches: `Cancelled`, `Rejected`, `Failed`, and `Disputed` then `Resolved`.

| From | To | Done by |
|---|---|---|
| (new retail) | Approved | system |
| (new workshop) | Pending Approval | system |
| Pending Approval | Approved / Rejected | Store Manager |
| Pending Approval, Approved | Cancelled | Customer |
| Approved | Packed | Warehouse Operator |
| Packed | Out for Delivery (assigns rider) | Warehouse Operator |
| Out for Delivery | Arrived | Rider (own trips) |
| Arrived | Delivered / Failed | Rider (own trips) |
| Delivered | Confirmed / Disputed | Customer |
| Disputed | Resolved | Store Manager |

## Endpoints

| Method | Path | Used by | Notes |
|---|---|---|---|
| GET | `/products?_page=1&_limit=8&_sort=price&_order=asc&q=&category=&brand=&makes_like=&price_lte=` | Catalog | Header `X-Total-Count` gives the total for pagination |
| GET | `/products/:id` | Product page, checkout | 404 if missing |
| GET | `/products?id=1&id=2` | Checkout | Refresh stock for cart lines |
| POST | `/products` | Admin | Body: Product without `id` |
| PATCH | `/products/:id` | Admin, Warehouse, order flow | Partial update, for example `{ "stock": 12 }` |
| DELETE | `/products/:id` | Admin | |
| GET | `/vehicles`, `/categories` | Filters, fitment checker | |
| GET | `/users?email=`, `/users?cnic=` | Login, duplicate checks | |
| GET | `/users?role=rider`, `/users?role=customer`, `/users?workshopStatus=pending` | Console | |
| POST | `/users` | Register | Body: User without `id` |
| PATCH | `/users/:id` | Manager, Admin, checkout | Workshop decision, credit, role |
| GET | `/orders?customerId=&status=&_sort=id&_order=desc` | My orders, console | |
| GET | `/orders?riderId=` | Rider | Only that rider's trips |
| POST | `/orders` | Checkout | Body: Order without `id` |
| PATCH | `/orders/:id` | All roles | Status change with `history`, `riderId`, reasons |

## Example requests

`POST /orders`
```json
{ "customerId": 1, "items": [{ "productId": 2, "name": "Oil Filter", "price": 650, "qty": 2 }],
  "total": 1300, "orderType": "retail", "status": "Approved", "address": "House 12, Block 5, Karachi",
  "phone": "0300-1234567", "payment": "Cash on delivery", "riderId": null,
  "createdAt": "2026-11-16T10:00:00Z", "history": [{ "status": "Placed", "at": "2026-11-16T10:00:00Z" }] }
```
Response `201` with the created order including `id`.

`PATCH /orders/4` with body `{ "status": "Failed", "failReason": "House locked" }` returns `200` with the updated order.

## Error cases
| Request | Result |
|---|---|
| `GET /products/999` | `404 {}` |
| `PATCH /orders/999` | `404 {}` |
| Cart quantity above stock | Blocked in the frontend before `POST /orders`. The server enforces it in Phase 2 with `409 Conflict` |
| Workshop order above available credit | Blocked in the frontend. Server returns `422` in Phase 2 |
| API not running | Pages show "Cannot reach the API" |

## Role permissions (frontend)
| Role | Can see | Can change |
|---|---|---|
| Customer | Own orders, assigned rider name and phone | Cancel before packing, confirm or dispute |
| Store Manager | All orders and applications | Approve or reject, resolve disputes. Cannot pack or dispatch |
| Warehouse Operator | Approved and packed orders, stock | Pack, assign rider, update stock |
| Rider | Only own trips | Arrived, Delivered, Failed with reason |
| Administrator | Everything | Parts, prices, users and roles |
