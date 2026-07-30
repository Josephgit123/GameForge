export type Role = 'CUSTOMER' | 'PUBLISHER' | 'ADMIN';
export type GameStatus = 'DRAFT' | 'PUBLISHED' | 'DELISTED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
export type PromotionType = 'PERCENTAGE' | 'FIXED_AMOUNT';

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
}

export interface AuthResponse {
  token: string;
  user: User;
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

export interface SalesPoint {
  date: string;
  totalRevenue: number;
  orderCount: number;
}

export interface PublisherRevenue {
  publisherId: string;
  publisherEmail: string;
  totalRevenue: number;
  gamesSold: number;
}
