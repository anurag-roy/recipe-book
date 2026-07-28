import type { SwiggyAddress } from '@shared/types';
import type { SwiggyServer } from '@server/services/swiggy/mcp';

export const DEMO_ADDRESS: SwiggyAddress = {
  addressId: 'demo-addr-koramangala',
  label: 'Home',
  displayAddress: '12th Main, Koramangala 5th Block, Bengaluru 560095',
};

type DemoProduct = {
  spinId: string;
  productName: string;
  packQuantity: number;
  packUnit: string;
  price: number;
  keywords: string[];
};

const products: DemoProduct[] = [
  {
    spinId: 'spin-paneer-200',
    productName: 'Amul Paneer 200 g',
    packQuantity: 200,
    packUnit: 'g',
    price: 95,
    keywords: ['paneer'],
  },
  {
    spinId: 'spin-paneer-500',
    productName: 'Milky Mist Paneer 500 g',
    packQuantity: 500,
    packUnit: 'g',
    price: 210,
    keywords: ['paneer'],
  },
  {
    spinId: 'spin-butter-100',
    productName: 'Amul Butter 100 g',
    packQuantity: 100,
    packUnit: 'g',
    price: 58,
    keywords: ['butter'],
  },
  {
    spinId: 'spin-butter-500',
    productName: 'Amul Butter 500 g',
    packQuantity: 500,
    packUnit: 'g',
    price: 275,
    keywords: ['butter'],
  },
  {
    spinId: 'spin-tomato-500',
    productName: 'Farm Tomatoes 500 g',
    packQuantity: 500,
    packUnit: 'g',
    price: 32,
    keywords: ['tomato', 'tomatoes'],
  },
  {
    spinId: 'spin-tomato-1kg',
    productName: 'Farm Tomatoes 1 kg',
    packQuantity: 1,
    packUnit: 'kg',
    price: 58,
    keywords: ['tomato', 'tomatoes'],
  },
  {
    spinId: 'spin-onion-500',
    productName: 'Onion 500 g',
    packQuantity: 500,
    packUnit: 'g',
    price: 22,
    keywords: ['onion', 'onions'],
  },
  {
    spinId: 'spin-onion-1kg',
    productName: 'Onion 1 kg',
    packQuantity: 1,
    packUnit: 'kg',
    price: 40,
    keywords: ['onion', 'onions'],
  },
  {
    spinId: 'spin-gg-paste-200',
    productName: 'Dabur Hommade Ginger Garlic Paste 200 g',
    packQuantity: 200,
    packUnit: 'g',
    price: 55,
    keywords: ['ginger-garlic paste', 'ginger garlic paste', 'ginger'],
  },
  {
    spinId: 'spin-chilli-100',
    productName: 'MDH Kashmiri Mirch Powder 100 g',
    packQuantity: 100,
    packUnit: 'g',
    price: 72,
    keywords: ['kashmiri chilli powder', 'chilli powder', 'kashmiri'],
  },
  {
    spinId: 'spin-garam-100',
    productName: 'Everest Garam Masala 100 g',
    packQuantity: 100,
    packUnit: 'g',
    price: 68,
    keywords: ['garam masala'],
  },
  {
    spinId: 'spin-cream-200',
    productName: 'Amul Fresh Cream 200 ml',
    packQuantity: 200,
    packUnit: 'ml',
    price: 70,
    keywords: ['fresh cream', 'cream'],
  },
  {
    spinId: 'spin-cream-1l',
    productName: 'Amul Fresh Cream 1 l',
    packQuantity: 1,
    packUnit: 'l',
    price: 245,
    keywords: ['fresh cream', 'cream'],
  },
  {
    spinId: 'spin-kasuri-25',
    productName: 'MDH Kasuri Methi 25 g',
    packQuantity: 25,
    packUnit: 'g',
    price: 45,
    keywords: ['kasuri methi', 'methi'],
  },
  {
    spinId: 'spin-oil-1l',
    productName: 'Fortune Sunflower Oil 1 l',
    packQuantity: 1,
    packUnit: 'l',
    price: 145,
    keywords: ['oil', 'sunflower oil'],
  },
  {
    spinId: 'spin-coriander-100',
    productName: 'Fresh Coriander 100 g',
    packQuantity: 100,
    packUnit: 'g',
    price: 18,
    keywords: ['coriander', 'coriander leaves'],
  },
];

const dishOffers = [
  {
    menuItemId: 'mi-pbm-1',
    itemName: 'Paneer Butter Masala',
    restaurantId: 'rest-punjab-grill',
    restaurantName: 'Punjab Grill',
    price: 329,
    rating: 4.5,
    ratingCount: 2140,
    etaMinutes: 28,
    distanceKm: 1.2,
    availabilityStatus: 'available',
    imageUrl: '/api/images/demo/dish-paneer-butter-masala.jpg',
    restaurantImageUrl: '/api/images/demo/restaurant-punjab-grill.jpg',
    variantsV2: [
      {
        groupId: 'size',
        name: 'Portion',
        variations: [
          { id: 'reg', name: 'Regular', price: 329, default: 1 },
          { id: 'lrg', name: 'Large', price: 429, default: 0 },
        ],
      },
    ],
    addons: [
      {
        groupId: 'bread',
        groupName: 'Pair with bread',
        minAddons: 0,
        maxAddons: 2,
        choices: [
          { id: 'butter-naan', name: 'Butter Naan', price: 69 },
          { id: 'garlic-naan', name: 'Garlic Naan', price: 79 },
          { id: 'tandoori-roti', name: 'Tandoori Roti', price: 39 },
        ],
      },
    ],
  },
  {
    menuItemId: 'mi-bp-2',
    itemName: 'Butter Paneer',
    restaurantId: 'rest-meghana',
    restaurantName: 'Meghana Foods',
    price: 279,
    rating: 4.3,
    ratingCount: 5680,
    etaMinutes: 32,
    distanceKm: 2.4,
    availabilityStatus: 'available',
    imageUrl: '/api/images/demo/dish-butter-paneer.jpg',
    restaurantImageUrl: '/api/images/demo/restaurant-meghana.jpg',
    variantsV2: [
      {
        groupId: 'spice',
        name: 'Spice level',
        variations: [
          { id: 'mild', name: 'Mild', price: 279, default: 1 },
          { id: 'medium', name: 'Medium', price: 279, default: 0 },
          { id: 'spicy', name: 'Spicy', price: 279, default: 0 },
        ],
      },
    ],
    addons: [],
  },
  {
    menuItemId: 'mi-pm-3',
    itemName: 'Paneer Makhani',
    restaurantId: 'rest-dhaba',
    restaurantName: 'Biryani House & Dhaba',
    price: 299,
    rating: 4.4,
    ratingCount: 1825,
    etaMinutes: 35,
    distanceKm: 3.1,
    availabilityStatus: 'available',
    imageUrl: '/api/images/demo/dish-paneer-makhani.jpg',
    restaurantImageUrl: '/api/images/demo/restaurant-dhaba.jpg',
    variantsV2: [
      {
        groupId: 'size',
        name: 'Portion',
        variations: [
          { id: 'half', name: 'Half', price: 199, default: 0 },
          { id: 'full', name: 'Full', price: 299, default: 1 },
        ],
      },
    ],
    addons: [
      {
        groupId: 'rice',
        groupName: 'Add rice',
        minAddons: 0,
        maxAddons: 1,
        choices: [
          { id: 'jeera-rice', name: 'Jeera Rice', price: 129 },
          { id: 'plain-rice', name: 'Steamed Rice', price: 99 },
        ],
      },
    ],
  },
  {
    menuItemId: 'mi-pbm-4',
    itemName: 'Special Paneer Butter Masala',
    restaurantId: 'rest-paradise',
    restaurantName: 'Kapoor\'s Café',
    price: 349,
    rating: 4.6,
    ratingCount: 980,
    etaMinutes: 40,
    distanceKm: 4.2,
    availabilityStatus: 'available',
    imageUrl: '/api/images/demo/dish-paneer-butter-masala.jpg',
    restaurantImageUrl: '/api/images/demo/restaurant-punjab-grill.jpg',
    variantsV2: [],
    addons: [],
  },
  {
    menuItemId: 'mi-pbm-5',
    itemName: 'Creamy Paneer Butter Masala',
    restaurantId: 'rest-homely',
    restaurantName: 'Homely North Indian',
    price: 259,
    rating: 4.2,
    ratingCount: 740,
    etaMinutes: 26,
    distanceKm: 0.9,
    availabilityStatus: 'available',
    imageUrl: '/api/images/demo/dish-butter-paneer.jpg',
    restaurantImageUrl: '/api/images/demo/restaurant-dhaba.jpg',
    variantsV2: [
      {
        groupId: 'size',
        name: 'Portion',
        variations: [{ id: 'std', name: 'Standard', price: 259, default: 1 }],
      },
    ],
    addons: [],
  },
];

const restaurants = [
  {
    id: 'rest-punjab-grill',
    name: 'Punjab Grill',
    imageUrl: '/api/images/demo/restaurant-punjab-grill.jpg',
  },
  {
    id: 'rest-meghana',
    name: 'Meghana Foods',
    imageUrl: '/api/images/demo/restaurant-meghana.jpg',
  },
  {
    id: 'rest-dhaba',
    name: 'Biryani House & Dhaba',
    imageUrl: '/api/images/demo/restaurant-dhaba.jpg',
  },
  {
    id: 'rest-paradise',
    name: "Kapoor's Café",
    imageUrl: '/api/images/demo/restaurant-punjab-grill.jpg',
  },
  {
    id: 'rest-homely',
    name: 'Homely North Indian',
    imageUrl: '/api/images/demo/restaurant-dhaba.jpg',
  },
];

type FoodCartState = {
  addressId: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  items: Array<Record<string, unknown>>;
};

type InstamartCartState = {
  items: Array<{ spinId: string; quantity: number; productName?: string }>;
};

const foodCart: FoodCartState = {
  addressId: null,
  restaurantId: null,
  restaurantName: null,
  items: [],
};

const instamartCart: InstamartCartState = {
  items: [],
};

function normalizeQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function searchProducts(query: string) {
  const q = query.toLowerCase();
  const matched = products.filter((product) =>
    product.keywords.some((keyword) => q.includes(keyword) || keyword.includes(q))
  );
  return {
    products: (matched.length > 0 ? matched : products.slice(0, 3)).map((product) => ({
      spinId: product.spinId,
      productName: product.productName,
      packQuantity: product.packQuantity,
      packUnit: product.packUnit,
      price: product.price,
    })),
  };
}

function searchMenu(args: Record<string, unknown>) {
  const restaurantId = typeof args.restaurantIdOfAddedItem === 'string' ? args.restaurantIdOfAddedItem : null;
  const query = normalizeQuery(args.query);

  let items = dishOffers;
  if (restaurantId) {
    items = dishOffers.filter((offer) => offer.restaurantId === restaurantId);
  } else if (query) {
    items = dishOffers.filter(
      (offer) =>
        offer.itemName.toLowerCase().includes(query) ||
        query.includes('paneer') ||
        query.includes('butter') ||
        query.includes('makhani') ||
        query.includes('masala')
    );
    if (items.length === 0) items = dishOffers;
  }

  return { items };
}

function searchRestaurants(args: Record<string, unknown>) {
  const query = normalizeQuery(args.query);
  const matched = restaurants.filter(
    (restaurant) => !query || restaurant.name.toLowerCase().includes(query) || query.includes(restaurant.name.toLowerCase())
  );
  return { restaurants: matched.length > 0 ? matched : restaurants };
}

function productNameFor(spinId: string): string | undefined {
  return products.find((product) => product.spinId === spinId)?.productName;
}

export function getDemoToolResult(server: SwiggyServer, name: string, args: Record<string, unknown>): unknown {
  if (name === 'get_addresses') {
    return { addresses: [DEMO_ADDRESS] };
  }

  if (server === 'food') {
    switch (name) {
      case 'search_menu':
        return searchMenu(args);
      case 'search_restaurants':
        return searchRestaurants(args);
      case 'get_food_cart':
        return {
          successful: true,
          statusCode: 0,
          data: {
            cart_id: foodCart.items.length > 0 ? 'demo-food-cart' : null,
            restaurantId: foodCart.restaurantId,
            restaurant: foodCart.restaurantId
              ? { id: foodCart.restaurantId, name: foodCart.restaurantName }
              : null,
            items: foodCart.items,
          },
        };
      case 'update_food_cart': {
        const cartItems = Array.isArray(args.cartItems) ? args.cartItems : [];
        foodCart.addressId = typeof args.addressId === 'string' ? args.addressId : DEMO_ADDRESS.addressId;
        foodCart.restaurantId = typeof args.restaurantId === 'string' ? args.restaurantId : null;
        foodCart.restaurantName = typeof args.restaurantName === 'string' ? args.restaurantName : null;
        foodCart.items = cartItems.map((item) => {
          const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          return {
            ...record,
            menu_item_id: record.menu_item_id,
            quantity: record.quantity ?? 1,
            name:
              dishOffers.find((offer) => offer.menuItemId === record.menu_item_id)?.itemName ??
              'Selected dish',
            valid_addons: [],
          };
        });
        return {
          successful: true,
          statusCode: 0,
          data: {
            cart_id: 'demo-food-cart',
            restaurantId: foodCart.restaurantId,
            restaurant: { id: foodCart.restaurantId, name: foodCart.restaurantName },
            items: foodCart.items,
          },
        };
      }
      case 'flush_food_cart':
        foodCart.items = [];
        foodCart.restaurantId = null;
        foodCart.restaurantName = null;
        return { successful: true };
      default:
        throw new Error(`Demo fixture missing for food tool "${name}"`);
    }
  }

  switch (name) {
    case 'search_products':
      return searchProducts(normalizeQuery(args.query));
    case 'get_cart':
      return {
        items: instamartCart.items.map((item) => ({
          spinId: item.spinId,
          quantity: item.quantity,
          productName: item.productName ?? productNameFor(item.spinId),
        })),
      };
    case 'update_cart': {
      const items = Array.isArray(args.items) ? args.items : [];
      instamartCart.items = items.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const record = item as Record<string, unknown>;
        if (typeof record.spinId !== 'string' || typeof record.quantity !== 'number') return [];
        return [
          {
            spinId: record.spinId,
            quantity: record.quantity,
            productName: productNameFor(record.spinId),
          },
        ];
      });
      return { ok: true };
    }
    case 'clear_cart':
      instamartCart.items = [];
      return { ok: true };
    default:
      throw new Error(`Demo fixture missing for Instamart tool "${name}"`);
  }
}
