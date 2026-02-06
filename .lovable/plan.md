
# Update Stripe Pro Product Description

## Change
Remove the specific placement fee pricing details from the Stripe product description.

## Update Details

| Field | Current | New |
|-------|---------|-----|
| **Description** | Pro subscription with up to 5 facility listings, 20% off all lead unlocks, 20% off placement fees ($800 vs $1,000 domestic, $2,400 vs $3,000 international), featured homepage placement, priority search ranking, and Pro badge on your profile. | Pro subscription with up to 5 facility listings, 20% off all lead unlocks, 20% off placement fees, featured homepage placement, priority search ranking, and Pro badge on your profile. |

## Implementation
1. Use Stripe API to update product `prod_Tbyz1bf6iYyzYd` with the simplified description
2. Update `src/hooks/useSubscription.ts` to fix the unlock price text ($39-49 range)
