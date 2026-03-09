

## Problem Analysis

The pricing issue has two root causes:

1. **No price synchronization**: When a photographer uploads photos and sets a price, that price is stored per-photo but the campaign's `photo_price_display` field is never updated. So each upload batch can have a different price, resulting in albums with mixed pricing.

2. **Incomplete price locking logic**: The `UploadPhotoModal` checks `photo_price_display` to lock pricing, but since it's never written, the lock never activates for photographer-created events.

### Current flow (broken):
- Photographer uploads batch 1 at R$15 → each photo gets price=15, but `photo_price_display` stays NULL
- Photographer uploads batch 2 at R$20 → each photo gets price=20, still no lock
- Result: mixed prices in the same event

### Expected behavior:
- **Photographer-created events**: First upload sets the event price. Subsequent uploads use that price (locked).
- **Admin-created events**: Only admin can set/change `photo_price_display`. Photographer always uses the admin-defined price.

---

## Plan

### 1. Update `backgroundUploadService.ts` — Save price to campaign on first upload
After successfully inserting photos, update the campaign's `photo_price_display` if it's currently NULL (first upload sets the standard). This ensures all future uploads use the same price.

```
// After photo insert succeeds, set campaign price if not already set
await supabase
  .from('campaigns')
  .update({ photo_price_display: task.price })
  .eq('id', task.campaignId)
  .is('photo_price_display', null);
```

### 2. Fix `UploadPhotoModal.tsx` — Correct price lock logic
Current logic locks price when `isAdminCreated || priceAlreadyDefined`. The issue is:
- For photographer's own events, `priceAlreadyDefined` is false because `photo_price_display` is never set
- After fix #1, once the first upload sets it, subsequent uploads will correctly lock

Also need to fix: when price is locked, use the campaign's `photo_price_display` as default instead of hardcoded "10.00".

### 3. Ensure admin-only price editing in `EditEventModal.tsx`
Verify that photographers cannot change `photo_price_display` once set — this is already partially implemented but needs to be confirmed working with the new flow.

### Files to modify:
- `src/lib/backgroundUploadService.ts` — Add campaign price sync after first upload
- `src/components/modals/UploadPhotoModal.tsx` — Fix initial price loading from campaign + improve lock logic

