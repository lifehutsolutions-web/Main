import { PlanType, Subscription } from '../types';

export interface PlanDetails {
  name: PlanType;
  projectLimit: number;
  monthlyPrice: number;
  yearlyPrice: number; // 1 month free: monthlyPrice * 11
  description: string;
}

export const PLANS: Record<PlanType, PlanDetails> = {
  Starter: {
    name: 'Starter',
    projectLimit: 5,
    monthlyPrice: 3,
    yearlyPrice: 3 * 11, // 1 month free
    description: 'Perfect for small firms and independent contractors.'
  },
  Pro: {
    name: 'Pro',
    projectLimit: 10,
    monthlyPrice: 1999,
    yearlyPrice: 1999 * 11, // 1 month free
    description: 'Best for growing contracting teams with multiple ongoing sites.'
  },
  Business: {
    name: 'Business',
    projectLimit: 25,
    monthlyPrice: 2999,
    yearlyPrice: 2999 * 11, // 1 month free
    description: 'Designed for established builders and multi-city operations.'
  },
  Enterprise: {
    name: 'Enterprise',
    projectLimit: Infinity,
    monthlyPrice: 4999,
    yearlyPrice: 4999 * 11, // 1 month free
    description: 'Unlimited horsepower for full-scale development corporations.'
  }
};

// Sister Concern / Partner promo codes for lifetime free Enterprise subscription
export const PARTNER_PROMO_CODES = [
  'LIFEHUT_PARTNER_2026',
  'SISTER_CONCERN_FREE',
  'METROBUILD_VIP',
  'CLIENT_PARTNER_UNLIMITED'
];

/**
 * Checks if the subscription is currently active or in a valid trial period.
 */
export function isSubscriptionValid(subscription?: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === 'free_partner') return true;
  if (subscription.status === 'active' || subscription.status === 'trial') {
    const expiryDate = new Date(subscription.expiresAt);
    return expiryDate.getTime() > Date.now();
  }
  return false;
}

/**
 * Checks if a user has reached their project creation limit.
 */
export function canCreateProject(currentProjectCount: number, subscription?: Subscription | null): { allowed: boolean; limit: number; plan: PlanType } {
  const plan: PlanType = subscription?.plan || 'Starter';
  
  if (!isSubscriptionValid(subscription)) {
    return { allowed: false, limit: 0, plan };
  }

  const limit = PLANS[plan]?.projectLimit || 0;

  return {
    allowed: currentProjectCount < limit,
    limit,
    plan
  };
}

/**
 * Utility to calculate days remaining in trial or subscription
 */
export function getSubscriptionDaysRemaining(subscription?: Subscription | null): number {
  if (!subscription) return 0;
  if (subscription.status === 'free_partner') return 9999;
  
  const expiryDate = new Date(subscription.expiresAt);
  const diffTime = expiryDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
