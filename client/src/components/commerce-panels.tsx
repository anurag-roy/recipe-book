import type { BasketLine, CartReview, DishOffer, Recipe } from '@shared/types';
import { ResponsiveOverlay } from '@client/components/responsive-overlay';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
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
import { useState } from 'react';
import { toast } from 'sonner';

export function CommercePanels({ recipe }: { recipe: Recipe }) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery(swiggyStatusQueryOptions);
  const foodQuery = useQuery(foodProposalQueryOptions(recipe.id!));
  const basketQuery = useQuery(basketQueryOptions(recipe.id!));
  const [servings, setServings] = useState(String(recipe.servings ?? 2));
  const [review, setReview] = useState<CartReview | null>(null);

  const addressId = statusQuery.data?.preferredAddress?.addressId;

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
    mutationFn: (offerId: string) => selectFoodOffer(recipe.id!, offerId),
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
      if (review.kind === 'food') {
        return confirmFoodReview(recipe.id!, review.id, review.payloadHash);
      }
      return confirmInstamartReview(recipe.id!, review.id, review.payloadHash);
    },
    onSuccess: async () => {
      toast.success('Cart updated on Swiggy. Complete checkout in the Swiggy app.');
      setReview(null);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>Order on Swiggy Food</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Button
            type='button'
            onClick={() => foodOffersMutation.mutate()}
            disabled={!statusQuery.data?.connected}
            isLoading={foodOffersMutation.isPending}
            loadingText='Finding dishes…'
          >
            Find nearby dishes
          </Button>
          <div className='space-y-2'>
            {(foodQuery.data?.offers ?? []).map((offer) => (
              <button
                key={offer.id}
                type='button'
                className={`w-full rounded-xl border p-3 text-left ${
                  foodQuery.data?.selectedOfferId === offer.id
                    ? 'border-primary bg-accent'
                    : 'border-border hover:bg-muted'
                }`}
                onClick={() => selectMutation.mutate(offer.id)}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <div className='font-medium'>{offer.itemName}</div>
                    <div className='text-sm text-muted-foreground'>{offer.restaurantName}</div>
                  </div>
                  <Badge>₹{offer.price}</Badge>
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
              </button>
            ))}
          </div>
          <Button
            type='button'
            variant='secondary'
            disabled={!foodQuery.data?.selectedOfferId}
            isLoading={foodReviewMutation.isPending}
            loadingText='Preparing review…'
            onClick={() => foodReviewMutation.mutate()}
          >
            Review Food cart sync
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order on Instamart</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex gap-2'>
            <Input
              type='number'
              min='1'
              step='any'
              value={servings}
              onChange={(event) => setServings(event.target.value)}
              aria-label='Target servings'
            />
            <Button
              type='button'
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
              <div key={String(line.ingredientId)} className='rounded-xl border border-border p-3 text-sm'>
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
            disabled={!basketQuery.data}
            isLoading={instamartReviewMutation.isPending}
            loadingText='Preparing review…'
            onClick={() => instamartReviewMutation.mutate()}
          >
            Review Instamart cart sync
          </Button>
        </CardContent>
      </Card>

      <ResponsiveOverlay
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) {
            setReview(null);
          }
        }}
        title={review?.kind === 'food' ? 'Confirm Food cart sync' : 'Confirm Instamart cart sync'}
        description='This updates your real Swiggy cart. It will not place an order.'
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
            basketLines={basketQuery.data?.lines ?? []}
          />
        ) : null}
      </ResponsiveOverlay>
    </div>
  );
}

function CartReviewSummary({
  review,
  addressLabel,
  selectedFoodOffer,
  basketLines,
}: {
  review: CartReview;
  addressLabel?: string | null;
  selectedFoodOffer: Pick<DishOffer, 'itemName' | 'restaurantName' | 'price'> | null;
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
