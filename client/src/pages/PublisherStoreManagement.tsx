import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { EmptyPlaceholder } from '../components/EmptyPlaceholder';
import { SkeletonLoader } from '../components/SkeletonLoader';
import type {
  ActivatePaymentMethodResult,
  MerchantBranding,
  MerchantDetails,
  PaymentMethodEntry,
  PublisherStatusInfo,
} from '../lib/types';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-iron-700 py-3 last:border-0">
      <span className="text-sm text-steam-400">{label}</span>
      <span className="max-w-[60%] truncate text-right font-mono text-sm text-steam-100" title={value}>
        {value}
      </span>
    </div>
  );
}

const ACTIVATABLE_METHODS: { key: string; label: string }[] = [
  { key: 'swish', label: 'Swish' },
  { key: 'klarna', label: 'Klarna' },
  { key: 'amex', label: 'Amex' },
  { key: 'vipps', label: 'Vipps' },
  { key: 'mobilepay', label: 'MobilePay' },
];

export function PublisherStoreManagement() {
  const { token } = useAuth();
  const [merchant, setMerchant] = useState<PublisherStatusInfo | null>(null);
  const [details, setDetails] = useState<MerchantDetails | null>(null);
  const [isOwnMerchant, setIsOwnMerchant] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodEntry[] | null>(null);
  const [branding, setBranding] = useState<MerchantBranding | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activating, setActivating] = useState<string | null>(null);
  const [activateResult, setActivateResult] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const [brandingForm, setBrandingForm] = useState<MerchantBranding>({});
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  useEffect(() => {
    api.get<{ publisher: PublisherStatusInfo }>('/auth/me/publisher', token).then((res) => setMerchant(res.publisher)).catch(() => {});
    api
      .get<{ merchant: MerchantDetails; isOwnMerchant: boolean }>('/store/merchant-details', token)
      .then((res) => {
        setDetails(res.merchant);
        setIsOwnMerchant(res.isOwnMerchant);
      })
      .catch(() => setError('Could not load live merchant details from Surfboard.'));
    api
      .get<{ paymentMethods: PaymentMethodEntry[] }>('/store/payment-methods', token)
      .then((res) => setMethods(res.paymentMethods))
      .catch(() => {});
    api
      .get<{ branding: MerchantBranding }>('/store/branding', token)
      .then((res) => {
        setBranding(res.branding);
        setBrandingForm(res.branding);
      })
      .catch(() => {});
  }, [token]);

  async function activate(methodKey: string) {
    setActivating(methodKey);
    setActivateError(null);
    setActivateResult(null);
    try {
      const res = await api.post<{ results: ActivatePaymentMethodResult[] }>('/store/payment-methods', { [methodKey]: true }, token);
      const result = res.results.find((r) => r.method === methodKey);
      if (result?.status === 'SUCCESS') {
        setActivateResult(`${methodKey} activated.`);
        const fresh = await api.get<{ paymentMethods: PaymentMethodEntry[] }>('/store/payment-methods', token);
        setMethods(fresh.paymentMethods);
      } else {
        setActivateError(result?.message ?? `Could not activate ${methodKey}.`);
      }
    } catch (err) {
      setActivateError(err instanceof ApiError ? err.message : `Could not activate ${methodKey}.`);
    } finally {
      setActivating(null);
    }
  }

  async function saveBranding(e: FormEvent) {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingError(null);
    setBrandingSaved(false);
    try {
      const res = await api.patch<{ branding: MerchantBranding }>('/store/branding', brandingForm, token);
      setBranding(res.branding);
      setBrandingForm(res.branding);
      setBrandingSaved(true);
    } catch (err) {
      setBrandingError(err instanceof ApiError ? err.message : 'Could not update branding.');
    } finally {
      setSavingBranding(false);
    }
  }

  const activeMethodNames = new Set((methods ?? []).map((m) => m.paymentMethod.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 font-display text-2xl font-bold text-steam-100">Store Management</h1>
      <p className="mb-8 text-sm text-steam-400">
        Your Surfboard merchant and store, live from Surfboard —{' '}
        {isOwnMerchant ? 'your own merchant.' : "you're on the shared demo merchant until your own is approved."}
      </p>

      {error && <div className="mb-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {!merchant && !error && <SkeletonLoader className="mb-6 h-48 w-full" />}

      {merchant && (
        <div className="mb-6 rounded-2xl border border-iron-700 bg-iron-900 p-6">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Merchant</h2>

          {merchant.surfboardMerchantId ? (
            <>
              <InfoRow label="Merchant status" value={merchant.merchantVerified ? 'Verified' : 'Onboarding'} />
              <InfoRow label="Merchant ID" value={merchant.surfboardMerchantId} />
              <InfoRow label="Store ID" value={merchant.surfboardStoreId ?? '—'} />
              <InfoRow label="Store name" value={merchant.storeName ?? '—'} />
              {details ? (
                <>
                  <InfoRow label="Merchant name (Surfboard)" value={details.merchantName} />
                  <InfoRow label="Company ID" value={details.companyId} />
                  <InfoRow label="Email" value={details.email} />
                  <InfoRow label="Phone" value={details.phoneNumber} />
                  <InfoRow label="Address" value={`${details.address.addressLine1}, ${details.address.city}`} />
                  <InfoRow label="Currency" value={details.currencyCode} />
                  <InfoRow label="Merchant type" value={details.merchantType} />
                  <InfoRow label="Created date" value={details.createdAt ?? 'Not returned by Surfboard for this merchant'} />
                </>
              ) : (
                <SkeletonLoader className="mt-2 h-24 w-full" />
              )}
              <InfoRow label="Verification status" value={merchant.merchantVerified ? 'Verified' : 'Pending verification'} />
              <InfoRow label="Publisher account" value={merchant.status} />
            </>
          ) : merchant.surfboardApplicationId ? (
            <>
              <InfoRow label="Merchant status" value="Onboarding in progress" />
              <InfoRow label="Application ID" value={merchant.surfboardApplicationId} />
              {merchant.webKybUrl && (
                <div className="pt-3">
                  <a href={merchant.webKybUrl} target="_blank" rel="noreferrer" className="text-sm text-ember hover:underline">
                    Complete KYB verification →
                  </a>
                </div>
              )}
              {details && (
                <p className="mt-3 text-xs text-steam-600">
                  Below is live data from the shared demo merchant your sales currently route through.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-danger">
              No Surfboard merchant application on file — your sales use the shared demo merchant for now.
            </p>
          )}
        </div>
      )}

      <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">Store branding</h2>
      {!branding && !error && <SkeletonLoader className="mb-8 h-40 w-full" />}
      {branding && (
        <div className="mb-8 rounded-2xl border border-iron-700 bg-iron-900 p-6">
          <div className="mb-4 flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Store logo" className="h-14 w-14 rounded-lg border border-iron-700 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-iron-700 text-xs text-steam-600">
                No logo
              </div>
            )}
            <div className="flex gap-2">
              {['brandColor', 'accentColor', 'backgroundColor', 'footerColor'].map((key) => {
                const value = branding[key as keyof MerchantBranding];
                return value ? (
                  <div key={key} className="text-center">
                    <div className="h-8 w-8 rounded-md border border-iron-700" style={{ background: value }} />
                    <span className="mt-1 block text-[10px] text-steam-600">{key.replace('Color', '')}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {!isOwnMerchant && (
            <p className="mb-4 text-xs text-steam-600">
              This is the shared demo merchant's branding — editing is disabled until you have your own Surfboard merchant
              (changes here would affect other publishers on the same fallback merchant).
            </p>
          )}

          <form onSubmit={saveBranding} className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['brandColor', 'Brand color'],
                ['accentColor', 'Accent color'],
                ['backgroundColor', 'Background color'],
                ['footerColor', 'Footer color'],
                ['logoUrl', 'Logo URL'],
                ['iconUrl', 'Icon URL'],
                ['primaryCoverImage', 'Banner image URL'],
              ] as [keyof MerchantBranding, string][]
            ).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-steam-400">{label}</label>
                <input
                  disabled={!isOwnMerchant}
                  value={brandingForm[key] ?? ''}
                  onChange={(e) => setBrandingForm((v) => ({ ...v, [key]: e.target.value }))}
                  className="w-full rounded-md border border-iron-700 bg-iron-800 px-3 py-2 text-sm text-steam-100 outline-none focus:border-ember disabled:opacity-50"
                />
              </div>
            ))}
            {isOwnMerchant && (
              <div className="sm:col-span-2">
                {brandingError && <div className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{brandingError}</div>}
                {brandingSaved && <div className="mb-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">Branding updated.</div>}
                <button
                  type="submit"
                  disabled={savingBranding}
                  className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-iron-900 hover:bg-[#ff6a43] disabled:opacity-50"
                >
                  {savingBranding ? 'Saving…' : 'Save branding'}
                </button>
              </div>
            )}
          </form>

          <p className="mt-4 text-xs text-steam-600">
            Store description isn't available — Surfboard's Branding API has no description field. Branding status: live data
            returned successfully above (shape/font: {branding.rectShape ?? '—'} / {branding.fontType ?? '—'}).
          </p>
        </div>
      )}

      <h2 id="payment-methods" className="mb-4 scroll-mt-24 font-display text-sm font-semibold uppercase tracking-wide text-steam-400">
        Payment methods
      </h2>
      {!methods && !error && <SkeletonLoader className="h-32 w-full" />}
      {methods && (
        <div className="rounded-2xl border border-iron-700 bg-iron-900 p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {methods.length === 0 && <EmptyPlaceholder title="No payment methods active" />}
            {methods.map((m) => (
              <span key={m.paymentMethodId} className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                {m.paymentMethod}
              </span>
            ))}
          </div>

          {!isOwnMerchant && (
            <p className="text-xs text-steam-600">
              Activating additional payment methods requires your own Surfboard merchant — the shared demo merchant is used
              by other publishers too.
            </p>
          )}

          {isOwnMerchant && (
            <>
              <p className="mb-3 text-xs text-steam-400">Activate an additional method (real Surfboard call):</p>
              {activateError && <div className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{activateError}</div>}
              {activateResult && <div className="mb-3 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{activateResult}</div>}
              <div className="flex flex-wrap gap-2">
                {ACTIVATABLE_METHODS.filter((m) => !activeMethodNames.has(m.key)).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={activating === m.key}
                    onClick={() => activate(m.key)}
                    className="rounded-md border border-iron-700 px-3 py-1.5 text-xs font-medium text-steam-100 hover:bg-iron-800 disabled:opacity-50"
                  >
                    {activating === m.key ? 'Activating…' : `+ ${m.label}`}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
