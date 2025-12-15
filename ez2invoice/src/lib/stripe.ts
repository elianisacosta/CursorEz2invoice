import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }
  return stripeInstance;
}

// Lazy initialization using getter - only creates Stripe instance when accessed
// This prevents build-time errors when env vars aren't set yet in Vercel
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = instance[prop as keyof Stripe];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});


