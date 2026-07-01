import { WebsiteConfig } from './types';

export const INITIAL_WEBSITE_CONFIG: WebsiteConfig = {
  // General Info
  businessName: "Apex Builders",
  phone: "(555) 382-9011",
  email: "info@apexbuilders.com",
  logoText: "APEX",
  logoIcon: "HardHat",

  // Hero Section
  heroBadge: "EXCELLENCE IN CRAFTSMANSHIP",
  heroHeadline: "Building Spaces You'll Love to Live In",
  heroSubheadline: "Premier construction, custom renovations, and commercial developments engineered to last. Done right the first time.",
  heroPrimaryBtn: "Our Services",
  heroSecondaryBtn: "View Projects",

  // About Section
  aboutTitle: "Our Legacy of Quality",
  aboutDescription: "Since 2012, Apex Builders has delivered unmatched craftsmanship and structural integrity. We treat every blueprint as a personal commitment to perfection, partnering with clients to turn visions into breathtaking realities.",
  aboutStatLabel1: "Completed Projects",
  aboutStatVal1: "250+",
  aboutStatLabel2: "Years in Business",
  aboutStatVal2: "14",

  // Services Section
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

  // Gallery Section
  gallery: [
    {
      id: "gal-1",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
      title: "Modern Residence Exterior"
    },
    {
      id: "gal-2",
      url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80",
      title: "Designer Chef's Kitchen"
    },
    {
      id: "gal-3",
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
      title: "Structural Frame & Engineering"
    },
    {
      id: "gal-4",
      url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
      title: "Contemporary Living Lounge"
    }
  ],

  // Pricing Section
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

  // FAQ Section
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

  // Contact Section
  contactAddress: "842 Blueprint Boulevard, Suite 300, San Francisco, CA 94107",
  contactHours: "Mon - Fri: 8:00 AM - 6:00 PM | Sat: 9:00 AM - 2:00 PM"
};
