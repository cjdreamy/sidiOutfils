# Sidi Outfits — Security Specification & Red Team Audit (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Public Browsing Without Auth Gate (`products`)**:
   - Storefront customers must be able to browse published catalog items (`isPublished == true`) without signing in first.
   - Only verified authenticated owners (`isAdmin()`) can create, update, or delete products, or decrement stock during fulfillment, while verified customers can decrement product stock (`quantity`, `soldCount`, `updatedAt`) when placing a valid booking.
2. **Customer Booking Integrity & PII Isolation (`bookings`)**:
   - A booking document contains customer delivery details (`customerName`, `customerPhone`, `deliveryAddress`).
   - Blanket reads (`allow read: if isSignedIn()`) are strictly forbidden.
   - Only the customer who created the booking (`resource.data.customerId == request.auth.uid`) or an authorized store owner (`isAdmin()`) can `get` or `list` bookings.
   - On creation, `incoming().customerId == request.auth.uid`, `incoming().status == 'Pending'`, and `incoming().createdAt == request.time`.
3. **Terminal State Locking (`bookings`)**:
   - Once a booking reaches a terminal status (`Completed` or `Cancelled`), no non-admin updates are permitted.
4. **Strict Key & Volumetric Validation**:
   - Every entity enforces `hasAll` and `hasOnly` on creation, `affectedKeys().hasOnly(...)` on action-based updates, regex ID validation `^[a-zA-Z0-9_\-]+$`, and `.size()` limits on all strings.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on Product Create**: `{ ..., "isFeaturedHack": true }` -> Rejected by `data.keys().hasOnly(...)`.
2. **Identity Spoofing on Booking Create**: Customer `uid_A` submits `{ "customerId": "uid_B", ... }` -> Rejected by `data.customerId == request.auth.uid`.
3. **Unverified Email Admin Spoof**: Attacker sets `email: "cjdreamy402@gmail.com"` with `email_verified: false` -> Rejected by `request.auth.token.email_verified == true`.
4. **PII Blanket Read on Bookings**: Authenticated user `uid_B` attempts `get(/bookings/booking_of_uid_A)` -> Rejected by `isBookingOwner() || isAdmin()`.
5. **Unfiltered List Scraping on Bookings**: Client executes `getDocs(collection(db, 'bookings'))` without `where('customerId', '==', uid)` as non-admin -> Rejected because `allow list` checks `resource.data.customerId == request.auth.uid || isAdmin()`.
6. **Negative Price / Negative Stock Injection**: Product created with `price: -50` or `quantity: -10` -> Rejected by `data.price >= 0 && data.quantity >= 0`.
7. **Denial-of-Wallet 1MB ID Poisoning**: Document created at `/products/<2000-char-id>` -> Rejected by `isValidId(productId)`.
8. **Client Timestamp Forgery**: Booking created with backdated `createdAt` -> Rejected by `incoming().createdAt == request.time`.
9. **Immutable Field Mutation**: Customer updates `customerId` or `createdAt` on an existing booking -> Rejected by `incoming().customerId == existing().customerId && incoming().createdAt == existing().createdAt`.
10. **State Shortcutting on Booking Create**: Customer creates booking directly in `status: 'Completed'` -> Rejected by `incoming().status == 'Pending'`.
11. **Terminal State Re-opening**: Customer attempts to modify a booking whose `existing().status == 'Cancelled'` -> Rejected by terminal state guard.
12. **Value Poisoning on Whitelisted Update Key**: Customer updates `status` to a 500KB string or boolean -> Rejected because `isValidBooking(incoming())` wraps the entire `allow update` block.

## 3. Red Team Audit & Conflict Report

- **`/admins/{adminId}`**:
  - Identity Spoofing: Blocked (`adminId == request.auth.uid && incoming().uid == request.auth.uid`).
  - Resource Poisoning: Blocked (`isValidId(adminId)` and string `.size()` bounds).
- **`/products/{productId}`**:
  - Public Read Safety: Contains only catalog merchandising data (zero user PII). `allow list` checks `resource.data.isPublished == true || isAdmin()`.
  - Stock Adjustment Action: Allows verified customer to decrement stock by bounded positive amount (`incoming().quantity >= 0 && incoming().quantity <= existing().quantity`) while preserving all immutable catalog fields.
- **`/bookings/{bookingId}`**:
  - PII Isolation: Strictly readable only by `resource.data.customerId == request.auth.uid || isAdmin()`.
  - Update Wrapper: `isValidBooking(incoming())` wraps the entire `allow update` expression.
