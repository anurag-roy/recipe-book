import type { DishOffer, FoodCustomization, FoodOptionGroup } from '@shared/types';
import { callSwiggyTool } from './mcp';

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function normalizeMax(value: unknown): number | null {
  const max = asNumber(value);
  if (max === null) return null;
  if (max <= 0) return null; // 0 / -1 mean unlimited in Swiggy docs
  return max;
}

function parseAddonGroups(raw: unknown): FoodOptionGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((group) => {
    const record = asRecord(group);
    if (!record) return [];
    const groupId = asString(record.groupId ?? record.group_id);
    const groupName = asString(record.groupName ?? record.group_name ?? record.name) ?? 'Options';
    if (!groupId) return [];
    const choices = (Array.isArray(record.choices) ? record.choices : []).flatMap((choice) => {
      const choiceRecord = asRecord(choice);
      if (!choiceRecord) return [];
      const id = asString(choiceRecord.id ?? choiceRecord.choice_id ?? choiceRecord.choiceId);
      const name = asString(choiceRecord.name);
      if (!id || !name) return [];
      return [{ id, name, price: asNumber(choiceRecord.price) }];
    });
    if (choices.length === 0) return [];
    return [
      {
        groupId,
        groupName,
        min: asNumber(record.minAddons ?? record.min) ?? 0,
        max: normalizeMax(record.maxAddons ?? record.max),
        choices,
      },
    ];
  });
}

function parseVariantGroups(item: Record<string, unknown>): {
  variantFormat: FoodCustomization['variantFormat'];
  variantGroups: FoodOptionGroup[];
} {
  if (Array.isArray(item.variantsV2) && item.variantsV2.length > 0) {
    const variantGroups = item.variantsV2.flatMap((group) => {
      const record = asRecord(group);
      if (!record) return [];
      const groupId = asString(record.groupId ?? record.group_id);
      const groupName = asString(record.name ?? record.groupName ?? record.group_name) ?? 'Variant';
      if (!groupId) return [];
      const variations = Array.isArray(record.variations) ? record.variations : [];
      const choices = variations.flatMap((variation) => {
        const choiceRecord = asRecord(variation);
        if (!choiceRecord) return [];
        const id = asString(choiceRecord.id ?? choiceRecord.variation_id ?? choiceRecord.variationId);
        const name = asString(choiceRecord.name);
        if (!id || !name) return [];
        return [{ id, name, price: asNumber(choiceRecord.price) }];
      });
      if (choices.length === 0) return [];
      return [{ groupId, groupName, min: 1, max: 1, choices }];
    });
    return { variantFormat: 'variantsV2', variantGroups };
  }

  const legacy = item.variations ?? item.variants;
  if (Array.isArray(legacy) && legacy.length > 0) {
    // Flatten legacy into a single required group when structure is a flat list,
    // or preserve grouped shape when present.
    const first = asRecord(legacy[0]);
    if (first && (Array.isArray(first.variations) || Array.isArray(first.choices))) {
      return {
        variantFormat: 'variants',
        variantGroups: parseAddonGroups(
          legacy.map((group) => {
            const record = asRecord(group);
            if (!record) return group;
            return {
              ...record,
              groupId: record.groupId ?? record.group_id,
              groupName: record.groupName ?? record.name,
              choices: record.choices ?? record.variations,
              minAddons: 1,
              maxAddons: 1,
            };
          })
        ),
      };
    }

    const choices = legacy.flatMap((variation) => {
      const choiceRecord = asRecord(variation);
      if (!choiceRecord) return [];
      const id = asString(choiceRecord.id ?? choiceRecord.variation_id ?? choiceRecord.variationId);
      const name = asString(choiceRecord.name);
      if (!id || !name) return [];
      return [{ id, name, price: asNumber(choiceRecord.price) }];
    });
    if (choices.length > 0) {
      return {
        variantFormat: 'variants',
        variantGroups: [
          {
            groupId: asString(first?.group_id ?? first?.groupId) ?? 'default',
            groupName: asString(first?.group_name ?? first?.groupName) ?? 'Variant',
            min: 1,
            max: 1,
            choices,
          },
        ],
      };
    }
  }

  return { variantFormat: 'none', variantGroups: [] };
}

function defaultVariantSelectionFromRaw(
  groups: FoodOptionGroup[],
  item: Record<string, unknown>
): Record<string, string> {
  const selected: Record<string, string> = {};
  const variantGroups = Array.isArray(item.variantsV2)
    ? item.variantsV2
    : Array.isArray(item.variations)
      ? item.variations
      : [];
  for (const group of variantGroups) {
    const record = asRecord(group);
    if (!record) continue;
    const groupId = asString(record.groupId ?? record.group_id);
    if (!groupId || selected[groupId]) continue;
    const variations = Array.isArray(record.variations) ? record.variations : [];
    const preferred = variations.find((variation) => asRecord(variation)?.default === 1) ?? variations[0];
    const preferredId = asString(asRecord(preferred)?.id ?? asRecord(preferred)?.variation_id);
    if (preferredId && groups.some((entry) => entry.groupId === groupId)) {
      selected[groupId] = preferredId;
    }
  }
  for (const group of groups) {
    if (!selected[group.groupId] && group.choices.length === 1) {
      selected[group.groupId] = group.choices[0]!.id;
    }
  }
  return selected;
}

function defaultAddonSelection(groups: FoodOptionGroup[]): Record<string, string[]> {
  const selected: Record<string, string[]> = {};
  for (const group of groups) {
    if (group.min <= 0) continue;
    if (group.choices.length === 1) {
      selected[group.groupId] = [group.choices[0]!.id];
    }
  }
  return selected;
}

export function isCustomizationResolved(customization: FoodCustomization): boolean {
  for (const group of customization.variantGroups) {
    const selected = customization.selectedVariants[group.groupId];
    if (!selected) return false;
  }
  for (const group of customization.addonGroups) {
    if (group.min <= 0) continue;
    const selected = customization.selectedAddons[group.groupId] ?? [];
    if (selected.length < group.min) return false;
    if (group.max !== null && selected.length > group.max) return false;
  }
  return true;
}

export function buildCartItemFromCustomization(customization: FoodCustomization): Record<string, unknown> {
  const cartItem: Record<string, unknown> = {
    menu_item_id: customization.menuItemId,
    quantity: 1,
  };

  if (customization.variantFormat === 'variantsV2') {
    cartItem.variantsV2 = Object.entries(customization.selectedVariants).map(([groupId, variationId]) => ({
      group_id: groupId,
      variation_id: variationId,
    }));
  } else if (customization.variantFormat === 'variants') {
    cartItem.variants = Object.entries(customization.selectedVariants).map(([groupId, variationId]) => {
      const group = customization.variantGroups.find((entry) => entry.groupId === groupId);
      const choice = group?.choices.find((entry) => entry.id === variationId);
      return {
        group_id: groupId,
        variation_id: variationId,
        ...(choice?.name ? { name: choice.name } : {}),
        ...(choice?.price != null ? { price: choice.price } : {}),
      };
    });
  }

  const addons = Object.entries(customization.selectedAddons).flatMap(([groupId, choiceIds]) => {
    const group = customization.addonGroups.find((entry) => entry.groupId === groupId);
    return choiceIds.flatMap((choiceId) => {
      const choice = group?.choices.find((entry) => entry.id === choiceId);
      return [
        {
          group_id: groupId,
          choice_id: choiceId,
          ...(choice?.name ? { name: choice.name } : {}),
          ...(choice?.price != null ? { price: choice.price } : {}),
        },
      ];
    });
  });
  if (addons.length > 0) {
    cartItem.addons = addons;
  }

  return cartItem;
}

function findDetailedItem(result: unknown, offer: DishOffer): Record<string, unknown> | null {
  const root = asRecord(result);
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(asRecord(root?.data)?.items)
      ? (asRecord(root?.data)?.items as unknown[])
      : [];
  const exact = items
    .map(asRecord)
    .find((item) => item && asString(item.menu_item_id ?? item.menuItemId) === offer.menuItemId);
  if (exact) return exact;
  return items.map(asRecord).find(Boolean) ?? null;
}

export async function fetchOfferCustomization(
  offer: DishOffer,
  addressId: string,
  previous?: FoodCustomization | null
): Promise<FoodCustomization> {
  const detailed = await callSwiggyTool('food', 'search_menu', {
    addressId,
    query: offer.itemName,
    restaurantIdOfAddedItem: offer.restaurantId,
  });
  const item = findDetailedItem(detailed, offer);
  if (!item) {
    return {
      menuItemId: offer.menuItemId,
      itemName: offer.itemName,
      variantFormat: 'none',
      variantGroups: [],
      addonGroups: [],
      selectedVariants: {},
      selectedAddons: {},
      resolved: true,
    };
  }

  const { variantFormat, variantGroups } = parseVariantGroups(item);
  const addonGroups = parseAddonGroups(item.addons);
  const selectedVariants =
    previous?.menuItemId === offer.menuItemId && Object.keys(previous.selectedVariants).length > 0
      ? previous.selectedVariants
      : defaultVariantSelectionFromRaw(variantGroups, item);
  const selectedAddons =
    previous?.menuItemId === offer.menuItemId && Object.keys(previous.selectedAddons).length > 0
      ? previous.selectedAddons
      : defaultAddonSelection(addonGroups);

  const customization: FoodCustomization = {
    menuItemId: offer.menuItemId,
    itemName: asString(item.name) ?? offer.itemName,
    variantFormat,
    variantGroups,
    addonGroups,
    selectedVariants,
    selectedAddons,
    resolved: false,
  };
  customization.resolved = isCustomizationResolved(customization);
  return customization;
}

export function applyCustomizationSelection(
  current: FoodCustomization,
  selection: {
    selectedVariants?: Record<string, string>;
    selectedAddons?: Record<string, string[]>;
  }
): FoodCustomization {
  const selectedVariants = { ...current.selectedVariants, ...selection.selectedVariants };
  const selectedAddons = { ...current.selectedAddons, ...selection.selectedAddons };

  // Clamp addon selections to max
  for (const group of current.addonGroups) {
    const values = selectedAddons[group.groupId];
    if (!values) continue;
    if (group.max !== null && values.length > group.max) {
      selectedAddons[group.groupId] = values.slice(0, group.max);
    }
  }

  const next: FoodCustomization = {
    ...current,
    selectedVariants,
    selectedAddons,
    resolved: false,
  };
  next.resolved = isCustomizationResolved(next);
  return next;
}
