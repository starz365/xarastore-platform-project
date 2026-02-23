import { getStripeService } from './stripe';
import { getPayPalService } from './paypal';
import { supabase } from '@/lib/supabase/client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete';
  provider: 'stripe' | 'paypal';
  providerSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionService {
  private static instance: SubscriptionService;
  private stripeService = getStripeService();
  private paypalService = getPayPalService();

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string,
    provider: 'stripe' | 'paypal' = 'stripe'
  ): Promise<Subscription> {
    try {
      // Get user and plan details
      const [user, plan] = await Promise.all([
        this.getUser(userId),
        this.getPlan(planId),
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      if (!plan || !plan.isActive) {
        throw new Error('Plan not available');
      }

      let providerSubscriptionId: string;
      let providerData: any;

      // Create subscription with provider
      if (provider === 'stripe') {
        const stripeSubscription = await this.stripeService.createSubscription(
          user.stripeCustomerId || await this.createStripeCustomer(user),
          plan.providerPlanId || await this.createStripePlan(plan),
          { userId, planId }
        );

        providerSubscriptionId = stripeSubscription.id;
        providerData = stripeSubscription;
      } else {
        const paypalSubscription = await this.paypalService.createSubscription(
          plan.providerPlanId || await this.createPayPalPlan(plan),
          {
            email: user.email,
            name: { given_name: user.firstName, surname: user.lastName },
          },
          `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
          `${process.env.NEXT_PUBLIC_APP_URL}/subscription/cancel`
        );

        providerSubscriptionId = paypalSubscription.id;
        providerData = paypalSubscription;
      }

      // Save subscription to database
      const subscription = await this.saveSubscription({
        userId,
        planId,
        provider,
        providerSubscriptionId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(plan),
        cancelAtPeriodEnd: false,
        metadata: {
          providerData,
          paymentMethodId,
        },
      });

      // Update user subscription status
      await this.updateUserSubscription(userId, subscription.id);

      return subscription;
    } catch (error) {
      console.error('Subscription creation failed:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'canceled') {
        throw new Error('Subscription already canceled');
      }

      // Cancel with provider
      if (subscription.provider === 'stripe') {
        if (cancelAtPeriodEnd) {
          await this.stripeService.cancelSubscription(
            subscription.providerSubscriptionId
          );
        } else {
          await this.stripeService.cancelSubscription(
            subscription.providerSubscriptionId
          );
        }
      } else {
        await this.paypalService.cancelSubscription(
          subscription.providerSubscriptionId,
          'Customer request'
        );
      }

      // Update subscription in database
      const updatedSubscription = await this.updateSubscription(subscriptionId, {
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? undefined : new Date(),
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async updateSubscriptionPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<Subscription> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Update payment method with provider
      if (subscription.provider === 'stripe') {
        // For Stripe, we need to attach the payment method to the customer
        // and update the subscription's default payment method
        // This is a simplified version - in production, you'd need to
        // implement proper payment method updates
        console.log('Updating Stripe payment method:', paymentMethodId);
      } else {
        console.log('Updating PayPal payment method:', paymentMethodId);
      }

      // Update subscription metadata
      const updatedSubscription = await this.updateSubscription(subscriptionId, {
        metadata: {
          ...subscription.metadata,
          paymentMethodId,
          updatedAt: new Date().toISOString(),
        },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Payment method update failed:', error);
      throw new Error('Failed to update payment method');
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('Subscription retrieval failed:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapSubscription);
    } catch (error) {
      console.error('User subscriptions retrieval failed:', error);
      throw new Error('Failed to retrieve subscriptions');
    }
  }

  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapSubscription(data);
    } catch (error) {
      console.error('Active subscription retrieval failed:', error);
      throw new Error('Failed to retrieve active subscription');
    }
  }

  async syncSubscriptionFromProvider(
    provider: 'stripe' | 'paypal',
    providerSubscriptionId: string
  ): Promise<Subscription> {
    try {
      let providerData: any;

      // Get subscription from provider
      if (provider === 'stripe') {
        providerData = await this.stripeService.getSubscription(providerSubscriptionId);
      } else {
        providerData = await this.paypalService.getSubscription(providerSubscriptionId);
      }

      // Find existing subscription
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('provider_subscription_id', providerSubscriptionId)
        .single();

      if (existing) {
        // Update existing subscription
        return await this.updateSubscription(existing.id, {
          status: this.mapProviderStatus(provider, providerData.status),
          currentPeriodStart: new Date(providerData.current_period_start * 1000),
          currentPeriodEnd: new Date(providerData.current_period_end * 1000),
          cancelAtPeriodEnd: providerData.cancel_at_period_end || false,
          canceledAt: providerData.canceled_at 
            ? new Date(providerData.canceled_at * 1000) 
            : undefined,
          metadata: {
            ...existing.metadata,
            providerData,
            syncedAt: new Date().toISOString(),
          },
        });
      } else {
        // Create new subscription from provider data
        const metadata = providerData.metadata || {};
        
        return await this.saveSubscription({
          userId: metadata.userId,
          planId: metadata.planId,
          provider,
          providerSubscriptionId,
          status: this.mapProviderStatus(provider, providerData.status),
          currentPeriodStart: new Date(providerData.current_period_start * 1000),
          currentPeriodEnd: new Date(providerData.current_period_end * 1000),
          cancelAtPeriodEnd: providerData.cancel_at_period_end || false,
          canceledAt: providerData.canceled_at 
            ? new Date(providerData.canceled_at * 1000) 
            : undefined,
          metadata: {
            providerData,
            imported: true,
            importedAt: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Subscription sync failed:', error);
      throw new Error('Failed to sync subscription');
    }
  }

  async handleSubscriptionWebhook(
    provider: 'stripe' | 'paypal',
    event: any
  ): Promise<void> {
    try {
      const providerSubscriptionId = event.data?.object?.id || event.resource?.id;
      
      if (!providerSubscriptionId) {
        throw new Error('No subscription ID in webhook event');
      }

      // Sync subscription from provider
      await this.syncSubscriptionFromProvider(provider, providerSubscriptionId);

      // Send notification if subscription status changed
      const subscription = await this.getSubscriptionByProviderId(providerSubscriptionId);
      
      if (subscription) {
        await this.sendSubscriptionNotification(subscription, event);
      }
    } catch (error) {
      console.error('Subscription webhook handling failed:', error);
      throw error;
    }
  }

  private async getUser(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  private async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  private async createStripeCustomer(user: any): Promise<string> {
    const stripeCustomer = await this.stripeService.createCustomer(
      user.email,
      `${user.first_name} ${user.last_name}`.trim(),
      { userId: user.id }
    );

    // Update user with Stripe customer ID
    await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq('id', user.id);

    return stripeCustomer.id;
  }

  private async createStripePlan(plan: SubscriptionPlan): Promise<string> {
    const stripePlan = await this.stripeService.createSubscriptionPlan(
      plan.name,
      plan.price * 100, // Convert to cents
      plan.currency.toLowerCase(),
      plan.interval,
      plan.intervalCount,
      { planId: plan.id }
    );

    // Update plan with Stripe plan ID
    await supabase
      .from('subscription_plans')
      .update({ provider_plan_id: stripePlan.id })
      .eq('id', plan.id);

    return stripePlan.id;
  }

  private async createPayPalPlan(plan: SubscriptionPlan): Promise<string> {
    // PayPal plan creation is more complex and requires Billing Plans API
    // This is a simplified placeholder
    throw new Error('PayPal plan creation not implemented');
  }

  private async saveSubscription(data: Partial<Subscription>): Promise<Subscription> {
    const { data: saved, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: data.userId,
        plan_id: data.planId,
        provider: data.provider,
        provider_subscription_id: data.providerSubscriptionId,
        status: data.status,
        current_period_start: data.currentPeriodStart,
        current_period_end: data.currentPeriodEnd,
        cancel_at_period_end: data.cancelAtPeriodEnd,
        canceled_at: data.canceledAt,
        trial_start: data.trialStart,
        trial_end: data.trialEnd,
        metadata: data.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscription(saved);
  }

  private async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status) updateData.status = updates.status;
    if (updates.currentPeriodStart) updateData.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd) updateData.current_period_end = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
    if (updates.canceledAt) updateData.canceled_at = updates.canceledAt;
    if (updates.trialStart) updateData.trial_start = updates.trialStart;
    if (updates.trialEnd) updateData.trial_end = updates.trialEnd;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapSubscription(data);
  }

  private async updateUserSubscription(userId: string, subscriptionId: string): Promise<void> {
    await supabase
      .from('users')
      .update({
        subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  private async getSubscriptionByProviderId(providerSubscriptionId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('provider_subscription_id', providerSubscriptionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.mapSubscription(data);
  }

  private calculatePeriodEnd(plan: SubscriptionPlan): Date {
    const now = new Date();
    
    if (plan.interval === 'month') {
      now.setMonth(now.getMonth() + plan.intervalCount);
    } else if (plan.interval === 'year') {
      now.setFullYear(now.getFullYear() + plan.intervalCount);
    }
    
    return now;
  }

  private mapProviderStatus(provider: 'stripe' | 'paypal', providerStatus: string): Subscription['status'] {
    const statusMap: Record<string, Subscription['status']> = {
      // Stripe statuses
      'active': 'active',
      'canceled': 'canceled',
      'past_due': 'past_due',
      'unpaid': 'unpaid',
      'trialing': 'trialing',
      'incomplete': 'incomplete',
      'incomplete_expired': 'canceled',
      
      // PayPal statuses
      'ACTIVE': 'active',
      'APPROVAL_PENDING': 'trialing',
      'APPROVED': 'active',
      'SUSPENDED': 'past_due',
      'CANCELLED': 'canceled',
      'EXPIRED': 'canceled',
    };

    return statusMap[providerStatus.toUpperCase()] || 'active';
  }

  private mapSubscription(data: any): Subscription {
    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status,
      provider: data.provider,
      providerSubscriptionId: data.provider_subscription_id,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      canceledAt: data.canceled_at ? new Date(data.canceled_at) : undefined,
      trialStart: data.trial_start ? new Date(data.trial_start) : undefined,
      trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private async sendSubscriptionNotification(
    subscription: Subscription,
    event: any
  ): Promise<void> {
    const notificationType = `subscription_${event.type || event.event_type}`;
    
    await supabase.from('notifications').insert({
      user_id: subscription.userId,
      type: notificationType,
      title: this.getNotificationTitle(subscription.status),
      message: this.getNotificationMessage(subscription, event),
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        event,
      },
      created_at: new Date().toISOString(),
    });
  }

  private getNotificationTitle(status: Subscription['status']): string {
    const titles: Record<Subscription['status'], string> = {
      active: 'Subscription Activated',
      canceled: 'Subscription Canceled',
      past_due: 'Subscription Past Due',
      unpaid: 'Subscription Unpaid',
      trialing: 'Trial Started',
      incomplete: 'Subscription Incomplete',
    };

    return titles[status] || 'Subscription Updated';
  }

  private getNotificationMessage(
    subscription: Subscription,
    event: any
  ): string {
    switch (subscription.status) {
      case 'active':
        return 'Your subscription has been activated successfully.';
      case 'canceled':
        return subscription.cancelAtPeriodEnd
          ? 'Your subscription will be canceled at the end of the current period.'
          : 'Your subscription has been canceled.';
      case 'past_due':
        return 'Your subscription payment is past due. Please update your payment method.';
      case 'unpaid':
        return 'Your subscription payment failed. Please update your payment method to avoid service interruption.';
      case 'trialing':
        return 'Your free trial has started. Enjoy full access to all features.';
      case 'incomplete':
        return 'Your subscription setup is incomplete. Please complete the payment setup.';
      default:
        return 'Your subscription has been updated.';
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();
