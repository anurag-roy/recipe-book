import type { DishOffer } from '@shared/types';

function normalized(value: number | null | undefined, min: number, max: number, higherIsBetter: boolean): number {
  if (value === null || value === undefined || max === min) return 0.5;
  const ratio = (value - min) / (max - min);
  return higherIsBetter ? ratio : 1 - ratio;
}

export function confidenceAdjustedRating(offer: DishOffer): number {
  const rating = offer.rating ?? 0;
  const reviews = offer.ratingCount ?? 0;
  return rating * (reviews / (reviews + 25));
}

export function rankDishOffers(offers: DishOffer[]): DishOffer[] {
  const ratings = offers.map(confidenceAdjustedRating);
  const prices = offers.map((offer) => offer.price);
  const travel = offers.map((offer) => offer.etaMinutes ?? offer.distanceKm ?? 0);
  const range = (values: number[]) => [Math.min(...values), Math.max(...values)] as const;
  const [minRating, maxRating] = range(ratings);
  const [minPrice, maxPrice] = range(prices);
  const [minTravel, maxTravel] = range(travel);
  return offers
    .map((offer, index) => ({
      ...offer,
      score:
        normalized(ratings[index], minRating, maxRating, true) * 0.35 +
        normalized(travel[index], minTravel, maxTravel, false) * 0.25 +
        normalized(offer.price, minPrice, maxPrice, false) * 0.4,
    }))
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
}
