import type { BasketLine, CartReview, DishOffer, FoodCustomization, Recipe } from '@shared/types';
import { ResponsiveOverlay } from '@client/components/responsive-overlay';
import { SwiggyLogo } from '@client/components/swiggy-logo';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import {
  basketQueryOptions,
  confirmFoodReview,
  confirmInstamartReview,
  foodProposalQueryOptions,
  generateBasket,
  generateFoodOffers,
  prepareFoodReview,
  prepareInstamartReview,
  selectFoodOffer,
  swiggyStatusQueryOptions,
  updateBasketLine,
} from '@client/lib/swiggy';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ComponentProps } from 'react';
import { toast } from 'sonner';

export function CommercePanels({ recipe }: { recipe: Recipe }) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery(swiggyStatusQueryOptions);
  const foodQuery = useQuery(foodProposalQueryOptions(recipe.id!));
  const basketQuery = useQuery(basketQueryOptions(recipe.id!));
  const [servings, setServings] = useState(String(recipe.servings ?? 2));
  const [review, setReview] = useState<CartReview | null>(null);
  const [syncedCart, setSyncedCart] = useState<{ kind: 'food' | 'instamart'; cart: unknown } | null>(null);

  const addressId = statusQuery.data?.preferredAddress?.addressId;
  const customization = foodQuery.data?.selectedCustomization ?? null;
  const foodReady = Boolean(foodQuery.data?.selectedOfferId && customization?.resolved);

  const foodOffersMutation = useMutation({
    mutationFn: () => {
      if (!addressId) {
        throw new Error('Choose a preferred Swiggy address in Settings first');
      }
      return generateFoodOffers(recipe.id!, addressId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['food-proposal', recipe.id] });
      toast.success('Dish offers ready');
    },
    onError: (error) => toast.error(error.message),
  });

  const selectMutation = useMutation({
    mutationFn: (input: {
      offerId: string;
      customization?: {
        selectedVariants?: Record<string, string>;
        selectedAddons?: Record<string, string[]>;
      };
    }) => selectFoodOffer(recipe.id!, input.offerId, input.customization),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['food-proposal', recipe.id] });
    },
    onError: (error) => toast.error(error.message),
  });

  const foodReviewMutation = useMutation({
    mutationFn: () => prepareFoodReview(recipe.id!),
    onSuccess: (result) => setReview(result),
    onError: (error) => toast.error(error.message),
  });

  const basketMutation = useMutation({
    mutationFn: () => {
      if (!addressId) {
        throw new Error('Choose a preferred Swiggy address in Settings first');
      }
      return generateBasket(recipe.id!, {
        addressId,
        targetServings: Number(servings) || 1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ingredient-basket', recipe.id] });
      toast.success('Ingredient basket ready');
    },
    onError: (error) => toast.error(error.message),
  });

  const basketLineMutation = useMutation({
    mutationFn: updateBasketLine.bind(null, recipe.id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ingredient-basket', recipe.id] });
    },
    onError: (error) => toast.error(error.message),
  });

  const instamartReviewMutation = useMutation({
    mutationFn: () => prepareInstamartReview(recipe.id!),
    onSuccess: (result) => setReview(result),
    onError: (error) => toast.error(error.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!review) {
        throw new Error('No review to confirm');
      }
      const kind = review.kind;
      const cart =
        kind === 'food'
          ? await confirmFoodReview(recipe.id!, review.id, review.payloadHash)
          : await confirmInstamartReview(recipe.id!, review.id, review.payloadHash);
      return { kind, cart };
    },
    onSuccess: async (result) => {
      setReview(null);
      setSyncedCart(result);
      toast.success(
        result.kind === 'food'
          ? 'Food cart updated on Swiggy. Finish checkout in the Swiggy app.'
          : 'Instamart cart updated on Swiggy. Finish checkout in the Swiggy app.'
      );
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
        <div className='mb-4'>
          <div className='flex items-center gap-2.5'>
            <SwiggyLogo className='size-6' title='Swiggy Food' />
            <h2 className='font-heading text-base font-semibold tracking-tight'>Order on Swiggy Food</h2>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>Find nearby restaurant matches for this dish.</p>
        </div>
        <div className='space-y-3'>
          <Button
            type='button'
            variant='outline'
            className='w-full sm:w-auto'
            onClick={() => foodOffersMutation.mutate()}
            disabled={!statusQuery.data?.connected}
            isLoading={foodOffersMutation.isPending}
            loadingText='Finding dishes…'
          >
            Find nearby dishes
          </Button>
          <div className='space-y-3'>
            {(foodQuery.data?.offers ?? []).map((offer) => {
              const selected = foodQuery.data?.selectedOfferId === offer.id;
              return (
                <div
                  key={offer.id}
                  className={`rounded-2xl border transition-[border-color,box-shadow] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    selected ? 'border-primary bg-background shadow-sm' : 'border-border/80 bg-background/50'
                  }`}
                >
                  <button
                    type='button'
                    className='w-full p-3 text-left transition-colors duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/40 active:scale-[0.995] disabled:opacity-60'
                    onClick={() => selectMutation.mutate({ offerId: offer.id })}
                    disabled={selectMutation.isPending}
                  >
                    <div className='flex gap-3'>
                      <div className='relative size-20 shrink-0'>
                        <div className='size-full overflow-hidden rounded-xl bg-muted'>
                          {offer.imageUrl ? (
                            <img
                              src={offer.imageUrl}
                              alt=''
                              className='size-full object-cover object-center'
                            />
                          ) : (
                            <div className='flex size-full items-center justify-center text-[10px] text-muted-foreground'>
                              No dish photo
                            </div>
                          )}
                        </div>
                        {offer.restaurantImageUrl ? (
                          <img
                            src={offer.restaurantImageUrl}
                            alt=''
                            className='absolute -right-1 -bottom-1 z-10 size-8 rounded-full border-2 border-card object-cover object-center shadow-sm'
                          />
                        ) : null}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <div className='font-medium leading-snug'>{offer.itemName}</div>
                            <div className='mt-0.5 text-sm text-muted-foreground'>{offer.restaurantName}</div>
                          </div>
                          <Badge variant='secondary' className='shrink-0'>
                            ₹{offer.price}
                          </Badge>
                        </div>
                        <div className='mt-1 text-xs text-muted-foreground'>
                          {[
                            offer.rating != null ? `${offer.rating}★` : null,
                            offer.etaMinutes != null ? `${offer.etaMinutes} min` : null,
                            offer.distanceKm != null ? `${offer.distanceKm.toFixed(1)} km` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </div>
                  </button>

                  {selected ? (
                    <div className='space-y-3 border-t border-border px-3 pt-3 pb-3'>
                      {customization ? (
                        <FoodCustomizationPanel
                          customization={customization}
                          disabled={selectMutation.isPending}
                          onVariantChange={(groupId, choiceId) =>
                            selectMutation.mutate({
                              offerId: offer.id,
                              customization: { selectedVariants: { [groupId]: choiceId } },
                            })
                          }
                          onAddonToggle={(groupId, choiceId, checked, max) => {
                            const current = customization.selectedAddons[groupId] ?? [];
                            let next = checked
                              ? [...current, choiceId]
                              : current.filter((id) => id !== choiceId);
                            if (max === 1 && checked) {
                              next = [choiceId];
                            } else if (max != null && next.length > max) {
                              next = next.slice(-max);
                            }
                            selectMutation.mutate({
                              offerId: offer.id,
                              customization: { selectedAddons: { [groupId]: next } },
                            });
                          }}
                        />
                      ) : (
                        <p className='text-xs text-muted-foreground'>Loading customizations…</p>
                      )}

                      <Button
                        type='button'
                        className='w-full'
                        disabled={!foodReady}
                        isLoading={foodReviewMutation.isPending || selectMutation.isPending}
                        loadingText={selectMutation.isPending ? 'Loading options…' : 'Adding to cart…'}
                        onClick={() => foodReviewMutation.mutate()}
                      >
                        Add to cart
                      </Button>
                      {customization && !customization.resolved ? (
                        <p className='text-xs text-muted-foreground'>
                          Choose required variants/add-ons before reviewing.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
        <div className='mb-4'>
          <div className='flex items-center gap-2.5'>
            <SwiggyLogo className='size-6' title='Instamart' />
            <h2 className='font-heading text-base font-semibold tracking-tight'>Order on Instamart</h2>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>Build a grocery basket scaled to your servings.</p>
        </div>
        <div className='space-y-3'>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <Input
              type='number'
              min='1'
              step='any'
              className='h-11 rounded-2xl sm:max-w-36'
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              aria-label='Target servings'
            />
            <Button
              type='button'
              className='w-full sm:w-auto'
              onClick={() => basketMutation.mutate()}
              disabled={!statusQuery.data?.connected}
              isLoading={basketMutation.isPending}
              loadingText='Building…'
            >
              Build basket
            </Button>
          </div>
          <div className='space-y-2'>
            {(basketQuery.data?.lines ?? []).map((line) => (
              <div key={String(line.ingredientId)} className='rounded-2xl border border-border/80 bg-background/50 p-3 text-sm'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <div className='font-medium'>{line.name}</div>
                    <div className='text-muted-foreground'>{line.originalText}</div>
                  </div>
                  <Badge variant='secondary'>{line.status}</Badge>
                </div>
                {line.proposed ? (
                  <div className='mt-2'>
                    {line.proposed.productName} × {line.proposed.quantity}
                    {line.proposed.price != null ? ` · ₹${line.proposed.price}` : ''}
                  </div>
                ) : null}
                {line.alternatives.length > 0 ? (
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {line.alternatives.map((alt) => (
                      <Button
                        key={alt.spinId}
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          basketLineMutation.mutate({
                            ingredientKey: String(line.ingredientId),
                            spinId: alt.spinId,
                            quantity: alt.quantity,
                            included: true,
                          })
                        }
                      >
                        Use {alt.productName}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {(line.optional || line.pantryDefault) && !line.included ? (
                  <Button
                    size='sm'
                    className='mt-2'
                    variant='secondary'
                    onClick={() =>
                      basketLineMutation.mutate({
                        ingredientKey: String(line.ingredientId),
                        included: true,
                      })
                    }
                  >
                    Include
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {basketQuery.data?.estimatedTotal != null ? (
            <p className='text-sm text-muted-foreground'>Estimated total ≈ ₹{basketQuery.data.estimatedTotal}</p>
          ) : null}
          <Button
            type='button'
            variant='secondary'
            className='w-full sm:w-auto'
            disabled={!basketQuery.data}
            isLoading={instamartReviewMutation.isPending}
            loadingText='Preparing review…'
            onClick={() => instamartReviewMutation.mutate()}
          >
            Review Instamart cart sync
          </Button>
        </div>
      </section>

      <ResponsiveOverlay
        key={review ? `review-${review.kind}-${review.id}` : 'review-closed'}
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) {
            setReview(null);
          }
        }}
        title={review?.kind === 'instamart' ? 'Confirm Instamart cart sync' : 'Confirm Food cart sync'}
        description={
          review?.kind === 'instamart'
            ? 'Review grocery items before syncing your Instamart cart. This will not place an order.'
            : 'Review the dish before syncing your Food cart. This will not place an order.'
        }
        footer={
          <Button
            type='button'
            onClick={() => confirmMutation.mutate()}
            isLoading={confirmMutation.isPending}
            loadingText='Updating cart…'
          >
            Confirm cart update
          </Button>
        }
      >
        {review ? (
          <CartReviewSummary
            review={review}
            addressLabel={statusQuery.data?.preferredAddress?.label}
            selectedFoodOffer={
              foodQuery.data?.offers.find((offer) => offer.id === foodQuery.data?.selectedOfferId) ?? null
            }
            customization={customization}
            basketLines={basketQuery.data?.lines ?? []}
          />
        ) : null}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        key={syncedCart ? `synced-${syncedCart.kind}` : 'synced-closed'}
        open={Boolean(syncedCart)}
        onOpenChange={(open) => {
          if (!open) setSyncedCart(null);
        }}
        title={syncedCart?.kind === 'instamart' ? 'Instamart cart updated' : 'Food cart updated'}
        description={
          syncedCart?.kind === 'instamart'
            ? 'Your Instamart cart was updated. Finish checkout in the Swiggy app when you are ready.'
            : 'Your Food cart was updated. Finish checkout in the Swiggy app when you are ready.'
        }
        footer={
          <Button type='button' onClick={() => setSyncedCart(null)}>
            Done
          </Button>
        }
      >
        <SyncedCartSummary cart={syncedCart?.cart} />
      </ResponsiveOverlay>
    </div>
  );
}

function FoodCustomizationPanel({
  customization,
  disabled,
  onVariantChange,
  onAddonToggle,
}: {
  customization: FoodCustomization;
  disabled?: boolean;
  onVariantChange: (groupId: string, choiceId: string) => void;
  onAddonToggle: (groupId: string, choiceId: string, checked: boolean, max: number | null) => void;
}) {
  const hasOptions = customization.variantGroups.length > 0 || customization.addonGroups.length > 0;
  if (!hasOptions) {
    return <p className='text-xs text-muted-foreground'>No customizations required for this item.</p>;
  }

  return (
    <div className='space-y-4'>
      <div>
        <p className='text-sm font-medium'>Customizations</p>
        <p className='text-xs text-muted-foreground'>
          {customization.resolved ? 'Ready to sync' : 'Required options incomplete'}
        </p>
      </div>

      {customization.variantGroups.map((group) => (
        <fieldset key={group.groupId} className='space-y-2' disabled={disabled}>
          <LegendRequired label={group.groupName} required />
          <div className='space-y-2'>
            {group.choices.map((choice) => (
              <label key={choice.id} className='flex cursor-pointer items-start gap-2 text-sm'>
                <input
                  type='radio'
                  className='mt-1'
                  name={`variant-${group.groupId}`}
                  checked={customization.selectedVariants[group.groupId] === choice.id}
                  onChange={() => onVariantChange(group.groupId, choice.id)}
                />
                <span>
                  {choice.name}
                  {choice.price != null ? ` · ₹${choice.price}` : ''}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {customization.addonGroups
        .filter((group) => group.min > 0)
        .map((group) => (
          <AddonGroupFields
            key={group.groupId}
            group={group}
            selectedIds={customization.selectedAddons[group.groupId] ?? []}
            disabled={disabled}
            onAddonToggle={onAddonToggle}
          />
        ))}

      {customization.addonGroups.some((group) => group.min <= 0) ? (
        <details className='rounded-xl bg-muted/40 p-3'>
          <summary className='cursor-pointer text-sm font-medium'>Optional add-ons</summary>
          <div className='mt-3 space-y-4'>
            {customization.addonGroups
              .filter((group) => group.min <= 0)
              .map((group) => (
                <AddonGroupFields
                  key={group.groupId}
                  group={group}
                  selectedIds={customization.selectedAddons[group.groupId] ?? []}
                  disabled={disabled}
                  onAddonToggle={onAddonToggle}
                />
              ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function AddonGroupFields({
  group,
  selectedIds,
  disabled,
  onAddonToggle,
}: {
  group: FoodCustomization['addonGroups'][number];
  selectedIds: string[];
  disabled?: boolean;
  onAddonToggle: (groupId: string, choiceId: string, checked: boolean, max: number | null) => void;
}) {
  const required = group.min > 0;
  const selected = new Set(selectedIds);
  const useRadio = group.max === 1;
  return (
    <fieldset className='space-y-2' disabled={disabled}>
      <LegendRequired
        label={group.groupName}
        required={required}
        hint={
          group.max != null
            ? `Pick ${group.min === group.max ? group.min : `${group.min}-${group.max}`}`
            : group.min > 0
              ? `Pick at least ${group.min}`
              : 'Optional'
        }
      />
      <div className='space-y-2'>
        {group.choices.map((choice) => (
          <label key={choice.id} className='flex cursor-pointer items-start gap-2 text-sm'>
            <input
              type={useRadio ? 'radio' : 'checkbox'}
              className='mt-1'
              name={useRadio ? `addon-${group.groupId}` : undefined}
              checked={selected.has(choice.id)}
              onChange={(event) => onAddonToggle(group.groupId, choice.id, event.target.checked, group.max)}
            />
            <span>
              {choice.name}
              {choice.price != null ? ` · ₹${choice.price}` : ''}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LegendRequired({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <Legend className='text-sm font-medium'>
      {label}
      {required ? <span className='text-destructive'> *</span> : null}
      {hint ? <span className='ml-2 text-xs font-normal text-muted-foreground'>{hint}</span> : null}
    </Legend>
  );
}

function Legend({ className, ...props }: ComponentProps<'legend'>) {
  return <legend className={className} {...props} />;
}

function CartReviewSummary({
  review,
  addressLabel,
  selectedFoodOffer,
  customization,
  basketLines,
}: {
  review: CartReview;
  addressLabel?: string | null;
  selectedFoodOffer: Pick<DishOffer, 'itemName' | 'restaurantName' | 'price'> | null;
  customization: FoodCustomization | null;
  basketLines: BasketLine[];
}) {
  const payload =
    review.proposedPayload && typeof review.proposedPayload === 'object'
      ? (review.proposedPayload as Record<string, unknown>)
      : {};

  const productNames = new Map<string, string>();
  for (const line of basketLines) {
    if (line.proposed?.spinId) {
      productNames.set(line.proposed.spinId, line.proposed.productName);
    }
    for (const alt of line.alternatives) {
      productNames.set(alt.spinId, alt.productName);
    }
  }

  const instamartItems = Array.isArray(payload.items)
    ? payload.items.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const spinId = typeof row.spinId === 'string' ? row.spinId : null;
        const quantity = typeof row.quantity === 'number' ? row.quantity : null;
        if (!spinId || quantity == null) return [];
        return [{ spinId, quantity, name: productNames.get(spinId) ?? 'Instamart item' }];
      })
    : [];

  const restaurantName =
    typeof payload.restaurantName === 'string' ? payload.restaurantName : selectedFoodOffer?.restaurantName;

  const selectedLabels: string[] = [];
  if (customization) {
    for (const group of customization.variantGroups) {
      const choiceId = customization.selectedVariants[group.groupId];
      const choice = group.choices.find((entry) => entry.id === choiceId);
      if (choice) selectedLabels.push(`${group.groupName}: ${choice.name}`);
    }
    for (const group of customization.addonGroups) {
      const choiceIds = customization.selectedAddons[group.groupId] ?? [];
      for (const choiceId of choiceIds) {
        const choice = group.choices.find((entry) => entry.id === choiceId);
        if (choice) selectedLabels.push(`${group.groupName}: ${choice.name}`);
      }
    }
  }

  return (
    <div className='space-y-4 text-sm'>
      <div className='space-y-1'>
        <p className='text-muted-foreground'>Delivery address</p>
        <p className='font-medium'>
          {addressLabel ? `${addressLabel} · ` : null}
          {review.addressDisplay ?? 'Selected address'}
        </p>
      </div>

      {review.warnings.map((warning) => (
        <p key={warning} className='rounded-xl bg-destructive/10 px-3 py-2 text-destructive'>
          {warning}
        </p>
      ))}

      {review.kind === 'food' ? (
        <div className='rounded-xl border border-border bg-muted/40 p-3'>
          <p className='text-muted-foreground'>Adding to Food cart</p>
          <p className='mt-1 text-base font-medium'>{selectedFoodOffer?.itemName ?? 'Selected dish'}</p>
          <p className='text-muted-foreground'>{restaurantName ?? 'Restaurant'}</p>
          {selectedFoodOffer ? <p className='mt-2 font-medium'>₹{selectedFoodOffer.price} · Qty 1</p> : null}
          {selectedLabels.length > 0 ? (
            <ul className='mt-2 space-y-1 text-xs text-muted-foreground'>
              {selectedLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className='space-y-2'>
          <p className='text-muted-foreground'>Instamart cart will contain</p>
          <ul className='space-y-2'>
            {instamartItems.map((item) => (
              <li key={item.spinId} className='rounded-xl border border-border bg-muted/40 px-3 py-2'>
                <div className='font-medium'>{item.name}</div>
                <div className='text-muted-foreground'>Qty {item.quantity}</div>
              </li>
            ))}
          </ul>
          {instamartItems.length === 0 ? (
            <p className='text-muted-foreground'>No items in the proposed cart.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SyncedCartSummary({ cart }: { cart: unknown }) {
  const root = cart && typeof cart === 'object' ? (cart as Record<string, unknown>) : null;
  const data =
    root?.data && typeof root.data === 'object' && ((root.data as Record<string, unknown>).items || (root.data as Record<string, unknown>).cart_id)
      ? (root.data as Record<string, unknown>)
      : root;
  const items = Array.isArray(data?.items) ? data.items : [];
  const restaurant = data?.restaurant && typeof data.restaurant === 'object' ? (data.restaurant as Record<string, unknown>) : null;
  const pricing = data?.pricing && typeof data.pricing === 'object' ? (data.pricing as Record<string, unknown>) : null;

  return (
    <div className='space-y-3 text-sm'>
      {restaurant?.name ? <p className='font-medium'>{String(restaurant.name)}</p> : null}
      <ul className='space-y-2'>
        {items.map((item, index) => {
          const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          const name = String(row.name ?? row.productName ?? row.product_name ?? 'Item');
          return (
            <li
              key={String(row.menu_item_id ?? row.spinId ?? row.spin_id ?? index)}
              className='rounded-xl border border-border bg-muted/40 px-3 py-2'
            >
              <div className='font-medium'>{name}</div>
              <div className='text-muted-foreground'>
                Qty {String(row.quantity ?? 1)}
                {row.final_price != null
                  ? ` · ₹${String(row.final_price)}`
                  : row.price != null
                    ? ` · ₹${String(row.price)}`
                    : ''}
              </div>
            </li>
          );
        })}
      </ul>
      {pricing?.to_pay != null ? <p className='font-medium'>To pay ≈ ₹{String(pricing.to_pay)}</p> : null}
      {items.length === 0 ? <p className='text-muted-foreground'>Cart details unavailable.</p> : null}
    </div>
  );
}
