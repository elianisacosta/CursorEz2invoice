'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface SubscriptionTier {
  id: string;
  name: string;
  price: string;
  bays: string;
  features: string[];
  color: string;
  bayLimit: number;
}

export interface FounderContextType {
  isFounder: boolean;
  subscriptionBypass: boolean;
  simulatedTier: string;
  currentTier: SubscriptionTier;
  setSubscriptionBypass: (bypass: boolean) => void;
  setSimulatedTier: (tier: string) => void;
  canAccessFeature: (feature: string) => boolean;
  getBayLimit: () => number;
}

export const subscriptionTiers: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$80/month',
    bays: '3 bays max',
    features: ['Basic features only'],
    color: 'gray',
    bayLimit: 3
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$150/month',
    bays: '8 bays',
    features: ['Analytics & Timesheets', 'Accounts Receivable'],
    color: 'blue',
    bayLimit: 8
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom pricing',
    bays: 'Unlimited bays',
    features: ['All features + User Permissions'],
    color: 'green',
    bayLimit: -1 // -1 means unlimited
  }
];

const FounderContext = createContext<FounderContextType | undefined>(undefined);

export function FounderProvider({ children }: { children: ReactNode }) {
  // Get auth context - this will always work since FounderProvider is inside AuthProvider
  const auth = useAuth();
  const [subscriptionBypass, setSubscriptionBypass] = useState(true);
  const [simulatedTier, setSimulatedTier] = useState<string>('real');

  // Use the founder status from AuthContext (will be false if not ready)
  const isFounder = auth?.isFounder || false;

  const getCurrentTier = (): SubscriptionTier => {
    // If a simulated tier is selected (not 'real'), use that tier even if bypass is active
    // This allows founders to test how different tiers work
    if (simulatedTier !== 'real') {
      return subscriptionTiers.find(tier => tier.id === simulatedTier) || subscriptionTiers[0];
    }
    
    // If bypass is active and user is founder, return enterprise tier
    if (subscriptionBypass && isFounder) {
      return subscriptionTiers.find(tier => tier.id === 'enterprise') || subscriptionTiers[2];
    }
    
    // Return actual subscription tier (you'd get this from your database)
    return subscriptionTiers.find(tier => tier.id === 'enterprise') || subscriptionTiers[2];
  };

  const currentTier = getCurrentTier();

  const canAccessFeature = (feature: string): boolean => {
    // If a simulated tier is selected, apply that tier's restrictions
    // This allows founders to test feature restrictions for each tier
    if (simulatedTier !== 'real') {
      const tier = getCurrentTier();
      switch (feature) {
        case 'analytics':
          return tier.id === 'professional' || tier.id === 'enterprise';
        case 'timesheets':
          return tier.id === 'professional' || tier.id === 'enterprise';
        case 'accounts_receivable':
          return tier.id === 'professional' || tier.id === 'enterprise';
        case 'user_permissions':
          return tier.id === 'enterprise';
        default:
          return true; // Basic features available to all
      }
    }
    
    // If bypass is active and user is founder, allow everything
    if (subscriptionBypass && isFounder) {
      return true;
    }

    const tier = getCurrentTier();
    
    switch (feature) {
      case 'analytics':
        return tier.id === 'professional' || tier.id === 'enterprise';
      case 'timesheets':
        return tier.id === 'professional' || tier.id === 'enterprise';
      case 'accounts_receivable':
        return tier.id === 'professional' || tier.id === 'enterprise';
      case 'user_permissions':
        return tier.id === 'enterprise';
      default:
        return true; // Basic features available to all
    }
  };

  const getBayLimit = (): number => {
    // If a simulated tier is selected, use that tier's bay limit
    if (simulatedTier !== 'real') {
      return getCurrentTier().bayLimit;
    }
    
    // If bypass is active and user is founder, return unlimited
    if (subscriptionBypass && isFounder) {
      return -1; // Unlimited for founder with bypass
    }
    
    return getCurrentTier().bayLimit;
  };

  const value: FounderContextType = {
    isFounder,
    subscriptionBypass,
    simulatedTier,
    currentTier,
    setSubscriptionBypass,
    setSimulatedTier,
    canAccessFeature,
    getBayLimit
  };

  return (
    <FounderContext.Provider value={value}>
      {children}
    </FounderContext.Provider>
  );
}

export function useFounder() {
  const context = useContext(FounderContext);
  if (context === undefined) {
    throw new Error('useFounder must be used within a FounderProvider');
  }
  return context;
}
