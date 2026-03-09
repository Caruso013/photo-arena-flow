

## Problem Analysis

From the screenshots and code, I identified **3 issues** preventing coupons from working properly:

### Issue 1: Server enforces minimum R$1 charge
In `mercadopago-checkout/index.ts` line 184:
```typescript
const finalTotal = Math.max(subtotal - totalDiscount, 1); // Mínimo R$ 1
```
A 100% coupon should result in R$0, but the server forces it to R$1 and still sends it to Mercado Pago. There's no "free purchase" flow.

### Issue 2: PaymentModal doesn't display coupon discount
The PaymentModal (lines 306-348) only shows the progressive discount. Even though `appliedCoupon` is received as a prop, it's never rendered in the price summary, so the user sees R$19 instead of R$0.

### Issue 3: No free checkout path
When total = R$0 (100% coupon), the system still tries to create a Mercado Pago payment, which either fails or charges R$1.

---

## Plan

### 1. Add free checkout flow (Cart.tsx + PaymentModal.tsx)
When `finalTotal === 0` after all discounts, bypass the payment modal entirely:
- In `Cart.tsx`: when `finalTotal <= 0`, the "Finalizar Compra" button triggers a direct "free purchase" flow instead of opening the PaymentModal
- Create purchase records directly with status `completed`, register coupon usage, and redirect to success

### 2. Display coupon discount in PaymentModal
Add the coupon discount line in PaymentModal's price summary (between progressive discount and total), showing the applied coupon amount. Also update `totalPrice` calculation to subtract coupon discount.

### 3. Fix server-side minimum to allow R$0
In `mercadopago-checkout/index.ts`, change the minimum from 1 to 0. When `finalTotal === 0`, create purchases as completed without calling Mercado Pago API. This serves as a backend safety net.

### 4. Handle free purchase in the edge function
Add a new code path in the edge function: if `finalTotal <= 0`, skip payment creation, mark purchases as `completed`, register coupon usage, and return success directly.

### Files to modify:
- `src/pages/Cart.tsx` - Add free checkout handler
- `src/components/modals/PaymentModal.tsx` - Display coupon discount in summary + adjust total calculation
- `supabase/functions/mercadopago-checkout/index.ts` - Support zero-total purchases

