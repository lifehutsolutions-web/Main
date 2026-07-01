import { Project } from '../types';
import { THEMES, DEFAULT_ASSETS } from './TemplateLibrary';

export class RenderEngine {
  /**
   * Safe URL protocol sanitizer to prevent javascript: URI injection
   */
  private static sanitizeUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:')) {
      return '';
    }
    if (lower.startsWith('data:')) {
      if (!lower.startsWith('data:image/')) {
        return '';
      }
    }
    return trimmed;
  }

  /**
   * Safe href value escaper to prevent attribute breakout and protocol injection
   */
  private static escapeHref(url: string): string {
    if (!url) return '';
    // Remove double quotes, single quotes, spaces, backticks, parentheses to prevent breakout
    const sanitized = url.replace(/["'`\s()<>]/g, '');
    if (sanitized.toLowerCase().includes('javascript:') || sanitized.toLowerCase().includes('data:')) {
      return '#';
    }
    return sanitized;
  }

  /**
   * Sanitize custom code inputs (header/footer HTML) to prevent parent or iframe XSS
   */
  private static sanitizeCustomCode(html: string): string {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- Script Blocked for Security -->')
      .replace(/\bon\w+\s*=\s*(['"])(.*?)\1/gi, '') // inline events onload, onclick, etc.
      .replace(/href\s*=\s*(['"])javascript:(.*?)\1/gi, 'href="#"')
      .replace(/javascript:/gi, 'blocked:');
  }

  /**
   * Sanitize custom CSS rules to prevent expressions or behavior-based style exploits
   */
  private static sanitizeCss(css: string): string {
    if (!css) return '';
    return css
      .replace(/expression\s*\(/gi, 'blocked-expression(')
      .replace(/behavior\s*:/gi, 'blocked-behavior:')
      .replace(/@import/gi, 'blocked-import');
  }

  /**
   * Helper to resolve asset URLs from the project registry or default fallback maps.
   */
  private static resolveUrl(url: string, assets: Record<string, string>): string {
    let resolved = url || '';
    if (url && url.startsWith('asset://')) {
      resolved = assets[url] || DEFAULT_ASSETS[url] || '';
    }
    return this.sanitizeUrl(resolved);
  }

  /**
   * Safe HTML attribute escaping
   */
  private static escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Standard inline SVG maps for Lucide icons to eliminate CDN dependencies
   */
  private static getIconSvg(iconName: string): string {
    const icons: Record<string, string> = {
      Home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      Hammer: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hammer"><path d="M18.42 13.61a2.1 2.1 0 0 1 0 2.97l-2.97 2.97a2.1 2.1 0 0 1-2.97 0L2.5 9.5 9.5 2.5z"/><path d="m19 8 2 2"/><path d="m14 3 2 2"/><path d="m9.7 11.5 6.8-6.8"/><path d="m12.5 14.3 6.8-6.8"/></svg>`,
      Briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`,
      TrendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      Settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
      Globe: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      HardHat: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hard-hat"><path d="M2 12a10 10 0 0 1 20 0Z"/><path d="M5 12a7 7 0 0 1 14 0Z"/><path d="M12 12V5"/><path d="M12 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>`,
      Brain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brain"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3.001 3.001 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3.001 3.001 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
      Link: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      Shield: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      Users: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      Menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`
    };

    return icons[iconName] || icons.Briefcase;
  }

  /**
   * Build complete self-contained HTML
   */
  public static render(project: Project, options?: { isPreview?: boolean }): string {
    const { config, assets, metadata, extensions } = project;
    const theme = THEMES.find(t => t.id === metadata.themeId) || THEMES[0];
    const isClassic = metadata.templateId !== 'brick-modern';
    const isConsulting = metadata.templateId === 'consult-pro';

    // 1. Compile variables & static styling layer to prevent external CDN dependence
    const customStyleVariables = `
      :root {
        --font-family: ${theme.fontFamily};
        --primary-color: ${theme.colors.primary};
        --primary-hover: ${theme.colors.primaryHover};
        --primary-bg: ${theme.colors.primaryBg};
        --secondary-bg: ${theme.colors.secondaryBg};
        --text-dark: ${theme.colors.textDark};
        --text-light: ${theme.colors.textLight};
        --border-color: ${theme.colors.border};
        --accent-color: ${theme.colors.accent};
      }
    `;

    // 2. Map services and components
    const servicesHtml = config.services.map(s => {
      const escapedTitle = this.escapeHtml(s.title);
      const escapedDesc = this.escapeHtml(s.description);
      const iconSvg = this.getIconSvg(s.iconName);

      return `
        <div class="service-card bg-white p-8 rounded-2xl border border-slate-150/60 shadow-xs hover:shadow-md transition-all duration-300">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style="background-color: var(--primary-bg); color: var(--primary-color);">
            ${iconSvg}
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-3">${escapedTitle}</h3>
          <p class="text-slate-600 leading-relaxed text-sm">${escapedDesc}</p>
        </div>
      `;
    }).join('');

    const galleryHtml = config.gallery.map((g, idx) => {
      const resolvedUrl = this.resolveUrl(g.url, assets);
      const escapedTitle = this.escapeHtml(g.title);
      return `
        <div class="carousel-slide absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${idx === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" data-slide-index="${idx}">
          <img src="${resolvedUrl}" alt="${escapedTitle}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent flex flex-col justify-end p-8">
            <span class="font-extrabold uppercase tracking-widest text-xs mb-1.5" style="color: var(--accent-color);">Project Showcase</span>
            <h3 class="text-white text-xl font-bold">${escapedTitle}</h3>
          </div>
        </div>
      `;
    }).join('');

    const galleryDotsHtml = config.gallery.map((_, idx) => `
      <button onclick="goToSlide(${idx})" class="carousel-dot w-2 h-2 rounded-full transition-all cursor-pointer ${idx === 0 ? 'w-4' : 'bg-white/40 hover:bg-white/75'}" style="${idx === 0 ? 'background-color: var(--primary-color);' : ''}" data-dot-index="${idx}"></button>
    `).join('');

    const pricingHtml = config.pricing.map(p => {
      const escapedName = this.escapeHtml(p.name);
      const escapedPrice = this.escapeHtml(p.price);
      const escapedPeriod = this.escapeHtml(p.period);

      const featuresLi = p.features.filter(f => f && f.trim() !== "").map(f => `
        <li class="flex items-center gap-3 text-sm text-slate-600">
          <svg class="w-4 h-4 text-emerald-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${this.escapeHtml(f)}</span>
        </li>
      `).join('');

      const cardBorder = p.popular 
        ? `border-width: 3px; border-color: var(--primary-color); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);` 
        : `border: 1px solid var(--border-color);`;

      const btnStyle = p.popular
        ? `background-color: var(--primary-color); color: #ffffff;`
        : `background-color: var(--primary-bg); color: var(--primary-color);`;

      const hasRazorpay = !!(extensions?.integrations?.enableRazorpayGlobal && p.enableRazorpay && p.razorpayAmount && extensions?.integrations?.razorpayKeyId);
      const onclickAttr = hasRazorpay 
        ? `onclick="payWithRazorpay('${this.escapeHtml(p.name)}', ${p.razorpayAmount})"` 
        : `onclick="simulateCheckout('${this.escapeHtml(p.name)}')"`;
      const btnText = hasRazorpay ? `Pay ${p.razorpayAmount} INR` : `Select Plan`;

      return `
        <div class="pricing-card bg-white p-8 rounded-2xl relative flex flex-col justify-between" style="${cardBorder}">
          ${p.popular ? `<span class="absolute top-0 right-6 -translate-y-1/2 text-white font-bold tracking-wide text-2xs uppercase px-3 py-1 rounded-full shadow-sm" style="background-color: var(--primary-color);">Most Popular</span>` : ''}
          <div>
            <h3 class="text-lg font-bold text-slate-900 mb-2">${escapedName}</h3>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-3xl font-extrabold text-slate-900">${escapedPrice}</span>
              <span class="text-sm text-slate-500 font-medium">/${escapedPeriod}</span>
            </div>
            <ul class="space-y-3 mb-8">
              ${featuresLi}
            </ul>
          </div>
          <button ${onclickAttr} class="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]" style="${btnStyle}">
            ${btnText}
          </button>
        </div>
      `;
    }).join('');

    const faqsHtml = config.faqs.map((f, idx) => {
      const escapedQuestion = this.escapeHtml(f.question);
      const escapedAnswer = this.escapeHtml(f.answer);

      return `
        <div class="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300" style="border-color: var(--border-color);">
          <button onclick="toggleFaq(${idx})" class="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-slate-900 hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-3">
              <span class="w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0" style="background-color: var(--primary-bg); color: var(--primary-color);">?</span>
              <span>${escapedQuestion}</span>
            </h3>
            <span id="faq-icon-${idx}" class="w-6 h-6 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-400 transition-all">
              <svg class="w-3.5 h-3.5 stroke-[3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </span>
          </button>
          <div id="faq-answer-${idx}" class="hidden px-6 pb-6 pl-15 text-slate-600 text-sm leading-relaxed border-t border-slate-50 pt-3">
            ${escapedAnswer}
          </div>
        </div>
      `;
    }).join('');

    const logoIconSvg = this.getIconSvg(config.logoIcon);

    // Grid columns layout logic
    const pricingGridClass = config.pricing.length === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : config.pricing.length === 2
        ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
        : config.pricing.length === 3
          ? 'grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto'
          : 'grid-cols-1 lg:grid-cols-4 max-w-7xl mx-auto';

    // Extension Points Reserved Placeholder Injectors
    const seoTitle = extensions?.seo?.title || config.businessName;
    const seoDescription = extensions?.seo?.description || config.aboutDescription || '';
    const seoKeywords = extensions?.seo?.keywords || '';
    
    // Razorpay Integration Variables
    const isRazorpayActive = !!(extensions?.integrations?.enableRazorpayGlobal && extensions?.integrations?.razorpayKeyId);
    const razorpaySdkScript = isRazorpayActive 
      ? `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>` 
      : `<!-- Razorpay SDK Inactive -->`;

    const razorpayCustomScript = `
    // Razorpay Integration Code
    function payWithRazorpay(planName, amountInINR) {
      if (!window.Razorpay) {
        alert("Razorpay checkout SDK failed to load. Please verify your internet connection.");
        return;
      }
      var options = {
        "key": "${this.escapeHtml(extensions?.integrations?.razorpayKeyId || '')}",
        "amount": Math.round(parseFloat(amountInINR) * 100), // in paise
        "currency": "INR",
        "name": "${this.escapeHtml(extensions?.integrations?.razorpayBusinessName || config.businessName)}",
        "description": "Payment for " + planName,
        "handler": function (response) {
          alert("Payment Successful! Razorpay Payment ID: " + response.razorpay_payment_id);
        },
        "prefill": {
          "name": "",
          "email": "",
          "contact": ""
        },
        "theme": {
          "color": "${theme.colors.primary}"
        }
      };
      try {
        var rzp1 = new Razorpay(options);
        rzp1.open();
      } catch (err) {
        console.error("Razorpay initiation failed", err);
        alert("Payment initialization failed: " + err.message);
      }
    }

    function simulateCheckout(planName) {
      alert("Payment Simulator: Initiating checkout for " + planName + ". Configure a real Razorpay Key ID in your Lifehut Studio panel to accept live/test payments!");
    }
    `;

    const analyticsCode = extensions?.analytics?.googleAnalyticsId
      ? `<!-- Global site tag (gtag.js) - Google Analytics -->
         <script async src="https://www.googletagmanager.com/gtag/js?id=${extensions.analytics.googleAnalyticsId}"></script>
         <script>
           window.dataLayer = window.dataLayer || [];
           function gtag(){dataLayer.push(arguments);}
           gtag('js', new Date());
           gtag('config', '${extensions.analytics.googleAnalyticsId}');
         </script>`
      : `<!-- Future Google Analytics Integration Slot -->`;

    const customHeaderHtml = this.sanitizeCustomCode(extensions?.customCode?.headerHtml || '');
    const customFooterHtml = this.sanitizeCustomCode(extensions?.customCode?.footerHtml || '');
    const customCss = this.sanitizeCss(extensions?.customCode?.customCss || '');

    const firstGalleryUrl = config.gallery && config.gallery[0] ? this.resolveUrl(config.gallery[0].url, assets) : 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80';
    const secondGalleryUrl = config.gallery && config.gallery[1] ? this.resolveUrl(config.gallery[1].url, assets) : 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80';

    const formAction = extensions?.integrations?.customFormActionUrl 
      ? `action="${this.escapeHtml(this.sanitizeUrl(extensions.integrations.customFormActionUrl))}" method="POST"`
      : `onsubmit="event.preventDefault(); alert('Lead submission simulated successfully! Configure a Custom Form Action URL in the contact panel to receive email leads.');"`;

    // If SaaS modern template is selected, output the specialized high-converting SaaS landing page
    if (metadata.templateId === 'saas-modern') {
      const saasServicesHtml = config.services.map(s => {
        const escapedTitle = this.escapeHtml(s.title);
        const escapedDesc = this.escapeHtml(s.description);
        const iconSvg = this.getIconSvg(s.iconName);

        return `
          <article class="p-8 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:bg-white/[0.04] flex flex-col justify-between" style="background-color: rgba(255, 255, 255, 0.02); border-color: rgba(255, 255, 255, 0.06); backdrop-filter: blur(10px);">
            <div>
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-2xl" style="background: rgba(108,71,255,0.15); color: var(--accent-color);">
                ${iconSvg}
              </div>
              <h3 class="text-xl font-bold text-white mb-3 font-display">${escapedTitle}</h3>
              <p class="text-slate-400 leading-relaxed text-sm mb-6">${escapedDesc}</p>
            </div>
            <a href="#contact" class="text-sm font-semibold transition-colors flex items-center gap-1 hover:opacity-80" style="color: var(--primary-color);">
              <span>Explore</span>
              <span>&rarr;</span>
            </a>
          </article>
        `;
      }).join('');

      const saasPricingHtml = config.pricing.map(p => {
        const escapedName = this.escapeHtml(p.name);
        const escapedPrice = this.escapeHtml(p.price);
        const escapedPeriod = this.escapeHtml(p.period);

        const featuresLi = p.features.filter(f => f && f.trim() !== "").map(f => `
          <li class="flex items-center gap-3 text-sm text-slate-400">
            <svg class="w-4 h-4 text-emerald-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${this.escapeHtml(f)}</span>
          </li>
        `).join('');

        const cardBorder = p.popular 
          ? `border: 2px solid var(--primary-color); background-color: rgba(108, 71, 255, 0.05); box-shadow: 0 10px 30px -10px rgba(108, 71, 255, 0.3);` 
          : `border: 1px solid rgba(255, 255, 255, 0.08); background-color: rgba(255, 255, 255, 0.02);`;

        const btnStyle = p.popular
          ? `background-color: var(--primary-color); color: #ffffff;`
          : `border: 1px solid rgba(255, 255, 255, 0.15); color: #ffffff; background: transparent;`;

        const hasRazorpay = !!(extensions?.integrations?.enableRazorpayGlobal && p.enableRazorpay && p.razorpayAmount && extensions?.integrations?.razorpayKeyId);
        const onclickAttr = hasRazorpay 
          ? `onclick="payWithRazorpay('${this.escapeHtml(p.name)}', ${p.razorpayAmount})"` 
          : `onclick="simulateCheckout('${this.escapeHtml(p.name)}')"`;
        const btnText = hasRazorpay ? `Pay ${p.razorpayAmount} INR` : `Start free trial`;

        return `
          <div class="p-8 rounded-2xl relative flex flex-col justify-between" style="${cardBorder}">
            ${p.popular ? `<span class="absolute top-0 right-6 -translate-y-1/2 text-white font-extrabold tracking-wider text-[10px] uppercase px-3 py-1 rounded-full shadow-lg" style="background-color: var(--primary-color);">Most Popular</span>` : ''}
            <div>
              <div class="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">${escapedName}</div>
              <div class="flex items-baseline gap-1 mb-6">
                <span class="text-4xl font-bold font-display text-white">${escapedPrice}</span>
                <span class="text-sm text-slate-400">/${escapedPeriod}</span>
              </div>
              <p class="text-xs text-slate-400 mb-6 font-medium">Suitable plan for your operational scale.</p>
              <ul class="space-y-3 mb-8">
                ${featuresLi}
              </ul>
            </div>
            <button ${onclickAttr} class="w-full py-3.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] hover:opacity-90" style="${btnStyle}">
              ${btnText}
            </button>
          </div>
        `;
      }).join('');

      const saasFaqsHtml = config.faqs.map((f, idx) => {
        const escapedQuestion = this.escapeHtml(f.question);
        const escapedAnswer = this.escapeHtml(f.answer);

        return `
          <div class="border-b transition-all duration-300" style="border-color: rgba(255, 255, 255, 0.08);">
            <button onclick="toggleFaq(${idx})" class="w-full text-left py-6 flex items-center justify-between gap-4 font-bold text-white hover:text-slate-200 transition-colors focus:outline-none cursor-pointer">
              <span class="text-base font-semibold font-display">${escapedQuestion}</span>
              <span id="faq-icon-${idx}" class="text-slate-400 text-lg font-bold transition-all shrink-0">
                +
              </span>
            </button>
            <div id="faq-answer-${idx}" class="hidden pb-6 text-slate-400 text-sm leading-relaxed">
              ${escapedAnswer}
            </div>
          </div>
        `;
      }).join('');

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(seoTitle)}</title>
  <meta name="description" content="${this.escapeHtml(seoDescription)}" />
  <meta name="keywords" content="${this.escapeHtml(seoKeywords)}" />
  <link rel="canonical" href="#" />

  <!-- Google Fonts: Sora & Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['Sora', 'system-ui', 'sans-serif'],
            body: ['Inter', 'system-ui', 'sans-serif'],
          }
        },
      },
    };
  </script>

  <style>
    ${customStyleVariables}
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background-color: var(--secondary-bg);
      color: #f1f5f9;
    }
    .font-display {
      font-family: 'Sora', system-ui, sans-serif;
    }
    .gradient-text {
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .gradient-text-warm {
      background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .mesh-bg {
      position: relative;
      background-color: var(--secondary-bg);
    }
    .mesh-bg::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(circle at 10% 20%, rgba(108, 71, 255, 0.08) 0%, transparent 40%),
                  radial-gradient(circle at 90% 80%, rgba(0, 212, 255, 0.06) 0%, transparent 40%);
      pointer-events: none;
      z-index: 1;
    }
    ${customCss}
  </style>
  ${customHeaderHtml}
  ${razorpaySdkScript}
</head>
<body class="selection:bg-indigo-600 selection:text-white">

  <!-- =====================================================
       NAVIGATION
       ===================================================== -->
  <header class="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b" style="border-color: rgba(255, 255, 255, 0.05);">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-lg"
             style="background: linear-gradient(135deg, var(--primary-color), var(--accent-color))">
          ${this.escapeHtml(config.logoText)}
        </div>
        <span class="font-display font-bold text-white tracking-tight text-base">
          ${this.escapeHtml(config.businessName)} <span class="gradient-text">Studio™</span>
        </span>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
        <a href="#about" class="hover:text-white transition-colors">About</a>
        <a href="#services" class="hover:text-white transition-colors">Services</a>
        <a href="#features" class="hover:text-white transition-colors">Features</a>
        <a href="#pricing" class="hover:text-white transition-colors">Pricing</a>
        <a href="#testimonials" class="hover:text-white transition-colors">Reviews</a>
        <a href="#faqs" class="hover:text-white transition-colors">FAQ</a>
      </nav>

      <!-- CTA -->
      <div class="hidden lg:flex items-center gap-3">
        <a href="#pricing" class="text-xs font-bold text-slate-300 hover:text-white transition-colors">Sign in</a>
        <a href="#contact" class="px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02]"
           style="background-color: var(--primary-color);">
          Start free trial
        </a>
      </div>
    </div>
  </header>

  <!-- =====================================================
       MAIN
       ===================================================== -->
  <main>

    <!-- HERO SECTION -->
    <section id="hero" class="mesh-bg py-24 lg:py-32 relative z-10 overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="grid lg:grid-cols-2 gap-16 items-center">

          <!-- Copy Block -->
          <div class="space-y-6">
            <div class="inline-flex items-center gap-2 bg-white/5 border px-4 py-1.5 rounded-full text-xs font-bold tracking-wide text-slate-300 uppercase"
                 style="border-color: rgba(255, 255, 255, 0.08);">
              <span class="text-emerald-400">✦</span>
              <span>${this.escapeHtml(config.heroBadge)}</span>
            </div>

            <h1 class="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold tracking-tight leading-[1.1] text-white">
              ${this.escapeHtml(config.heroHeadline)}
            </h1>

            <p class="text-slate-400 text-base md:text-lg max-w-lg leading-relaxed">
              ${this.escapeHtml(config.heroSubheadline)}
            </p>

            <div class="flex flex-wrap gap-4 pt-4">
              <a href="#contact" class="px-8 py-4 text-white text-sm font-bold rounded-xl shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2"
                 style="background-color: var(--primary-color);">
                <span>${this.escapeHtml(config.heroPrimaryBtn)}</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#features" class="px-8 py-4 bg-transparent border border-slate-700 text-slate-300 text-sm font-bold rounded-xl hover:border-slate-500 hover:text-white transition-all">
                ${this.escapeHtml(config.heroSecondaryBtn)}
              </a>
            </div>

            <p class="text-xs text-slate-500 font-medium">No credit card required · 14-day free trial · Cancel anytime</p>

            <!-- Quick Stat Bar -->
            <div class="grid grid-cols-3 bg-white/[0.02] border rounded-2xl overflow-hidden mt-12"
                 style="border-color: rgba(255, 255, 255, 0.06);">
              <div class="p-4 text-center border-r" style="border-color: rgba(255, 255, 255, 0.06);">
                <div class="text-xl font-display font-black text-white" style="color: var(--accent-color);">${this.escapeHtml(config.aboutStatVal1)}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">${this.escapeHtml(config.aboutStatLabel1)}</div>
              </div>
              <div class="p-4 text-center border-r" style="border-color: rgba(255, 255, 255, 0.06);">
                <div class="text-xl font-display font-black text-white" style="color: var(--accent-color);">99.98%</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Uptime SLA</div>
              </div>
              <div class="p-4 text-center">
                <div class="text-xl font-display font-black text-white" style="color: var(--accent-color);">${this.escapeHtml(config.aboutStatVal2)}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">${this.escapeHtml(config.aboutStatLabel2)}</div>
              </div>
            </div>
          </div>

          <!-- Live Mock Preview Dashboard Widget -->
          <div class="relative z-10">
            <div class="p-8 rounded-3xl border shadow-2xl relative"
                 style="background: rgba(26, 34, 53, 0.3); border-color: rgba(255, 255, 255, 0.06); backdrop-filter: blur(20px);">
              
              <!-- Metric Display Header -->
              <div class="flex items-center justify-between mb-6">
                <div>
                  <div class="text-xs text-slate-400 mb-1">Total automations run</div>
                  <div class="text-2xl font-display font-bold text-white">84,291 <span class="text-xs text-emerald-400 font-normal ml-1">↑ 23%</span></div>
                </div>
                <div class="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full text-emerald-400 text-3xs font-extrabold uppercase tracking-wider">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </div>
              </div>

              <!-- Spark Chart Visual -->
              <div class="flex items-end gap-1.5 h-24 mb-6">
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:30%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:55%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:40%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:70%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:50%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:85%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:60%"></div>
                <div class="flex-1 rounded-t bg-indigo-500 shadow-md" style="height:90%; background-color: var(--primary-color);"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:75%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:95%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:65%"></div>
                <div class="flex-1 rounded-t bg-slate-700 hover:bg-indigo-500 transition-all cursor-pointer" style="height:80%"></div>
              </div>

              <!-- Metric Pills -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="p-3 rounded-xl bg-white/[0.02] border" style="border-color: rgba(255, 255, 255, 0.05);">
                  <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Savings</div>
                  <div class="text-sm font-bold text-white mt-1">↑ 22hrs / week</div>
                </div>
                <div class="p-3 rounded-xl bg-white/[0.02] border" style="border-color: rgba(255, 255, 255, 0.05);">
                  <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Task Success Rate</div>
                  <div class="text-sm font-bold text-emerald-400 mt-1">99.98%</div>
                </div>
              </div>

              <!-- Live Queue list -->
              <div class="space-y-3">
                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Process Stream</div>
                <div class="flex items-center justify-between text-xs py-2 border-b" style="border-color: rgba(255, 255, 255, 0.05);">
                  <span class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded bg-indigo-600/10 flex items-center justify-center">📧</span>
                    Email &rarr; database sync
                  </span>
                  <span class="text-emerald-400 font-semibold">Success</span>
                </div>
                <div class="flex items-center justify-between text-xs py-2">
                  <span class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded bg-sky-500/10 flex items-center justify-center">🤖</span>
                    AI Summary Engine
                  </span>
                  <span class="text-amber-400 font-semibold animate-pulse">Running</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- LOGO TICKER -->
    <section class="py-12 border-y" style="border-color: rgba(255, 255, 255, 0.05);">
      <div class="max-w-7xl mx-auto px-6 overflow-hidden relative">
        <div class="flex flex-wrap items-center justify-center gap-10 md:gap-16 opacity-45 select-none text-sm font-bold text-slate-300">
          <span class="hover:text-white transition-colors">&; Figma</span>
          <span class="hover:text-white transition-colors">◆ Notion</span>
          <span class="hover:text-white transition-colors">▲ Vercel</span>
          <span class="hover:text-white transition-colors">● Stripe</span>
          <span class="hover:text-white transition-colors">■ Linear</span>
          <span class="hover:text-white transition-colors">◈ Loom</span>
        </div>
      </div>
    </section>

    <!-- ABOUT SECTION -->
    <section id="about" class="py-24 relative z-10 max-w-7xl mx-auto px-6">
      <div class="grid lg:grid-cols-2 gap-16 items-center">

        <!-- Progress Card -->
        <div class="p-8 rounded-3xl border space-y-6"
             style="background: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">BENCHMARK SAVINGS</span>
          
          <div class="space-y-5">
            <div>
              <div class="flex justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Process speed increase</span>
                <span class="text-indigo-400" style="color: var(--accent-color);">3.4x faster</span>
              </div>
              <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width: 82%; background-color: var(--primary-color);"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Task accuracy rate</span>
                <span class="text-indigo-400" style="color: var(--accent-color);">99.98%</span>
              </div>
              <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width: 96%; background-color: var(--primary-color);"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Manual labor reduced</span>
                <span class="text-indigo-400" style="color: var(--accent-color);">94% reduction</span>
              </div>
              <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full" style="width: 91%; background-color: var(--primary-color);"></div>
              </div>
            </div>
          </div>

          <div class="pt-6 border-t flex items-center gap-4" style="border-color: rgba(255, 255, 255, 0.05);">
            <div class="flex -space-x-2.5">
              <span class="w-7 h-7 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center text-3xs font-black">A</span>
              <span class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-3xs font-black">P</span>
              <span class="w-7 h-7 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-3xs font-black">S</span>
            </div>
            <p class="text-xs text-slate-400 font-medium">Joined by <strong class="text-white">2,000+ teams</strong> this month alone.</p>
          </div>
        </div>

        <!-- Copy Block -->
        <div class="space-y-6">
          <span class="text-xs font-bold tracking-wider text-slate-400 uppercase">ABOUT ${this.escapeHtml(config.businessName).toUpperCase()}</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white tracking-tight leading-tight">
            ${this.escapeHtml(config.aboutTitle)}
          </h2>
          <p class="text-slate-400 leading-relaxed text-sm">
            ${this.escapeHtml(config.aboutDescription)}
          </p>

          <ul class="space-y-3 pt-2 text-slate-300 text-xs font-medium">
            <li class="flex items-center gap-2">
              <span class="text-emerald-400 font-extrabold">✓</span> Automated cloud scale pipelines
            </li>
            <li class="flex items-center gap-2">
              <span class="text-emerald-400 font-extrabold">✓</span> ISO-27001, SOC-2 compliant architectures
            </li>
            <li class="flex items-center gap-2">
              <span class="text-emerald-400 font-extrabold">✓</span> Integrated globally with 200+ partner services
            </li>
          </ul>
        </div>

      </div>
    </section>

    <!-- SERVICES / PRODUCTS SECTION -->
    <section id="services" class="py-24 border-t relative z-10" style="border-color: rgba(255, 255, 255, 0.05); background-color: rgba(255, 255, 255, 0.01);">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--primary-color);">WHAT WE DELIVER</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white">One platform, every workflow need</h2>
          <p class="text-slate-400 text-sm">Empower your operations with top-tier automation and intelligence modules.</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          ${saasServicesHtml}
        </div>
      </div>
    </section>

    <!-- CORE FEATURES SECTION -->
    <section id="features" class="py-24 relative z-10 border-t" style="border-color: rgba(255, 255, 255, 0.05);">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">ENGINEERING CAPABILITIES</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white mt-4">Built for teams that refuse to slow down</h2>
        </div>

        <div class="grid lg:grid-cols-3 gap-8">
          <div class="p-8 rounded-3xl lg:col-span-2 border flex flex-col justify-between"
               style="background-color: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
            <div class="space-y-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/15 text-indigo-400 text-lg">⚡</div>
              <h3 class="text-lg font-bold text-white font-display">Sub-second trigger latency</h3>
              <p class="text-slate-400 text-sm leading-relaxed">
                Most automation systems poll for updates periodically. We implement continuous webhook structures, triggering complex pipelines and cross-sync arrays in less than 200ms.
              </p>
            </div>
            <div class="bg-indigo-600/10 border rounded-xl p-4 flex items-center justify-between text-xs mt-6"
                 style="border-color: rgba(108, 71, 255, 0.2);">
              <span class="text-slate-400">Average process trigger latency</span>
              <span class="font-display font-bold text-white" style="color: var(--accent-color);">187ms global</span>
            </div>
          </div>

          <div class="p-8 rounded-3xl border space-y-4"
               style="background-color: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-400 text-lg">🔄</div>
            <h3 class="text-lg font-bold text-white font-display">Multi-region automatic failover</h3>
            <p class="text-slate-400 text-sm leading-relaxed">
              We operate triple-redundancy active configurations. If an isolated node goes offline, transactions are rerouted in real time to secure zero-loss compliance.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING SECTION -->
    <section id="pricing" class="py-24 border-t relative z-10" style="border-color: rgba(255, 255, 255, 0.05); background-color: rgba(255, 255, 255, 0.01);">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--primary-color);">TRANSPARENT PLANS</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white">Simple, honest pricing</h2>
          <p class="text-slate-400 text-sm">Choose a pricing package that matches your actual operational workload.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          ${saasPricingHtml}
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS SECTION -->
    <section id="testimonials" class="py-24 relative z-10 border-t" style="border-color: rgba(255, 255, 255, 0.05);">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">REVIEWS</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white">What operations teams say</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="p-6 rounded-2xl border flex flex-col justify-between"
               style="background-color: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
            <p class="text-slate-300 text-sm italic mb-6 leading-relaxed">
              "This platform completely optimized our daily operations. We eliminated three legacy subscriptions and saved over 30 hours per week of repetitive coordination tasks."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-400">PS</div>
              <div>
                <p class="text-xs font-bold text-white">Priya Sharma</p>
                <p class="text-[10px] text-slate-400">VP Operations, Waverly</p>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-2xl border flex flex-col justify-between"
               style="background-color: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
            <p class="text-slate-300 text-sm italic mb-6 leading-relaxed">
              "We migrated all Salesforce and Jira syncing procedures to this engine. What used to take our systems engineer days now runs continuously in the background without any attention."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-400">DO</div>
              <div>
                <p class="text-xs font-bold text-white">Daniel Osei</p>
                <p class="text-[10px] text-slate-400">RevOps Director, Montra</p>
              </div>
            </div>
          </div>

          <div class="p-6 rounded-2xl border flex flex-col justify-between"
               style="background-color: rgba(255, 255, 255, 0.01); border-color: rgba(255, 255, 255, 0.05);">
            <p class="text-slate-300 text-sm italic mb-6 leading-relaxed">
              "We fully offloaded our micro-integration middleware tasks here. The return on investment has been exceptional, freeing up several developers to focus strictly on our core product."
            </p>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-400 flex items-center justify-center text-xs font-bold text-amber-400">YT</div>
              <div>
                <p class="text-xs font-bold text-white">Yuki Tanaka</p>
                <p class="text-[10px] text-slate-400">Chief Technology Officer, Sora</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQS SECTION -->
    <section id="faqs" class="py-24 border-t relative z-10" style="border-color: rgba(255, 255, 255, 0.05); background-color: rgba(255, 255, 255, 0.01);">
      <div class="max-w-4xl mx-auto px-6">
        <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">FAQ</span>
          <h2 class="text-3xl md:text-4xl font-display font-bold text-white">Questions? We've got answers</h2>
        </div>

        <div class="space-y-2">
          ${saasFaqsHtml}
        </div>
      </div>
    </section>

    <!-- CONTACT / EMAIL CAPTURE CTA -->
    <section id="contact" class="py-24 relative z-10 border-t" style="border-color: rgba(255, 255, 255, 0.05);">
      <div class="max-w-4xl mx-auto px-6">
        <div class="relative rounded-3xl p-1 px-1 overflow-hidden"
             style="background: linear-gradient(135deg, rgba(108,71,255,0.4), rgba(0,212,255,0.2), rgba(108,71,255,0.4))">
          
          <div class="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
               style="background-color: var(--secondary-bg);">
            <div class="absolute inset-0 opacity-10 pointer-events-none"
                 style="background: radial-gradient(ellipse 80% 60% at 50% 0%, var(--primary-color), transparent)"></div>
            
            <div class="relative z-10 space-y-6">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Get started today</span>
              <h2 class="text-3xl md:text-4xl font-display font-bold text-white">
                Your team is ready to <span class="gradient-text">work smarter</span>
              </h2>
              <p class="text-slate-400 text-sm max-w-lg mx-auto">
                Join thousands of modern operations groups who have eliminated the busywork and focused strictly on high-value results.
              </p>

              <!-- Email form -->
              <form class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-4" ${formAction}>
                <input type="email" name="email" required class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-slate-900 text-white" placeholder="your@company.com" />
                <button type="submit" class="px-6 py-3 text-white text-xs font-bold rounded-xl shadow-lg transition-colors hover:opacity-90"
                        style="background-color: var(--primary-color);">
                  Start free trial
                </button>
              </form>

              <p class="text-3xs text-slate-500 font-medium pt-2">No credit card required · 14-day free trial · Cancel anytime</p>
            </div>
          </div>

        </div>
      </div>
    </section>

  </main>

  <!-- =====================================================
       FOOTER
       ===================================================== -->
  <footer class="py-12 border-t text-center text-xs" style="border-color: rgba(255, 255, 255, 0.05); background-color: rgba(0,0,0,0.15);">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400">
      <p>&copy; ${new Date().getFullYear()} ${this.escapeHtml(config.businessName)}. All rights reserved.</p>
      <p>Built with <span class="text-white font-semibold">Lifehut Studio™</span></p>
    </div>
  </footer>

  <script>
    // Toggle FAQ Accordion function
    function toggleFaq(index) {
      const answer = document.getElementById('faq-answer-' + index);
      const icon = document.getElementById('faq-icon-' + index);
      if (!answer) return;

      const isHidden = answer.classList.contains('hidden');
      if (isHidden) {
        answer.classList.remove('hidden');
        answer.classList.add('block');
        icon.innerText = '−';
        icon.style.color = 'var(--primary-color)';
      } else {
        answer.classList.add('hidden');
        answer.classList.remove('block');
        icon.innerText = '+';
        icon.style.color = '';
      }
    }

    ${razorpayCustomScript}
  </script>

</body>
</html>`;
    }

    // Default templates compile path
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(seoTitle)}</title>
  <meta name="description" content="${this.escapeHtml(seoDescription)}">
  <meta name="keywords" content="${this.escapeHtml(seoKeywords)}">
  
  <!-- SEO EXTENSION POINT -->
  <link rel="canonical" href="#">
  
  <!-- ANALYTICS EXTENSION POINT -->
  ${analyticsCode}

  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Unified Tailwind Standard Utility Styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          }
        }
      }
    }
  </script>

  <style>
    ${customStyleVariables}
    body {
      font-family: var(--font-family);
    }
    .text-primary-color {
      color: var(--primary-color);
    }
    .bg-primary-color {
      background-color: var(--primary-color);
    }
    .border-primary-color {
      border-color: var(--primary-color);
    }
    ${customCss}
  </style>

  <!-- CUSTOM HEADER CODE EXTENSION POINT -->
  ${customHeaderHtml}
  ${razorpaySdkScript}
</head>
<body class="bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">

  <!-- NAVIGATION BAR -->
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-150/50">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 text-white rounded-xl flex items-center justify-center font-bold shadow-md shadow-slate-150/80" style="background-color: var(--primary-color);">
          ${logoIconSvg}
        </div>
        <div>
          <span class="text-lg font-extrabold text-slate-900 tracking-tight leading-none block">${this.escapeHtml(config.logoText)}</span>
          <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider">${this.escapeHtml(config.businessName)}</span>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-8">
        <a href="#about" class="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">About Us</a>
        <a href="#services" class="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Services</a>
        <a href="#gallery" class="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Projects</a>
        <a href="#pricing" class="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Pricing</a>
        <a href="#faqs" class="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
      </nav>
      <div class="flex items-center gap-4">
        <a href="tel:${this.escapeHref(config.phone)}" class="hidden sm:inline-flex text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors">${this.escapeHtml(config.phone)}</a>
        <a href="#contact" class="text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg transition-all" style="background-color: var(--primary-color);">Get a Quote</a>
      </div>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section id="hero" class="relative overflow-hidden py-24 lg:py-32 text-white" style="background-color: var(--secondary-bg);">
    <div class="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay" style="background-image: url('${firstGalleryUrl}')"></div>
    <div class="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
      <span class="border font-bold tracking-wider text-xs px-4 py-1.5 rounded-full uppercase mb-6" style="background-color: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.15); color: var(--accent-color);">${this.escapeHtml(config.heroBadge)}</span>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">${this.escapeHtml(config.heroHeadline)}</h1>
      <p class="text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed mb-10">${this.escapeHtml(config.heroSubheadline)}</p>
      <div class="flex flex-col sm:flex-row gap-4">
        <a href="#services" class="text-white font-bold text-sm px-8 py-4 rounded-xl shadow-lg transition-all" style="background-color: var(--primary-color);">${this.escapeHtml(config.heroPrimaryBtn)}</a>
        <a href="#gallery" class="bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-sm px-8 py-4 rounded-xl border border-slate-700 transition-all">${this.escapeHtml(config.heroSecondaryBtn)}</a>
      </div>
    </div>
  </section>

  <!-- ABOUT SECTION -->
  <section id="about" class="py-24 max-w-7xl mx-auto px-6">
    <div class="grid lg:grid-cols-12 gap-16 items-center">
      <div class="lg:col-span-7 space-y-6">
        <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--primary-color);">Who We Are</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">${this.escapeHtml(config.aboutTitle)}</h2>
        <p class="text-slate-600 leading-relaxed">${this.escapeHtml(config.aboutDescription)}</p>
        
        <div class="grid sm:grid-cols-2 gap-8 pt-6">
          <div class="p-6 bg-white rounded-2xl border border-slate-150/60 shadow-xs flex items-center gap-4">
            <span class="text-3xl font-black" style="color: var(--primary-color);">${this.escapeHtml(config.aboutStatVal1)}</span>
            <span class="text-sm font-semibold text-slate-500 leading-tight">${this.escapeHtml(config.aboutStatLabel1)}</span>
          </div>
          <div class="p-6 bg-white rounded-2xl border border-slate-150/60 shadow-xs flex items-center gap-4">
            <span class="text-3xl font-black" style="color: var(--primary-color);">${this.escapeHtml(config.aboutStatVal2)}</span>
            <span class="text-sm font-semibold text-slate-500 leading-tight">${this.escapeHtml(config.aboutStatLabel2)}</span>
          </div>
        </div>
      </div>
      <div class="lg:col-span-5 relative">
        <div class="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
          <img src="${secondGalleryUrl}" alt="About Showcase Image" class="w-full h-full object-cover" />
        </div>
        <div class="absolute -bottom-6 -left-6 text-white p-6 rounded-2xl shadow-xl hidden sm:block" style="background-color: var(--primary-color);">
          <p class="text-2xl font-black">100%</p>
          <p class="text-xs font-semibold" style="color: var(--primary-bg);">Guaranteed Satisfaction</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SERVICES SECTION -->
  <section id="services" class="py-24 bg-slate-100/30">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--primary-color);">Our Expertise</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Services We Deliver</h2>
        <p class="text-slate-500 text-sm">Professional solutions designed to fulfill every structural demand perfectly.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        ${servicesHtml}
      </div>
    </div>
  </section>

  <!-- GALLERY SECTION -->
  <section id="gallery" class="py-24 max-w-7xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
      <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--primary-color);">Portfolio</span>
      <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Our Completed Projects</h2>
      <p class="text-slate-500 text-sm">A visual showcase of our premium construction and design projects.</p>
    </div>
    
    <!-- Carousel Layout -->
    <div class="max-w-4xl mx-auto relative overflow-hidden rounded-3xl aspect-[16/9] bg-slate-900 shadow-xl group" id="export-carousel-container">
      <div id="export-slide-wrapper" class="w-full h-full relative">
        ${galleryHtml}
      </div>

      <!-- Arrow Controls -->
      <button onclick="prevSlide()" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/45 backdrop-blur-sm flex items-center justify-center text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
        ‹
      </button>
      <button onclick="nextSlide()" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/45 backdrop-blur-sm flex items-center justify-center text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
        ›
      </button>

      <!-- Dots Indicators -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        ${galleryDotsHtml}
      </div>
    </div>
  </section>

  <!-- PRICING SECTION -->
  <section id="pricing" class="py-24 bg-slate-100/30">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--primary-color);">Transparent Pricing</span>
        <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Simple Pricing Models</h2>
        <p class="text-slate-500 text-sm">No hidden markups. Straightforward estimates and quotes tailored to your plan.</p>
      </div>
      <div class="grid gap-8 ${pricingGridClass}">
        ${pricingHtml}
      </div>
    </div>
  </section>

  <!-- FAQ SECTION -->
  <section id="faqs" class="py-24 max-w-7xl mx-auto px-6">
    <div class="text-center max-w-2xl mx-auto mb-16 space-y-4">
      <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--primary-color);">Got Questions?</span>
      <h2 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Frequently Answered</h2>
      <p class="text-slate-500 text-sm">Everything you need to know about starting your project with us.</p>
    </div>
    <div class="space-y-4 max-w-4xl mx-auto">
      ${faqsHtml}
    </div>
  </section>

  <!-- CONTACT SECTION -->
  <section id="contact" class="py-24 text-white" style="background-color: var(--secondary-bg);">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid lg:grid-cols-12 gap-16 items-center">
        <div class="lg:col-span-5 space-y-8">
          <span class="font-extrabold uppercase tracking-widest text-xs" style="color: var(--accent-color);">Let's Connect</span>
          <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight">Start Your Project Journey Today</h2>
          <p class="text-slate-400 leading-relaxed text-sm">Contact our engineers for an inspection, structural walkthrough, or a customized quote proposal.</p>
          
          <div class="space-y-4 pt-4">
            <div class="flex items-start gap-4">
              <span class="text-lg" style="color: var(--accent-color);">📞</span>
              <div>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Phone</p>
                <p class="font-semibold text-slate-200 text-sm">${this.escapeHtml(config.phone)}</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <span class="text-lg" style="color: var(--accent-color);">✉️</span>
              <div>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Email Address</p>
                <p class="font-semibold text-slate-200 text-sm">${this.escapeHtml(config.email)}</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <span class="text-lg" style="color: var(--accent-color);">📍</span>
              <div>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Office</p>
                <p class="font-semibold text-slate-200 text-sm">${this.escapeHtml(config.contactAddress)}</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <span class="text-lg" style="color: var(--accent-color);">⏰</span>
              <div>
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Hours</p>
                <p class="font-semibold text-slate-200 text-sm">${this.escapeHtml(config.contactHours)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="lg:col-span-7 bg-white text-slate-950 p-8 md:p-10 rounded-3xl shadow-xl">
          <h3 class="text-2xl font-bold text-slate-900 mb-2">Request an Estimate</h3>
          <p class="text-slate-500 text-sm mb-6">Send your parameters and our specialists will reach out in 24 hours.</p>
          <form class="space-y-4" ${formAction}>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Your Name</label>
                <input type="text" name="name" required class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white" />
              </div>
              <div>
                <label class="block text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Your Email</label>
                <input type="email" name="email" required class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white" />
              </div>
            </div>
            <div>
              <label class="block text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Project Type</label>
              <select name="project_type" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white">
                <option>Custom Residential Build</option>
                <option>Luxury Kitchen & Bath Remodel</option>
                <option>Structural Reinforcement</option>
                <option>Commercial Development</option>
              </select>
            </div>
            <div>
              <label class="block text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Project Message</label>
              <textarea name="message" rows="4" required class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white" placeholder="Describe parameters, budget, and location..."></textarea>
            </div>
            <button type="submit" class="w-full py-4 text-white font-bold text-sm rounded-xl shadow-lg transition-all" style="background-color: var(--primary-color);">Submit Request</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="bg-slate-950 text-slate-400 border-t border-slate-900 py-12 text-center text-xs">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <p>&copy; ${new Date().getFullYear()} ${this.escapeHtml(config.businessName)}. All rights reserved.</p>
      <p>Built with <span class="text-white font-semibold">Lifehut Studio™</span></p>
    </div>
  </footer>

  <!-- CUSTOM FOOTER CODE EXTENSION POINT -->
  ${customFooterHtml}

  <script>
    let currentSlide = 0;
    const totalSlides = ${config.gallery.length};
    
    function updateSlides() {
      const slides = document.querySelectorAll('.carousel-slide');
      const dots = document.querySelectorAll('.carousel-dot');
      
      slides.forEach((slide, idx) => {
        if (idx === currentSlide) {
          slide.classList.remove('opacity-0', 'z-0');
          slide.classList.add('opacity-100', 'z-10');
        } else {
          slide.classList.remove('opacity-100', 'z-10');
          slide.classList.add('opacity-0', 'z-0');
        }
      });
      
      dots.forEach((dot, idx) => {
        if (idx === currentSlide) {
          dot.classList.remove('bg-white/40', 'hover:bg-white/75');
          dot.style.backgroundColor = 'var(--primary-color)';
          dot.classList.add('w-4');
        } else {
          dot.style.backgroundColor = '';
          dot.classList.remove('w-4');
          dot.classList.add('bg-white/40', 'hover:bg-white/75');
        }
      });
    }
    
    function nextSlide() {
      if (totalSlides === 0) return;
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlides();
    }
    
    function prevSlide() {
      if (totalSlides === 0) return;
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateSlides();
    }
    
    function goToSlide(index) {
      currentSlide = index;
      updateSlides();
    }
    
    // Autoplay Carousel (3 seconds interval)
    if (totalSlides > 0) {
      setInterval(nextSlide, 3000);
    }

    // Toggle FAQ Accordion function
    function toggleFaq(index) {
      const answer = document.getElementById('faq-answer-' + index);
      const icon = document.getElementById('faq-icon-' + index);
      if (!answer) return;

      const isHidden = answer.classList.contains('hidden');
      if (isHidden) {
        answer.classList.remove('hidden');
        answer.classList.add('block');
        icon.innerHTML = '<svg class="w-3.5 h-3.5 stroke-[3]" style="color: var(--primary-color);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        icon.classList.remove('text-slate-400');
        icon.style.color = 'var(--primary-color)';
      } else {
        answer.classList.add('hidden');
        answer.classList.remove('block');
        icon.innerHTML = '<svg class="w-3.5 h-3.5 stroke-[3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        icon.classList.add('text-slate-400');
        icon.style.color = '';
      }
    }

    ${razorpayCustomScript}
  </script>

</body>
</html>`;
  }
}
