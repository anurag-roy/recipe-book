# Food Journal — Domain Glossary

## Recipe

A saved cooking recipe in the personal library. May originate from a pasted text import, a public blog URL import, or manual creation. A Recipe owns ordered ingredients, ordered instructions, tags, optional image object metadata, and optional source evidence (cleaned text + URL).

## Ingredient

One line item belonging to a Recipe. Stores the original source line plus normalized fields: name, quantity or range, unit, preparation note, optional flag, group label, and pantry-default flag.

## Ingredient Requirement

A shopping demand derived from an Ingredient for a chosen target serving count. Scales only compatible numeric quantities. Optional and pantry-default lines are excluded by default but remain visible and opt-in. Qualitative amounts require manual product/quantity choice.

## Instruction

An ordered cooking step belonging to a Recipe.

## Import Job

A persisted background process that turns pasted text or a public URL into a Recipe. Stages include queued, fetching, extracting, structuring, copying image, completed, failed, and duplicate. Successful jobs create a Recipe; failed jobs do not save partial recipes (except image-copy warnings after a successful parse).

## Source Snapshot

Cleaned article text and optional canonical URL retained with an imported Recipe for reproducibility. Raw HTML is not retained.

## Ingredient Basket

An app-local, read-only shopping proposal for a Recipe at a specific address and serving target. Contains proposed Instamart SKU/pack choices, alternatives, quantities, excess, and captured prices. Latest basket per recipe is retained; it does not expire, but must be revalidated before cart sync.

## Basket Line

One Ingredient Requirement mapped to a proposed Instamart product variant (`spinId`), purchased quantity, alternatives, match confidence, and pricing snapshot.

## Dish Offer

A specific menu item from an open nearby restaurant that matches a Recipe dish, with price, rating, ETA/distance, and capture time. At most five offers are shown after ranking.

## Cart Review

A one-time confirmation payload capturing the address, live cart snapshot, proposed mutation, and content hash. Consumed exactly once. If live data changed, a new review is required.

## Food Cart Sync

A deterministic server command that, after Cart Review confirmation, updates the real Swiggy Food cart (`update_food_cart`) and reads it back. Never places an order.

## Instamart Cart Sync

A deterministic server command that, after Cart Review confirmation of the merged replacement payload, replaces the real Instamart cart (`update_cart`) and reads it back. Never checkouts.

## Swiggy Connection

The localhost OAuth 2.1 PKCE session granting MCP tool access for the owner's Swiggy account. Access tokens last five days with no refresh-token issuance in v1.

## Preferred Address

A remembered Swiggy `addressId` and display label. Always refreshed from `get_addresses` and confirmed before Food or Instamart work.
