// Single entry point for every Surfboard API call. Nothing else in the
// codebase should call Surfboard directly — see docs/ARCHITECTURE.md
// #the-surfboardclient-wrapper-pattern for why.
//
// Field shapes below are taken verbatim from Surfboard's own API reference
// (bundled docs in the @surfboardpayments/surf-mcp package's data/api-md/),
// not guessed.

const BASE_URL = process.env.SURFBOARD_API_BASE_URL;
const API_KEY = process.env.SURFBOARD_API_KEY;
const API_SECRET = process.env.SURFBOARD_API_SECRET;
const PARTNER_ID = process.env.SURFBOARD_PARTNER_ID;

if (!BASE_URL || !API_KEY || !API_SECRET || !PARTNER_ID) {
  throw new Error(
    'Surfboard env vars are not fully set (SURFBOARD_API_BASE_URL / SURFBOARD_API_KEY / ' +
      'SURFBOARD_API_SECRET / SURFBOARD_PARTNER_ID) — check server/.env'
  );
}

export class SurfboardApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Surfboard API error (status ${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  merchantId?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'API-KEY': API_KEY as string,
    'API-SECRET': API_SECRET as string,
  };
  if (merchantId) {
    headers['MERCHANT-ID'] = merchantId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const responseBody = isJson ? await res.json() : await res.text();

  // Confirmed live: Surfboard sometimes returns business-logic errors as
  // HTTP 200 with { status: "ERROR", message } and no `data` field (e.g.
  // OR_0035 refunding a non-completed order) — not just via non-2xx status
  // codes. Treat both as the same error type so callers never get a
  // response shape with `data` silently undefined.
  const bodyStatus = isJson && responseBody && typeof responseBody === 'object' ? (responseBody as { status?: string }).status : undefined;

  if (!res.ok || bodyStatus === 'ERROR') {
    throw new SurfboardApiError(res.ok ? 200 : res.status, responseBody);
  }

  return responseBody as T;
}

// --- Billing Plans API ---
// POST /partners/:partnerId/billing-plans
// Needed before Create Merchant will succeed unless the partner has exactly
// one billing plan already (ours currently has zero).

export interface BillingPlanInput {
  id: string;
  cardBrand: string;
  terminalType: string;
  paymentMethod: string;
  planType: 'FIXED' | 'VARIABLE';
  description: string;
  fixedPercentage?: number;
  fixedCost?: number;
  minimumCeiling?: number;
  vatPercentage?: number;
}

export interface CreateBillingPlansResponse {
  status: string;
  message: string;
}

export function createBillingPlans(plans: BillingPlanInput[]) {
  return request<CreateBillingPlansResponse>('POST', `/partners/${PARTNER_ID}/billing-plans`, { plans });
}

// --- Merchant API ---

export interface CreateMerchantInput {
  country: string;
  organisation?: {
    corporateId: string;
    legalName?: string;
    mccCode?: string;
    address?: {
      addressLine1: string;
      addressLine2?: string;
      city: string;
      countryCode: string;
      postalCode: string;
    };
    email?: string;
  };
  controlFields?: {
    transactionPricingPlan?: string;
    generateShortLink?: boolean;
    redirectUrl?: string;
    store?: {
      name: string;
      email: string;
      phoneNumber: { code: string; number: string };
      address: { addressLine1: string; city: string; countryCode: string; postalCode: string };
    };
  };
}

export interface CreateMerchantResponse {
  status: string;
  data: {
    applicationId: string;
    webKybUrl: string;
    merchantId?: string;
    storeId?: string;
    shortLinkUrl?: string;
  };
  message: string;
}

export function createMerchant(input: CreateMerchantInput) {
  return request<CreateMerchantResponse>('POST', `/partners/${PARTNER_ID}/merchants`, input);
}

export type ApplicationStatus =
  | 'APPLICATION_INITIATED'
  | 'APPLICATION_STARTED'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_PENDING_INFORMATION'
  | 'APPLICATION_SIGNED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_COMPLETED'
  | 'APPLICATION_EXPIRED'
  | 'MERCHANT_CREATED';

export interface MerchantStatusResponse {
  status: string;
  data: {
    applicationId: string;
    webKybUrl?: string;
    applicationStatus: ApplicationStatus;
    merchantId?: string;
    storeId?: string;
    billingPlans?: { planId: string; planName: string }[];
  };
  message: string;
}

export function getMerchantStatus(applicationId: string) {
  return request<MerchantStatusResponse>('GET', `/partners/${PARTNER_ID}/merchants/${applicationId}/status`);
}

// --- Terminals API ---
// POST /merchants/:merchantId/stores/:storeId/online-terminals
// A terminal must be registered before orders can be created against it.
// GameForge always uses PaymentPage mode (hosted redirect, no card data
// touches our servers).

export interface RegisterOnlineTerminalResponse {
  status: string;
  data: { terminalId: string; publicKey?: string; registrationStatus?: string };
  message: string;
}

export function registerOnlineTerminal(merchantId: string, storeId: string) {
  return request<RegisterOnlineTerminalResponse>(
    'POST',
    `/merchants/${merchantId}/stores/${storeId}/online-terminals`,
    { onlineTerminalMode: 'PaymentPage' },
    merchantId
  );
}

// --- Orders API ---
// POST /merchants/:merchantId/orders

export interface OrderLineInput {
  id: string;
  name: string;
  quantity: number;
  amount: { regular: number; total: number; currency: string };
  description?: string;
  // Refunds only (web-guides/refund-an-order.md, confirmed): a refund is a
  // new order with negative quantity/amount.total, referencing the original
  // order via purchaseOrderId on each line.
  purchaseOrderId?: string;
}

export interface CreateOrderInput {
  'terminal$id': string;
  referenceId?: string;
  orderLines: OrderLineInput[];
  // Confirmed live (OR_0037 "Invalid total order price"): total must
  // reconcile as regular - campaign (+ shipping/tax) — Surfboard validates
  // this against the order lines, a discounted total with no campaign
  // value explaining the difference is rejected outright.
  totalOrderAmount: { regular: number; total: number; campaign?: number; currency: string };
  customer?: {
    person?: {
      name?: { firstName?: string; lastName?: string };
      email?: string;
    };
  };
  controlFunctions?: {
    online?: {
      // Confirmed documented (guides/online-payments/online-payment-terminals/payment-page.md):
      // Surfboard appends the order ID as a query param when redirecting here.
      redirectUrl?: string;
      failureRedirectUrl?: string;
    };
    // Dynamic webhook mode — Surfboard posts order/payment events here for
    // this order specifically, signed with the Dynamic Webhook Certificate
    // (SURFBOARD_WEBHOOK_SECRET), same verification scheme as a registered
    // webhook. No retries/failure-alert emails in this mode.
    callBackUrl?: string;
    // Refunds only (web-guides/refund-an-order.md, confirmed): initiates
    // payment on the refund order immediately using the refund-appropriate
    // method (CARD_NP recommended for an original CARD payment).
    initiatePaymentsOptions?: {
      paymentMethod: 'CARD' | 'CARD_NP' | 'KLARNA' | 'SWISH';
    };
    includeAdjustmentsForRefund?: boolean;
  };
}

export interface CreateOrderResponse {
  status: string;
  data: {
    orderId: string;
    paymentId?: string;
    // Confirmed live: for a PaymentPage-mode terminal, the hosted checkout
    // URL comes back directly here — no separate Initiate Payment call
    // needed. Redirect the customer straight to this.
    paymentPageLink?: string;
  };
  message: string;
}

export function createOrder(merchantId: string, input: CreateOrderInput) {
  // Confirmed live: /merchants/:merchantId/orders 404s on the real API —
  // the bare /orders path (api-md reference) is correct; MERCHANT-ID is a
  // header only, not part of the path.
  return request<CreateOrderResponse>('POST', '/orders', input, merchantId);
}

// --- Payments API ---
// POST /payments
// Used for gift-card-covered checkouts specifically: createOrder already
// returns paymentPageLink directly for a card payment on a PaymentPage
// terminal, but a gift card that fully covers the order skips the hosted
// page entirely and completes via this call instead.

export interface InitiatePaymentInput {
  orderId: string;
  paymentMethod: 'CARD' | 'CARD_NP' | 'KLARNA' | 'CTOKEN' | 'GIFTCARD';
  terminalId?: string;
  paymentMethodParams?: {
    giftCardId?: string;
  };
}

export interface InitiatePaymentResponse {
  status: string;
  data: {
    paymentId: string;
    paymentUrl?: string;
    qr?: string;
    qrLink?: string;
  };
  message: string;
}

export function initiatePayment(merchantId: string, input: InitiatePaymentInput) {
  return request<InitiatePaymentResponse>('POST', '/payments', input, merchantId);
}

// --- Gift Cards API ---
// POST /giftcards (merchant-scoped — MERCHANT-ID header, no path segment,
// same convention as Orders/Payments)

export interface CreateGiftCardInput {
  cardType: 'FUND' | 'ENTITLEMENT';
  amount?: number; // minor units — confirmed live (the doc's decimal example, e.g. 100.00, is misleading)
  redemptionLimit?: number;
  currency?: string;
  name?: string;
  accessControl?: 'OPEN' | 'RESTRICTED';
  expiryDate?: string; // mm/dd/yyyy or mm-dd-yyyy
  note?: string;
}

export interface CreateGiftCardResponse {
  status: string;
  data: {
    giftCardId: string;
    pan: string; // the actual gift card number — used as our customer-facing redemption code
    name?: string;
    cardType: string;
    amount?: number;
    currency?: string;
    status: string;
    shareableLink?: string;
  };
  message: string;
}

export function createGiftCard(merchantId: string, input: CreateGiftCardInput) {
  return request<CreateGiftCardResponse>('POST', '/giftcards', input, merchantId);
}

// --- Order status ---
// GET /merchants/:merchantId/orders/:orderId/status

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_CANCELLED'
  | 'PARTIAL_PAYMENT_COMPLETED'
  | 'PAYMENT_PROCESSED';

export type PaymentStatus =
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED';

export interface OrderStatusResponse {
  status: string;
  data: {
    orderStatus: OrderStatus;
    payments: { paymentId: string; paymentStatus: PaymentStatus; paymentMethod: string; amount: number }[];
    paymentIds: string[];
  };
}

export function getOrderStatus(merchantId: string, orderId: string) {
  return request<OrderStatusResponse>('GET', `/orders/${orderId}/status`, undefined, merchantId);
}
