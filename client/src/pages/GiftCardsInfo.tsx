import { Link } from 'react-router-dom';

export function GiftCardsInfo() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-steam-100">Gift Cards</h1>

      <div className="space-y-4 rounded-2xl border border-iron-700 bg-iron-900 p-6 text-steam-400">
        <p>
          Have a GameForge gift card code? You can redeem it directly at checkout — add any game to your cart, then
          enter the code in the <span className="text-steam-100">Gift card code</span> field before paying.
        </p>
        <p>
          If the card's balance fully covers your order total, it's applied instantly and no card payment is
          needed. Gift cards can't currently be split across multiple purchases or combined with a partial card
          payment — the balance has to cover the whole order.
        </p>
        <p>Gift cards are issued by GameForge administrators and aren't tied to a specific account, so there's no "my gift cards" list — just the code itself.</p>
      </div>

      <Link
        to="/"
        className="mt-6 inline-block rounded-md bg-ember px-5 py-2.5 font-semibold text-iron-900 hover:bg-[#ff6a43]"
      >
        Browse the storefront
      </Link>
    </div>
  );
}
