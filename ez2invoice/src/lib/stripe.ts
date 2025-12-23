import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    // Detect Stripe mode from secret key
    const isTestMode = secretKey.startsWith('sk_test_');
    const isLiveMode = secretKey.startsWith('sk_live_');
    
    if (!isTestMode && !isLiveMode) {
      console.warn('[Stripe] ⚠️ Unknown Stripe key format. Expected sk_test_ or sk_live_');
    }
    
    console.log(`[Stripe] ✅ Initializing Stripe client in ${isTestMode ? 'TEST' : isLiveMode ? 'LIVE' : 'UNKNOWN'} mode`);
    
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


