# ADR 0001: Hybrid commerce confirmation boundary

## Status

Accepted

## Context

Swiggy Food and Instamart MCP tools can mutate real carts and place real orders. Food carts are restaurant-scoped; Instamart `update_cart` replaces the entire cart. Prompt-only safety is insufficient for a personal localhost app that still talks to production Swiggy carts.

## Decision

- OpenAI agents may call only allowlisted discovery/read MCP tools and may see full tool responses with tracing enabled.
- Cart mutations run only through deterministic server commands gated by a one-time Cart Review hash.
- Checkout, place-order, payment, and tracking tools are never exposed in the MVP.
- Saved Dish Offers and Ingredient Baskets do not expire, but pre-sync revalidation forces another confirmation when live values change.

## Consequences

The model can rank and interpret Swiggy data, but cannot sync carts without an explicit confirmed review. Users finish payment in the Swiggy app. Stale proposals remain usable as drafts until revalidated.
