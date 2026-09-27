# TFC GROUP — BUSINESS ORDER & UI DESIGN FREEZE

## Business implementation order

1. **Fish Transport**
2. **Catering**
3. **Stone Crushing**
4. **Construction**
5. **Pragati Outlet**
6. **Poultry**

Fish Transport is the flagship module and is implemented first. It becomes the reference
architecture for the remaining verticals.

## UI / Theme rule

The existing color profile, theme, typography, spacing, component language, dark-mode
behavior, sidebar/top-navigation treatment, cards, badges, modals, buttons, tables and
receipt/printing conventions are **design-locked**.

The Fish module must extend the existing visual system rather than replacing it.

### Explicitly prohibited during implementation

- No wholesale redesign of the application's visual identity.
- No new global color palette.
- No replacement of the existing dark/light theme system.
- No arbitrary new fonts.
- No replacing the current navigation shell without a compatibility reason.
- No conversion to a different frontend framework unless the repository proves it is required.

### Allowed

- New Fish-specific screens/components that use the existing CSS variables/tokens.
- Additional tables, forms, dashboards and status badges using existing patterns.
- Fish-specific icons where they match the current icon system.
- Responsive layouts that follow the existing breakpoints.
- Additional print layouts for Fish thermal and A4 billing.

## Existing system protection

The current businesses must continue to work:

- Catering
- Stone Mining/Crushing
- Construction
- Pragati Outlet
- Poultry

Shared features must be extended backward-compatibly.

## Fish Transport target lifecycle

Supplier/Mandi
→ Procurement
→ Weighment
→ Lot
→ Vehicle/Driver
→ Shipment
→ Market/Hub
→ Distribution
→ Seller
→ Invoice
→ Payment
→ Seller Ledger
→ Daily Closing
→ Reports

## Engineering principle

Build Fish first, but build it as a reusable business-module framework so the other five
businesses can later adopt the same patterns without duplicating unsafe financial logic.
