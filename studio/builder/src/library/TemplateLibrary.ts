import { WebsiteConfig } from '../types';

export interface Industry {
  id: string;
  name: string;
  description: string;
}

export interface Template {
  id: string;
  name: string;
  industryId: string;
  description: string;
  version: string;
}

export interface Theme {
  id: string;
  name: string;
  fontFamily: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryBg: string;
    secondaryBg: string;
    textDark: string;
    textLight: string;
    border: string;
    accent: string;
  };
}

// 1. Industries Module
export const INDUSTRIES: Industry[] = [
  {
    id: "construction",
    name: "Construction & Remodeling",
    description: "Premium builder, masonry, renovation, and structural engineering layouts."
  },
  {
    id: "services",
    name: "Professional Services",
    description: "Modern consulting, creative agencies, and customized service providers."
  },
  {
    id: "tech_saas",
    name: "SaaS & Tech Companies",
    description: "Modern landing pages for software-as-a-service, workflow platforms, and AI apps."
  }
];

// 2. Templates Module
export const TEMPLATES: Template[] = [
  {
    id: "apex-classic",
    name: "Apex Classic",
    industryId: "construction",
    description: "The classic high-contrast layout for builders and contractors.",
    version: "1.0.0"
  },
  {
    id: "brick-modern",
    name: "Brick Modernist",
    industryId: "construction",
    description: "Minimalist layout optimized for architectural studios and designers.",
    version: "1.0.0"
  },
  {
    id: "consult-pro",
    name: "Consult Pro",
    industryId: "services",
    description: "Sleek, high-converting service layout with clean bento grid segments.",
    version: "1.0.0"
  },
  {
    id: "saas-modern",
    name: "SaaS Minimalist",
    industryId: "tech_saas",
    description: "A dark high-converting modern SaaS page optimized with live dashboards.",
    version: "1.0.0"
  }
];

// 3. Themes Module
export const THEMES: Theme[] = [
  {
    id: "slate",
    name: "Slate Minimalist (Dark Steel & Blue)",
    fontFamily: "Inter, sans-serif",
    colors: {
      primary: "rgb(37, 99, 235)", // blue-600
      primaryHover: "rgb(29, 78, 216)", // blue-700
      primaryBg: "rgb(239, 246, 255)", // blue-50
      secondaryBg: "rgb(15, 23, 42)", // slate-900
      textDark: "rgb(15, 23, 42)", // slate-900
      textLight: "rgb(241, 245, 249)", // slate-100
      border: "rgb(226, 232, 240)", // slate-200
      accent: "rgb(59, 130, 246)" // blue-500
    }
  },
  {
    id: "emerald",
    name: "Emerald Forest (Warm Wood & Pine)",
    fontFamily: "Inter, sans-serif",
    colors: {
      primary: "rgb(5, 150, 105)", // emerald-600
      primaryHover: "rgb(4, 120, 87)", // emerald-700
      primaryBg: "rgb(240, 253, 250)", // emerald-50
      secondaryBg: "rgb(20, 30, 25)", // forest dark
      textDark: "rgb(20, 30, 25)",
      textLight: "rgb(244, 244, 245)",
      border: "rgb(228, 228, 231)",
      accent: "rgb(16, 185, 129)"
    }
  },
  {
    id: "obsidian",
    name: "Obsidian Contrast (High Tech Amber)",
    fontFamily: "Inter, sans-serif",
    colors: {
      primary: "rgb(217, 119, 6)", // amber-600
      primaryHover: "rgb(180, 83, 9)", // amber-700
      primaryBg: "rgb(254, 243, 199)", // amber-50
      secondaryBg: "rgb(12, 12, 12)", // ultra-dark
      textDark: "rgb(24, 24, 27)",
      textLight: "rgb(244, 244, 245)",
      border: "rgb(228, 228, 231)",
      accent: "rgb(245, 158, 11)"
    }
  },
  {
    id: "dark-violet",
    name: "Dark Violet (SaaS Minimalist)",
    fontFamily: "Inter, sans-serif",
    colors: {
      primary: "rgb(108, 71, 255)", // #6C47FF
      primaryHover: "rgb(139, 111, 255)", // #8B6FFF
      primaryBg: "rgba(108, 71, 255, 0.15)",
      secondaryBg: "rgb(10, 15, 30)", // #0A0F1E
      textDark: "rgb(10, 15, 30)",
      textLight: "rgb(241, 245, 249)",
      border: "rgba(255, 255, 255, 0.08)",
      accent: "rgb(0, 212, 255)" // #00D4FF
    }
  }
];

// 4. Default Content Module (Separated from Layout and Themes)
export const DEFAULT_CONTENTS: Record<string, WebsiteConfig> = {
  "construction": {
    businessName: "Apex Builders",
    phone: "(555) 382-9011",
    email: "info@apexbuilders.com",
    logoText: "APEX",
    logoIcon: "HardHat",
    heroBadge: "EXCELLENCE IN CRAFTSMANSHIP",
    heroHeadline: "Building Spaces You'll Love to Live In",
    heroSubheadline: "Premier construction, custom renovations, and commercial developments engineered to last. Done right the first time.",
    heroPrimaryBtn: "Our Services",
    heroSecondaryBtn: "View Projects",
    aboutTitle: "Our Legacy of Quality",
    aboutDescription: "Since 2012, Apex Builders has delivered unmatched craftsmanship and structural integrity. We treat every blueprint as a personal commitment to perfection, partnering with clients to turn visions into breathtaking realities.",
    aboutStatLabel1: "Completed Projects",
    aboutStatVal1: "250+",
    aboutStatLabel2: "Years in Business",
    aboutStatVal2: "14",
    services: [
      {
        id: "service-1",
        title: "Custom Home Construction",
        description: "We design and build custom modern residences with premium materials, state-of-the-art systems, and flawless execution.",
        iconName: "Home"
      },
      {
        id: "service-2",
        title: "High-End Remodeling",
        description: "Transform your kitchens, bathrooms, and living spaces with top-tier premium finishes and customized layouts.",
        iconName: "Wrench"
      },
      {
        id: "service-3",
        title: "Structural Renovation",
        description: "Enhance, restore, and reinforce existing properties to align with modern safety regulations and modern layouts.",
        iconName: "Hammer"
      }
    ],
    gallery: [
      {
        id: "gal-1",
        url: "asset://gallery-1",
        title: "Modern Residence Exterior"
      },
      {
        id: "gal-2",
        url: "asset://gallery-2",
        title: "Designer Chef's Kitchen"
      },
      {
        id: "gal-3",
        url: "asset://gallery-3",
        title: "Structural Frame & Engineering"
      },
      {
        id: "gal-4",
        url: "asset://gallery-4",
        title: "Contemporary Living Lounge"
      }
    ],
    pricing: [
      {
        id: "price-1",
        name: "Design & Consultation",
        price: "$1,499",
        period: "Fixed Fee",
        features: [
          "Site analysis & assessment",
          "3D architectural structural mockups",
          "Detailed material cost estimation",
          "Preliminary safety verification"
        ],
        popular: false
      },
      {
        id: "price-2",
        name: "Complete Build-Out",
        price: "$180",
        period: "per Sq. Ft.",
        features: [
          "Full project management",
          "Licensed builders & engineers",
          "Premium graded materials",
          "Daily on-site expert supervision",
          "Comprehensive structural warranty"
        ],
        popular: true
      }
    ],
    faqs: [
      {
        id: "faq-1",
        question: "How do you handle budget estimates and project timelines?",
        answer: "We provide a fully itemized, transparent guaranteed-maximum-price proposal before breaking ground. This completely eliminates surprise surcharges. Timelines are meticulously tracked on visual Gantt charts."
      },
      {
        id: "faq-2",
        question: "Are your builders licensed, bonded, and fully insured?",
        answer: "Absolutely. We hold full state licensure, complete bond coverage, and extensive general liability and workers' compensation insurance to ensure complete peace of mind."
      }
    ],
    contactAddress: "842 Blueprint Boulevard, Suite 300, San Francisco, CA 94107",
    contactHours: "Mon - Fri: 8:00 AM - 6:00 PM | Sat: 9:00 AM - 2:00 PM"
  },
  "services": {
    businessName: "Synergy Consulting",
    phone: "(555) 902-1100",
    email: "partner@synergyconsult.com",
    logoText: "SYNERGY",
    logoIcon: "Briefcase",
    heroBadge: "STRATEGY & PERFORMANCE",
    heroHeadline: "Scale Your Business With Expert Advisors",
    heroSubheadline: "Our bespoke data-driven methodologies empower modern businesses to unlock sustainable enterprise growth.",
    heroPrimaryBtn: "Our Services",
    heroSecondaryBtn: "Contact Us",
    aboutTitle: "Decades of Strategic Success",
    aboutDescription: "Synergy Consulting provides custom growth playbooks and workflow automation blueprints to secure high-value outcomes for clients globally.",
    aboutStatLabel1: "Active Clients",
    aboutStatVal1: "120+",
    aboutStatLabel2: "Growth Yield",
    aboutStatVal2: "3.4x",
    services: [
      {
        id: "service-1",
        title: "Growth Advisory",
        description: "Comprehensive financial planning and expansion modeling for high-scale enterprise operations.",
        iconName: "TrendingUp"
      },
      {
        id: "service-2",
        title: "Operations Optimization",
        description: "Streamline and automate legacy business architectures to yield direct cost efficiency.",
        iconName: "Settings"
      },
      {
        id: "service-3",
        title: "Marketing Intelligence",
        description: "Formulate brand initiatives that maximize retention metrics and client acquisition pipelines.",
        iconName: "Globe"
      }
    ],
    gallery: [
      {
        id: "gal-1",
        url: "asset://gallery-1",
        title: "Corporate Advisory Lounge"
      },
      {
        id: "gal-2",
        url: "asset://gallery-2",
        title: "Dynamic Dashboard Analytics"
      },
      {
        id: "gal-3",
        url: "asset://gallery-3",
        title: "Collaborative Workshop Strategy"
      },
      {
        id: "gal-4",
        url: "asset://gallery-4",
        title: "Global Enterprise Center"
      }
    ],
    pricing: [
      {
        id: "price-1",
        name: "Strategic Assessment",
        price: "$2,500",
        period: "Fixed Fee",
        features: [
          "Audit of complete business stack",
          "Competitive matrix mapping",
          "Actionable operations playbook"
        ],
        popular: false
      },
      {
        id: "price-2",
        name: "Enterprise Scaling",
        price: "$4,500",
        period: "per Month",
        features: [
          "Bi-weekly partner syncs",
          "Custom marketing pipeline build",
          "Dedicated workflow automation support"
        ],
        popular: true
      }
    ],
    faqs: [
      {
        id: "faq-1",
        question: "What is your onboarding process for new corporate partners?",
        answer: "We perform a thorough 7-day audit of your technical stack and financial metrics, presenting our detailed analysis and optimization playbook in a dedicated board briefing."
      },
      {
        id: "faq-2",
        question: "Do you offer success-based pricing arrangements?",
        answer: "For selected enterprise integrations and growth projects, we can design equity or revenue-share success premiums aligned with your performance metrics."
      }
    ],
    contactAddress: "404 Innovation Way, Floor 12, New York, NY 10013",
    contactHours: "Mon - Fri: 9:00 AM - 5:00 PM EST"
  },
  "tech_saas": {
    businessName: "Lifehut Studio",
    phone: "(555) 728-1192",
    email: "support@lifehutsolutions.com",
    logoText: "LHS",
    logoIcon: "Briefcase",
    heroBadge: "✦ TRUSTED BY 12,000+ TEAMS WORLDWIDE",
    heroHeadline: "Automate Work. Ship Faster. Win More.",
    heroSubheadline: "Lifehut Studio uses AI to map, optimize, and automate your team's workflows. Connect 200+ tools in minutes — no engineers needed.",
    heroPrimaryBtn: "Start for free",
    heroSecondaryBtn: "See how it works",
    aboutTitle: "We believe teams deserve time to think, not click",
    aboutDescription: "In 2021, we watched brilliant teams waste 40% of their week on repetitive tasks — copying data between apps, sending status updates, chasing approvals. We built Lifehut Studio to end that. Today, Lifehut Studio's AI understands your team's unique workflow patterns and continuously optimizes them. It's not just automation — it's a second brain for your operations.",
    aboutStatLabel1: "Teams Active",
    aboutStatVal1: "12,000+",
    aboutStatLabel2: "Average Rating",
    aboutStatVal2: "4.9 ★",
    services: [
      {
        id: "service-1",
        title: "AI Workflow Builder",
        description: "Describe your process in plain English. Lifehut Studio's AI maps it into a working automation — no drag-and-drop required.",
        iconName: "Brain"
      },
      {
        id: "service-2",
        title: "Multi-App Orchestration",
        description: "Connect Slack, Salesforce, Jira, Gmail, and 197 more apps into seamless automated pipelines that run 24/7.",
        iconName: "Link"
      },
      {
        id: "service-3",
        title: "Real-Time Analytics",
        description: "Every automation generates data. Lifehut Studio surfaces bottlenecks, suggests improvements, and forecasts time savings.",
        iconName: "TrendingUp"
      },
      {
        id: "service-4",
        title: "Smart Approval Flows",
        description: "Route requests to the right person automatically, send reminders, and escalate stalled approvals — no more inbox chasing.",
        iconName: "Settings"
      },
      {
        id: "service-5",
        title: "Secure Data Sync",
        description: "End-to-end encrypted data pipelines keep your customer records, financials, and internal data perfectly in sync.",
        iconName: "Shield"
      },
      {
        id: "service-6",
        title: "Team Collaboration",
        description: "Shared automation libraries, version history, and role-based permissions let teams build and own automations together.",
        iconName: "Users"
      }
    ],
    gallery: [
      {
        id: "gal-1",
        url: "asset://gallery-1",
        title: "AI Flow Design Interface"
      },
      {
        id: "gal-2",
        url: "asset://gallery-2",
        title: "Live Operations Pipeline"
      },
      {
        id: "gal-3",
        url: "asset://gallery-3",
        title: "Team Permissions Controls"
      },
      {
        id: "gal-4",
        url: "asset://gallery-4",
        title: "Real-Time Process Analytics"
      }
    ],
    pricing: [
      {
        id: "price-1",
        name: "Starter",
        price: "$29",
        period: "mo",
        features: [
          "Up to 3 team members",
          "5,000 automation runs/mo",
          "50 active workflows",
          "30+ integrations",
          "Email support"
        ],
        popular: false
      },
      {
        id: "price-2",
        name: "Pro",
        price: "$89",
        period: "mo",
        features: [
          "Up to 15 team members",
          "50,000 automation runs/mo",
          "Unlimited workflows",
          "200+ integrations",
          "AI co-pilot included",
          "Priority chat support",
          "Advanced analytics"
        ],
        popular: true
      },
      {
        id: "price-3",
        name: "Enterprise",
        price: "Custom",
        period: "tailored",
        features: [
          "Unlimited team members",
          "Unlimited automation runs",
          "Custom integrations",
          "SSO / SAML 2.0",
          "Dedicated success manager",
          "SLA guarantee (99.99%)",
          "On-premises deployment"
        ],
        popular: false
      }
    ],
    faqs: [
      {
        id: "faq-1",
        question: "Do I need coding skills to use Lifehut Studio™?",
        answer: "Not at all. Lifehut Studio is designed for everyone. Our AI workflow builder lets you describe automations in plain English. For power users, we also offer a full visual editor and a developer API."
      },
      {
        id: "faq-2",
        question: "How does the 14-day free trial work?",
        answer: "Sign up and get full access to all Pro features for 14 days — no credit card required. At the end of the trial, choose a plan to continue or your account pauses automatically. We'll never charge you without permission."
      },
      {
        id: "faq-3",
        question: "Can I connect my existing tools?",
        answer: "Yes — Lifehut Studio connects with 200+ apps including Salesforce, HubSpot, Jira, GitHub, Slack, Gmail, Notion, Stripe, and more. If your tool isn't listed, you can connect it via our REST API or webhook support."
      },
      {
        id: "faq-4",
        question: "Is my data secure?",
        answer: "Absolutely. Lifehut Studio is SOC 2 Type II certified and GDPR compliant. All data is encrypted with AES-256 at rest and TLS 1.3 in transit. We undergo annual penetration testing and never sell or share your data."
      }
    ],
    contactAddress: "404 Innovation Way, Floor 12, New York, NY 10013",
    contactHours: "Mon - Sun: 24/7 Global Live Support"
  }
};

// Map default asset references per industry to real high-resolution royalty-free backup URLs
export const INDUSTRY_DEFAULT_ASSETS: Record<string, Record<string, string>> = {
  "construction": {
    "asset://gallery-1": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-2": "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-3": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-4": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80"
  },
  "services": {
    "asset://gallery-1": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-2": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-3": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-4": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80"
  },
  "tech_saas": {
    "asset://gallery-1": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-2": "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-3": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    "asset://gallery-4": "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=600&q=80"
  }
};

export const DEFAULT_ASSETS: Record<string, string> = {
  ...INDUSTRY_DEFAULT_ASSETS["construction"]
};
