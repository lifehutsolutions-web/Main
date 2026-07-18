import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PLANS, PARTNER_PROMO_CODES, isSubscriptionValid, getSubscriptionDaysRemaining } from '../lib/subscription';
import { PlanType } from '../types';
import { 
  Check, 
  CreditCard, 
  Sparkles, 
  Gift, 
  AlertTriangle, 
  ArrowRight, 
  Clock, 
  HardHat, 
  Building2, 
  Lock,
  Unlock,
  Coins,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface SubscriptionPortalProps {
  onClose?: () => void;
  isBlockPage?: boolean;
}

export default function SubscriptionPortal({ onClose, isBlockPage = false }: SubscriptionPortalProps) {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  
  // Checkout & simulated payment gateway state
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('upi');
  const [paymentProgress, setPaymentProgress] = useState<'idle' | 'authorizing' | 'otp' | 'success'>('idle');
  const [simulatedOTP, setSimulatedOTP] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const activeSub = userProfile?.subscription;
  const daysLeft = getSubscriptionDaysRemaining(activeSub);
  const isCurrentlyValid = isSubscriptionValid(activeSub);

  const handleApplyPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccess(null);
    const code = promoCode.trim().toUpperCase();

    if (!code) {
      setPromoError('Please enter a promo code.');
      return;
    }

    if (PARTNER_PROMO_CODES.includes(code)) {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 99); // 99 years / lifetime free

      updateUserProfile({
        subscription: {
          plan: 'Enterprise',
          status: 'free_partner',
          expiresAt: expires.toISOString(),
          activatedAt: new Date().toISOString(),
          promoCodeUsed: code
        }
      }).then(() => {
        setPromoSuccess('🎉 Code redeemed successfully! You have unlocked lifetime Unlimited Enterprise access for your workspace.');
        setPromoCode('');
        if (onClose) setTimeout(onClose, 2500);
      }).catch(err => {
        setPromoError('Failed to activate subscription. Please try again.');
        console.error(err);
      });
    } else {
      setPromoError('Invalid code. Please enter a valid promotional code.');
    }
  };

  const handleInitiatePayment = (planName: PlanType) => {
    setSelectedPlan(planName);
    setIsProcessingCheckout(true);
    setPromoError(null);
    setPromoSuccess(null);

    const planDetails = PLANS[planName];
    const amount = billingCycle === 'yearly' ? planDetails.yearlyPrice : planDetails.monthlyPrice;

    // 1. If Razorpay SDK is loaded and a custom key is available, use real Razorpay
    const rzpKey = (((import.meta as any).env?.VITE_RAZORPAY_KEY) || '').trim();
    if ((window as any).Razorpay && rzpKey) {
      const options = {
        key: rzpKey,
        amount: amount * 100, // Razorpay takes paise
        currency: 'INR',
        name: 'Lifehut Workspace',
        description: `${planName} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        image: '/src/assets/branding/logo.png',
        handler: function (response: any) {
          // Success callback
          const expires = new Date();
          if (billingCycle === 'yearly') {
            expires.setFullYear(expires.getFullYear() + 1);
          } else {
            expires.setMonth(expires.getMonth() + 1);
          }

          updateUserProfile({
            subscription: {
              plan: planName,
              status: 'active',
              expiresAt: expires.toISOString(),
              activatedAt: new Date().toISOString(),
              razorpayPaymentId: response.razorpay_payment_id
            }
          }).then(() => {
            setIsProcessingCheckout(false);
            if (onClose) onClose();
          });
        },
        prefill: {
          name: userProfile?.ownerName || '',
          email: userProfile?.email || '',
          contact: userProfile?.mobile || ''
        },
        theme: {
          color: '#0A84FF'
        }
      };

      try {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setIsProcessingCheckout(false);
          setPromoError(`Payment failed: ${resp.error.description}`);
        });
        rzp.open();
        return;
      } catch (e: any) {
        console.warn("Real Razorpay instantiation failed, falling back to simulated Razorpay checkout:", e);
      }
    }

    // 2. Otherwise, fall back to our fully custom simulated high-fidelity Razorpay payment gateway
    setTimeout(() => {
      setIsProcessingCheckout(false);
      setShowPaymentGateway(true);
      setPaymentProgress('idle');
    }, 1200);
  };

  const handleProcessSimulatedPayment = () => {
    setPaymentProgress('authorizing');
    setOtpError(null);
    
    setTimeout(() => {
      setPaymentProgress('otp');
      setSimulatedOTP('');
    }, 1500);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (simulatedOTP !== '1234' && simulatedOTP !== '123456') {
      setOtpError('Invalid OTP code. For demo purposes, enter "1234" or "123456" to succeed.');
      return;
    }

    setPaymentProgress('success');
    
    setTimeout(async () => {
      const expires = new Date();
      if (billingCycle === 'yearly') {
        expires.setFullYear(expires.getFullYear() + 1);
      } else {
        expires.setMonth(expires.getMonth() + 1);
      }

      try {
        await updateUserProfile({
          subscription: {
            plan: selectedPlan!,
            status: 'active',
            expiresAt: expires.toISOString(),
            activatedAt: new Date().toISOString(),
            razorpayPaymentId: `pay_sim_${Date.now()}`
          }
        });
        setShowPaymentGateway(false);
        if (onClose) onClose();
      } catch (err) {
        console.error("Failed to save subscription:", err);
      }
    }, 1800);
  };

  return (
    <div className={`font-sans flex flex-col justify-start overflow-y-auto ${isBlockPage ? 'min-h-screen p-5 md:p-10' : 'p-2 md:p-4'}`} style={{ background: isBlockPage ? 'var(--lh-surface-sunken)' : 'transparent' }}>
      
      {/* Header Container */}
      <div className="w-full max-w-5xl mx-auto space-y-6">
        
        {isBlockPage && (
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#E67E22]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-slate-900">Workspace Suspended</h3>
                <p className="text-xs text-slate-500">Your free launch trial has ended. Activate a plan below to unlock your projects and clients.</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 active:scale-95"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Brand Banner / Header */}
        <div className="text-center space-y-3 pt-4">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-widest uppercase px-3 py-1 rounded-md" style={{ background: 'rgba(10, 130, 255, 0.1)', color: 'var(--lh-blue)' }}>
            <Coins className="w-3.5 h-3.5" /> Workspace Subscription
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">
            Professional Plans for Service Businesses
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-2xl mx-auto">
            Choose the workspace capacity that fits your organization. All plans include full client access portals, document control, daily progress logging, and live chat.
          </p>
        </div>

        {/* Current status banner */}
        {!isBlockPage && activeSub && (
          <div className="p-4.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ background: 'var(--lh-surface)', borderColor: 'var(--lh-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: isCurrentlyValid ? 'var(--lh-success-bg)' : 'var(--lh-danger-bg)', color: isCurrentlyValid ? 'var(--lh-success-text)' : 'var(--lh-danger-text)' }}>
                {isCurrentlyValid ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-900">
                  Current Tier: <span className="text-blue-600">{activeSub.plan} Plan</span> ({activeSub.status === 'trial' ? 'Free Trial' : activeSub.status === 'free_partner' ? 'Promo / Partner' : 'Active Subscription'})
                </p>
                <p className="text-[11.5px] text-slate-500">
                  {isCurrentlyValid 
                    ? `Status: Active — Expires on ${new Date(activeSub.expiresAt).toLocaleDateString()} (${daysLeft} days left)`
                    : 'Status: Expired — Please subscribe below to reactivate project actions.'}
                </p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
              >
                Continue to Portal
              </button>
            )}
          </div>
        )}

        {/* Toggle Subscription Frequency */}
        <div className="flex justify-center pt-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Yearly Billing
              <span className="text-[9px] font-bold bg-[#E67E22] text-white px-1.5 py-0.5 rounded-md animate-pulse">
                1 Month Free
              </span>
            </button>
          </div>
        </div>

        {/* Grid of pricing plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-3">
          {(Object.keys(PLANS) as PlanType[]).map((planName) => {
            const plan = PLANS[planName];
            const isCurrentPlan = activeSub?.plan === planName && isCurrentlyValid;
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const effectivePrice = Math.round(billingCycle === 'yearly' ? price / 12 : price);
            
            return (
              <div 
                key={planName} 
                className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-xs ${
                  isCurrentPlan 
                    ? 'ring-2 ring-blue-500 border-transparent shadow-md transform scale-[1.02]' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Visual Accent for Enterprise / Top Seller */}
                {planName === 'Enterprise' && (
                  <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white text-[10px] uppercase font-bold text-center py-1 tracking-wider shadow-sm">
                    Unlimited Capacity
                  </div>
                )}
                {planName === 'Pro' && (
                  <div className="absolute top-0 right-0 left-0 bg-amber-500 text-white text-[10px] uppercase font-bold text-center py-1 tracking-wider shadow-sm">
                    Most Popular
                  </div>
                )}

                <div className={`p-6 ${planName === 'Enterprise' || planName === 'Pro' ? 'pt-8' : ''} space-y-4`}>
                  {/* Plan Name & Badge */}
                  <div className="flex justify-between items-center">
                    <h3 className="font-display font-bold text-lg text-slate-800">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Active Plan
                      </span>
                    )}
                  </div>

                  {/* Pricing Display */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1 text-slate-950">
                      <span className="text-lg font-bold">₹</span>
                      <span className="text-3xl font-display font-bold tracking-tight">
                        {effectivePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400">/mo</span>
                    </div>
                    {billingCycle === 'yearly' ? (
                      <p className="text-[11px] text-[#E67E22] font-semibold">
                        Billed annually (₹{price.toLocaleString('en-IN')})
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Billed month-to-month</p>
                    )}
                  </div>

                  <p className="text-[12px] text-slate-500 leading-normal min-h-[48px]">
                    {plan.description}
                  </p>

                  <div className="h-px bg-slate-100" />

                  {/* Key Limits / Features */}
                  <ul className="space-y-3 text-[12.5px] text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>
                        Limit: <strong className="text-slate-900">{plan.projectLimit === Infinity ? 'Unlimited' : `${plan.projectLimit} Active`} Projects</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>Unlimited Clients Portals</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>Stage Locking & PDF Invoicing</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="w-4.5 h-4.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>Live Client Chat & Progress</span>
                    </li>
                  </ul>
                </div>

                {/* Purchase Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleInitiatePayment(planName)}
                    disabled={isProcessingCheckout || (isCurrentPlan && billingCycle === 'monthly')}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isCurrentPlan
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                        : planName === 'Enterprise' || planName === 'Pro'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs group-hover:shadow-md'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {isProcessingCheckout && selectedPlan === planName ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading Checkout...
                      </span>
                    ) : isCurrentPlan ? (
                      'Plan Active'
                    ) : (
                      <>
                        Subscribe Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo Code section for promotions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 flex-shrink-0">
              <Gift className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[13.5px] text-slate-800">Promotional & Partner Code</h3>
              <p className="text-[11.5px] text-slate-500">
                Have a promotional, partner, or voucher discount code? Redeem your discount or activation code below to instantly apply it.
              </p>
            </div>
          </div>

          <form onSubmit={handleApplyPromoCode} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="e.g. METROBUILD_VIP"
              value={promoCode}
              onChange={e => {
                setPromoCode(e.target.value);
                setPromoError(null);
                setPromoSuccess(null);
              }}
              className="lh-input flex-1 uppercase"
              style={{ background: '#f8fafc' }}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              Redeem Code
            </button>
          </form>

          {promoError && (
            <p className="text-[11.5px] font-semibold text-rose-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {promoError}
            </p>
          )}

          {promoSuccess && (
            <p className="text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
              {promoSuccess}
            </p>
          )}
        </div>

      </div>

      {/* STUNNING SIMULATED RAZORPAY GATEWAY MODAL */}
      {showPaymentGateway && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 animate-slide-up flex flex-col">
            
            {/* Razorpay Brand Header */}
            <div className="bg-[#1C252C] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold p-1">
                  R
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-tight text-[13px]">Razorpay</span>
                    <span className="text-[9px] bg-slate-700 text-slate-300 font-semibold px-1 py-0.5 rounded">TEST PORTAL</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Paying to: Lifehut Workspace</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Amount</span>
                <span className="font-bold font-mono text-[14px]">
                  ₹{(billingCycle === 'yearly' ? PLANS[selectedPlan].yearlyPrice : PLANS[selectedPlan].monthlyPrice).toLocaleString('en-IN')}.00
                </span>
              </div>
            </div>

            {/* Simulated Payment Flow */}
            <div className="p-6 space-y-6 flex-1 bg-[#FBFDFF]">
              {paymentProgress === 'idle' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Payment Method</h4>
                  
                  <div className="space-y-2.5">
                    {/* UPI option */}
                    <button
                      onClick={() => setPaymentMethod('upi')}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${paymentMethod === 'upi' ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${paymentMethod === 'upi' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-xs text-slate-800 block">UPI (PhonePe, GPay, Paytm)</span>
                        <p className="text-[10px] text-slate-500">Pay using UPI ID or scan QR code</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'upi' ? 'border-blue-600' : 'border-slate-300'}`}>
                        {paymentMethod === 'upi' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                    </button>

                    {/* Credit / Debit Card option */}
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${paymentMethod === 'card' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-xs text-slate-800 block">Credit / Debit Card</span>
                        <p className="text-[10px] text-slate-500">Visa, Mastercard, RuPay, Amex</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'border-blue-600' : 'border-slate-300'}`}>
                        {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                    </button>

                    {/* Netbanking option */}
                    <button
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${paymentMethod === 'netbanking' ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${paymentMethod === 'netbanking' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-xs text-slate-800 block">Netbanking</span>
                        <p className="text-[10px] text-slate-500">All major Indian banks supported</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'netbanking' ? 'border-blue-600' : 'border-slate-300'}`}>
                        {paymentMethod === 'netbanking' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                    </button>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setShowPaymentGateway(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all"
                    >
                      Cancel Payment
                    </button>
                    <button
                      onClick={handleProcessSimulatedPayment}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      Pay Now
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {paymentProgress === 'authorizing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <svg className="animate-spin h-9 w-9 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <h5 className="font-semibold text-sm text-slate-800">Contacting Your Bank</h5>
                    <p className="text-[11px] text-slate-500">Securing payment gateway connection, do not close this window...</p>
                  </div>
                </div>
              )}

              {paymentProgress === 'otp' && (
                <form onSubmit={handleVerifyOTP} className="space-y-4 py-3">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs">
                      <Lock className="w-4 h-4 text-blue-600" />
                      Two-Factor Bank Authentication
                    </div>
                    <p className="text-[11px] text-blue-700 leading-normal">
                      A simulated OTP check has been issued for this transaction. Enter <strong className="font-semibold text-slate-900">1234</strong> or <strong className="font-semibold text-slate-900">123456</strong> to successfully verify this payment.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="lh-label text-[11px] font-bold block">Enter Secure Bank OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 1234"
                      value={simulatedOTP}
                      onChange={e => {
                        setSimulatedOTP(e.target.value);
                        setOtpError(null);
                      }}
                      className="lh-input tracking-[0.25em] text-center font-mono font-bold text-lg"
                      autoFocus
                    />
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      {otpError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Verify and Authorize Payment
                  </button>
                </form>
              )}

              {paymentProgress === 'success' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-bounce">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-slate-800">Payment Authorized!</h5>
                    <p className="text-[11px] text-slate-500">Re-directing and updating your Lifehut workspace subscription...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Razorpay Footer */}
            <div className="bg-[#F2F5F8] p-4 text-center border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
              <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Securely Processed by Razorpay
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
