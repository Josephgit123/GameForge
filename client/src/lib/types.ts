export type Role = 'CUSTOMER' | 'PUBLISHER' | 'ADMIN';
export type GameStatus = 'DRAFT' | 'PUBLISHED' | 'DELISTED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type SubscriptionStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}

export interface Game {
  id: string;
  publisherId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  status: GameStatus;
  coverImageUrl: string | null;
  coverVideoUrl: string | null;
  genre: string | null;
  platform: string | null;
  screenshotUrls: string[];
  systemRequirements: string | null;
  createdAt: string;
  publisherName: string;
}

export interface TopSellerEntry {
  game: Game;
  unitsSold: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  // Only present on a publisher signup response — null if Create Merchant
  // failed, absent entirely for customer signups/logins.
  surfboardOnboarding?: { applicationId: string; webKybUrl: string } | null;
}

export interface OrderItem {
  id: string;
  gameId: string;
  priceAtPurchase: number;
  game: Game;
}

export interface Refund {
  id: string;
  orderId: string;
  surfboardRefundId: string | null;
  status: RefundStatus;
  reason: string;
  amount: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  refunds: Refund[];
  // Already present on the backend's Order model/response — not previously
  // modeled client-side. Which merchant actually processed this order.
  surfboardMerchantId?: string | null;
}

export interface LibraryEntry {
  id: string;
  gameId: string;
  orderId: string;
  acquiredAt: string;
  game: Game;
}

export interface RefundQueueEntry extends Refund {
  order: Order & { customer: { email: string } };
}

export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  status: string;
}

export interface Promotion {
  id: string;
  code: string;
  type: PromotionType;
  value: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  _count?: { usages: number };
}

export interface PublisherSalesPoint {
  date: string;
  totalRevenue: number;
  unitsSold: number;
}

export interface PublisherGameRevenue {
  gameId: string;
  title: string;
  unitsSold: number;
  totalRevenue: number;
}

export interface PublisherStatusInfo {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  surfboardMerchantId: string | null;
  surfboardApplicationId: string | null;
  webKybUrl: string | null;
  storeName: string | null;
  merchantVerified: boolean;
  notifyOnNewOrder: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  publisher: PublisherStatusInfo | null;
}

export interface AdminTransaction {
  id: string;
  surfboardOrderId: string | null;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  createdAt: string;
  customer: { email: string };
  items: { id: string; gameId: string; priceAtPurchase: number; game: { title: string } }[];
  refunds: Refund[];
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  cardBrand: string | null;
  truncatedPan: string | null;
  amount: number;
  currency: string;
  discountPercent: number;
  currentPeriodEnd: string | null;
  createdAt: string;
  cancelledAt: string | null;
}

export interface SubscriptionCharge {
  id: string;
  surfboardOrderId: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED';
  amount: number;
  currency: string;
  createdAt: string;
}

export interface AdminSubscription extends Subscription {
  customer: { email: string };
  charges: SubscriptionCharge[];
}

export interface MerchantAddress {
  careOf: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  countryCode: string;
  postalCode: string;
}

export interface MerchantDetails {
  merchantId: string;
  partnerId: string;
  merchantName: string;
  merchantLanguage: string;
  merchantLogoUrl?: string;
  email: string;
  companyId: string;
  countryCode: string;
  mccCode: number;
  phoneNumber: string;
  merchantType: string;
  currencyCode: string;
  acquirerMID: string;
  address: MerchantAddress;
  createdAt?: string;
  totalNumberOfTransaction?: string;
  totalAmountOfTransaction?: string;
  lastTransactionAt?: string | null;
}

export interface PaymentMethodEntry {
  paymentMethodId: string;
  paymentMethod: string;
}

export interface ActivatePaymentMethodResult {
  method: string;
  status: string;
  paymentMethodId?: string;
  message?: string;
}

export interface MerchantBranding {
  backgroundColor?: string;
  brandColor?: string;
  footerColor?: string;
  accentColor?: string;
  rectShape?: string;
  fontType?: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryCoverImage?: string;
  secondaryCoverImage?: string;
}

// Real-world reference data from RAWG (see server/src/routes/discover.ts).
// Informational only — deliberately has no price/currency and no relation
// to Game/Order/checkout. Never render a buy/cart/wishlist control against
// this type.
export interface RawgGame {
  id: string;
  rawgId: number;
  slug: string;
  name: string;
  description: string | null;
  backgroundImage: string | null;
  released: string | null;
  rating: number | null;
  metacritic: number | null;
  esrbRating: string | null;
  genres: string[];
  platforms: string[];
}
