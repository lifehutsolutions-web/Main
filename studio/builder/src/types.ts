export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  popular: boolean;
  razorpayAmount?: number;
  enableRazorpay?: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface WebsiteConfig {
  // General Info
  businessName: string;
  phone: string;
  email: string;
  logoText: string;
  logoIcon: string;
  logoFileUrl?: string;

  // Hero Section
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryBtn: string;
  heroSecondaryBtn: string;

  // About Section
  aboutTitle: string;
  aboutDescription: string;
  aboutStatLabel1: string;
  aboutStatVal1: string;
  aboutStatLabel2: string;
  aboutStatVal2: string;

  // Services Section
  services: ServiceItem[];

  // Gallery Section
  gallery: GalleryItem[];

  // Pricing Section
  pricing: PricingPlan[];

  // FAQ Section
  faqs: FAQItem[];

  // Contact Section
  contactAddress: string;
  contactHours: string;
}

export type DevMode = 'desktop' | 'tablet' | 'mobile';

export interface TabInfo {
  id: number;
  label: string;
  icon: string;
  description: string;
  fields: string[];
}

export interface ProjectMetadata {
  schemaVersion: string;
  builderVersion: string;
  templateVersion: string;
  industryId: string;
  templateId: string;
  themeId: string;
  lastSaved: string;
}

export interface ProjectExtensionPoints {
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
    pixelId?: string;
  };
  ai?: {
    promptHistory?: string[];
    suggestedEdits?: string[];
  };
  integrations?: {
    customFormActionUrl?: string;
    razorpayKeyId?: string;
    razorpayBusinessName?: string;
    enableRazorpayGlobal?: boolean;
  };
  customCode?: {
    headerHtml?: string;
    footerHtml?: string;
    customCss?: string;
  };
}

export interface Project {
  metadata: ProjectMetadata;
  config: WebsiteConfig;
  assets: Record<string, string>; // Maps asset id (e.g. "asset://gallery-1") to base64 or blob URL
  extensions: ProjectExtensionPoints;
}

export interface Profile {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface License {
  id: string;
  user_id: string;
  template_id: string;
  created_at?: string;
  active: boolean;
}

export interface DbProject {
  id: string;
  user_id: string;
  template_id: string;
  industry_id: string;
  config: any; // The full Project object as JSON
  created_at?: string;
  updated_at?: string;
}


