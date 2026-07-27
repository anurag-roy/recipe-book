export type Pack = {
  spinId: string;
  productName: string;
  packQuantity: number;
  packUnit: string;
  price: number | null;
};
export type PackChoice = { pack: Pack; quantity: number; purchasedAmount: number; excessAmount: number };

const unitFactors: Record<string, { dimension: 'mass' | 'volume' | 'count'; factor: number }> = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  l: { dimension: 'volume', factor: 1000 },
  count: { dimension: 'count', factor: 1 },
  pcs: { dimension: 'count', factor: 1 },
  piece: { dimension: 'count', factor: 1 },
};

export function normalizeAmount(amount: number, unit: string): { dimension: string; amount: number } | null {
  const definition = unitFactors[unit.trim().toLowerCase()];
  return definition ? { dimension: definition.dimension, amount: amount * definition.factor } : null;
}

export function chooseBestPack(requiredAmount: number, requiredUnit: string, packs: Pack[]): PackChoice | null {
  const requirement = normalizeAmount(requiredAmount, requiredUnit);
  if (!requirement) return null;
  const candidates = packs.flatMap((pack) => {
    const normalized = normalizeAmount(pack.packQuantity, pack.packUnit);
    if (!normalized || normalized.dimension !== requirement.dimension) return [];
    const quantity = Math.ceil(requirement.amount / normalized.amount);
    const purchasedAmount = quantity * normalized.amount;
    return [{ pack, quantity, purchasedAmount, excessAmount: purchasedAmount - requirement.amount }];
  });
  return (
    candidates.sort(
      (a, b) => a.excessAmount - b.excessAmount || (a.pack.price ?? Infinity) - (b.pack.price ?? Infinity)
    )[0] ?? null
  );
}
