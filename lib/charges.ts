import type { ChargeRow, Currency, ExchangeRates } from './types';

export function rateFor(rates: ExchangeRates, currency: Currency): number {
  switch (currency) {
    case 'USD':
      return rates.usd;
    case 'EUR':
      return rates.eur;
    case 'GBP':
      return rates.gbp;
    default:
      return 1;
  }
}

/** INR value of a charge using the exchange rate applied to that row. */
export function chargeAmountInr(ch: Pick<ChargeRow, 'quantity' | 'rate' | 'currency' | 'exchangeRate'>): number {
  const base = ch.quantity * ch.rate;
  return ch.currency === 'INR' ? base : base * ch.exchangeRate;
}

export function totalInr(charges: ChargeRow[]): number {
  return charges.reduce((sum, ch) => sum + chargeAmountInr(ch), 0);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
