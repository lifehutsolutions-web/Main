import { Project, WebsiteConfig } from '../types';
import { supabase } from '../lib/supabase';
import { saveProjectToDb, getUserProjects } from '../services/projectService';
import { INDUSTRIES, TEMPLATES, THEMES, DEFAULT_CONTENTS, DEFAULT_ASSETS, INDUSTRY_DEFAULT_ASSETS } from './TemplateLibrary';

export class ProjectManager {
  private static STORAGE_KEY = 'lifehut_studio_active_project';
  public static SCHEMA_VERSION = '1.0.0';
  public static BUILDER_VERSION = '1.0.0';
  public static TEMPLATE_VERSION = '1.0.0';

  /**
   * Resolve user-friendly industry names/IDs to strict system-level industry IDs.
   */
  public static resolveIndustryId(industryId: string): string {
    const clean = industryId.trim().toLowerCase();
    if (clean === 'construction' || clean === 'construction & remodeling' || clean === 'construction-and-remodeling') {
      return 'construction';
    }
    if (clean === 'services' || clean === 'professional services' || clean === 'professional-services') {
      return 'services';
    }
    if (clean === 'tech_saas' || clean === 'saas' || clean === 'saas & tech companies' || clean === 'saas-and-tech-companies' || clean === 'saas & tech' || clean === 'saas-tech') {
      return 'tech_saas';
    }
    return 'construction'; // Default fallback
  }

  /**
   * Resolve user-friendly template names/IDs to strict system-level template IDs.
   */
  public static resolveTemplateId(templateId: string): string {
    const clean = templateId.trim().toLowerCase();
    if (clean === 'apex-classic' || clean === 'apex classic' || clean === 'classic construction') {
      return 'apex-classic';
    }
    if (clean === 'brick-modern' || clean === 'brick modernist') {
      return 'brick-modern';
    }
    if (clean === 'consult-pro' || clean === 'consult pro') {
      return 'consult-pro';
    }
    if (clean === 'saas-modern' || clean === 'saas minimalist' || clean === 'saas modern') {
      return 'saas-modern';
    }
    return 'apex-classic'; // Default fallback
  }

  /**
   * Create a new project instance from default industry, template, and theme.
   */
  public static createProject(
    industryId: string = 'construction',
    templateId?: string,
    themeId?: string
  ): Project {
    const resolvedIndustryId = this.resolveIndustryId(industryId);
    const resolvedTemplateId = templateId 
      ? this.resolveTemplateId(templateId) 
      : (TEMPLATES.filter(t => t.industryId === resolvedIndustryId)[0]?.id || 'apex-classic');
    
    // Dynamically find a valid theme for this industry
    const resolvedThemeId = themeId || (resolvedIndustryId === 'tech_saas' ? 'dark-violet' : 'slate');

    const config = DEFAULT_CONTENTS[resolvedIndustryId] || DEFAULT_CONTENTS['construction'];
    
    // Copy default config so mutations don't alter the library reference
    const clonedConfig = JSON.parse(JSON.stringify(config)) as WebsiteConfig;

    const defaultAssets = INDUSTRY_DEFAULT_ASSETS[resolvedIndustryId] || DEFAULT_ASSETS;

    return {
      metadata: {
        schemaVersion: this.SCHEMA_VERSION,
        builderVersion: this.BUILDER_VERSION,
        templateVersion: this.TEMPLATE_VERSION,
        industryId: resolvedIndustryId,
        templateId: resolvedTemplateId,
        themeId: resolvedThemeId,
        lastSaved: new Date().toISOString()
      },
      config: clonedConfig,
      assets: { ...defaultAssets },
      extensions: {
        seo: {
          title: clonedConfig.businessName,
          description: clonedConfig.aboutDescription || "",
          keywords: industryId === 'tech_saas' 
            ? "saas, software, automation, workflow, ai tools"
            : industryId === 'services'
              ? "consulting, business strategy, advisory"
              : "construction, builder, contractor"
        },
        analytics: {
          googleAnalyticsId: "",
          pixelId: ""
        },
        ai: {
          promptHistory: [],
          suggestedEdits: []
        },
        integrations: {
          customFormActionUrl: "",
          razorpayKeyId: "",
          razorpayBusinessName: "",
          enableRazorpayGlobal: false
        },
        customCode: {
          headerHtml: "",
          footerHtml: "",
          customCss: ""
        }
      }
    };
  }

  /**
   * Save the project to browser local storage.
   */
  public static saveProject(project: Project): void {
    try {
      const updatedProject = {
        ...project,
        metadata: {
          ...project.metadata,
          lastSaved: new Date().toISOString()
        }
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedProject));
    } catch (e) {
      console.error('Failed to save project state to local storage', e);
    }
  }

  /**
   * Save the project to browser local storage and optionally to Supabase if logged in.
   */
  public static async saveProjectAsync(
    project: Project,
    existingDbId?: string
  ): Promise<{ dbId?: string }> {
    const updatedProject = {
      ...project,
      metadata: {
        ...project.metadata,
        lastSaved: new Date().toISOString()
      }
    };

    // 1. Always backup to localStorage
    this.saveProject(updatedProject);

    // 2. Sync with Supabase if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const dbId = await saveProjectToDb(session.user.id, updatedProject, existingDbId);
        return { dbId };
      }
    } catch (e) {
      console.warn('Failed to sync project to Supabase database (offline fallback active):', e);
    }

    return { dbId: existingDbId };
  }

  /**
   * Load the active project from local storage, fallback to a default project if none exists.
   */
  public static loadProject(): Project {
    let industryParam: string | null = null;
    let templateParam: string | null = null;
    let freezeParam: string | null = null;

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        industryParam = params.get('industry');
        templateParam = params.get('template');
        freezeParam = params.get('freeze');
      } catch (e) {
        console.warn('Failed to parse URL parameters in loadProject', e);
      }
    }

    // 1. If a template parameter is specified in the URL
    if (templateParam) {
      const resolvedTemplate = this.resolveTemplateId(templateParam);

      // Check whether a saved project already exists for that template
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Project;
          if (parsed && parsed.metadata && parsed.config) {
            // If a matching project exists for this template, restore it
            if (parsed.metadata.templateId === resolvedTemplate) {
              return this.upgradeIfNeeded(parsed);
            }
          }
        }
      } catch (e) {
        console.warn('Could not parse local storage project state for matching template', e);
      }

      // If no matching project exists, create a fresh project from the template
      return this.createProject(industryParam || 'construction', resolvedTemplate);
    }

    // 2. Otherwise (no template specified in the URL), use standard localStorage restore behavior
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Project;
        if (parsed && parsed.metadata && parsed.config) {
          return this.upgradeIfNeeded(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not parse local storage project state, resetting to defaults.', e);
    }

    return this.createProject(industryParam || 'construction');
  }

  /**
   * Load the active project asynchronously.
   * If user is authenticated, pulls their saved project from Supabase first,
   * otherwise falls back to browser localStorage.
   */
  public static async loadProjectAsync(
    activeTemplateId?: string
  ): Promise<{ project: Project; dbId?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const dbProjects = await getUserProjects(session.user.id);
        
        let matchedDbProj = null;
        if (activeTemplateId) {
          matchedDbProj = dbProjects.find(p => p.template_id === activeTemplateId);
        } else {
          // Default to the most recently modified database project
          matchedDbProj = dbProjects[0];
        }

        if (matchedDbProj) {
          const parsed = matchedDbProj.config as Project;
          if (parsed && parsed.metadata && parsed.config) {
            const upgraded = this.upgradeIfNeeded(parsed);
            // Save local storage backup copy
            this.saveProject(upgraded);
            return { project: upgraded, dbId: matchedDbProj.id };
          }
        }
      }
    } catch (e) {
      console.warn('Supabase project loading failed or user is offline. Falling back to local storage...', e);
    }

    // Offline / Guest fallback to localStorage
    const localProj = this.loadProject();
    return { project: localProj };
  }

  /**
   * Safe upgrades for older projects/schema versions
   */
  private static upgradeIfNeeded(project: Project): Project {
    let upgraded = false;
    const metadata = { ...project.metadata };
    
    if (!metadata.schemaVersion) {
      metadata.schemaVersion = this.SCHEMA_VERSION;
      upgraded = true;
    }
    if (!metadata.builderVersion) {
      metadata.builderVersion = this.BUILDER_VERSION;
      upgraded = true;
    }
    if (!metadata.templateVersion) {
      metadata.templateVersion = this.TEMPLATE_VERSION;
      upgraded = true;
    }
    const activeIndustry = metadata.industryId || 'construction';
    const industryDefaults = INDUSTRY_DEFAULT_ASSETS[activeIndustry] || DEFAULT_ASSETS;

    if (!project.assets) {
      project.assets = { ...industryDefaults };
      upgraded = true;
    } else if (activeIndustry !== 'construction') {
      // If the project is using the construction fallback images, upgrade them to the industry defaults
      const constructionG1 = INDUSTRY_DEFAULT_ASSETS['construction']['asset://gallery-1'];
      if (project.assets['asset://gallery-1'] === constructionG1) {
        project.assets = { ...industryDefaults };
        upgraded = true;
      }
    }

    if (!project.extensions) {
      project.extensions = {
        seo: { title: project.config.businessName, description: "", keywords: "" },
        analytics: {},
        ai: {},
        integrations: {},
        customCode: {}
      };
      upgraded = true;
    }

    if (metadata.industryId === 'tech_saas') {
      if (metadata.templateId === 'apex-classic') {
        metadata.templateId = 'saas-modern';
        upgraded = true;
      }
      if (metadata.themeId === 'slate') {
        metadata.themeId = 'dark-violet';
        upgraded = true;
      }
    }

    if (upgraded) {
      const upgradedProject = { ...project, metadata };
      this.saveProject(upgradedProject);
      return upgradedProject;
    }
    return project;
  }

  /**
   * Export the project to a JSON Blueprint format.
   */
  public static exportProject(project: Project): string {
    const blueprint = {
      blueprintConcept: 'Lifehut Studio Project Blueprint',
      metadata: project.metadata,
      config: project.config,
      assets: project.assets,
      extensions: project.extensions
    };
    return JSON.stringify(blueprint, null, 2);
  }

  /**
   * Import a project JSON Blueprint format.
   */
  public static importProject(jsonString: string): Project {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON payload structure');
    }

    // Adapt older files that only have WebsiteConfig directly or are old formats
    if ('businessName' in parsed && 'faqs' in parsed) {
      if (typeof parsed.businessName !== 'string' || !Array.isArray(parsed.faqs)) {
        throw new Error('Malformed legacy configuration data');
      }
      // Old config directly imported
      const defaultProject = this.createProject();
      defaultProject.config = parsed as WebsiteConfig;
      this.saveProject(defaultProject);
      return defaultProject;
    }

    // Verify metadata and config presence and basic types
    if (!parsed.metadata || typeof parsed.metadata !== 'object' || !parsed.config || typeof parsed.config !== 'object') {
      throw new Error('Incompatible project template blueprint schema: missing metadata or config');
    }

    // Deep validation of metadata
    const m = parsed.metadata;
    if (typeof m.industryId !== 'string' || typeof m.templateId !== 'string' || typeof m.themeId !== 'string') {
      throw new Error('Invalid metadata properties in project blueprint');
    }

    // Deep validation of config
    const c = parsed.config;
    if (typeof c.businessName !== 'string' || typeof c.phone !== 'string' || typeof c.email !== 'string') {
      throw new Error('Invalid configuration text fields in project blueprint');
    }

    if (!Array.isArray(c.services) || !Array.isArray(c.gallery) || !Array.isArray(c.pricing) || !Array.isArray(c.faqs)) {
      throw new Error('Invalid configuration list fields (services, gallery, pricing, or faqs) in project blueprint');
    }

    // Sanitize values
    const cleanServices = c.services.map((s: any, idx: number) => {
      if (!s || typeof s !== 'object' || !s.id || typeof s.title !== 'string') {
        throw new Error(`Malformed service item at index ${idx}`);
      }
      return {
        id: String(s.id),
        title: String(s.title),
        description: String(s.description || ''),
        iconName: String(s.iconName || 'Wrench')
      };
    });

    const cleanGallery = c.gallery.map((g: any, idx: number) => {
      if (!g || typeof g !== 'object' || !g.id || typeof g.url !== 'string') {
        throw new Error(`Malformed gallery item at index ${idx}`);
      }
      return {
        id: String(g.id),
        url: String(g.url),
        title: String(g.title || '')
      };
    });

    const cleanFaqs = c.faqs.map((f: any, idx: number) => {
      if (!f || typeof f !== 'object' || !f.id || typeof f.question !== 'string') {
        throw new Error(`Malformed FAQ item at index ${idx}`);
      }
      return {
        id: String(f.id),
        question: String(f.question),
        answer: String(f.answer || '')
      };
    });

    const cleanPricing = c.pricing.map((p: any, idx: number) => {
      if (!p || typeof p !== 'object' || !p.id || typeof p.name !== 'string') {
        throw new Error(`Malformed pricing plan at index ${idx}`);
      }
      return {
        id: String(p.id),
        name: String(p.name),
        price: String(p.price || ''),
        period: String(p.period || ''),
        features: Array.isArray(p.features) ? p.features.map((feat: any) => String(feat)) : [],
        popular: Boolean(p.popular),
        razorpayAmount: p.razorpayAmount !== undefined ? Number(p.razorpayAmount) : undefined,
        enableRazorpay: p.enableRazorpay !== undefined ? Boolean(p.enableRazorpay) : undefined
      };
    });

    const project: Project = {
      metadata: {
        schemaVersion: String(m.schemaVersion || this.SCHEMA_VERSION),
        builderVersion: String(m.builderVersion || this.BUILDER_VERSION),
        templateVersion: String(m.templateVersion || this.TEMPLATE_VERSION),
        industryId: String(m.industryId || 'construction'),
        templateId: String(m.templateId || 'apex-classic'),
        themeId: String(m.themeId || 'slate'),
        lastSaved: new Date().toISOString()
      },
      config: {
        ...c,
        services: cleanServices,
        gallery: cleanGallery,
        pricing: cleanPricing,
        faqs: cleanFaqs,
        businessName: String(c.businessName),
        phone: String(c.phone),
        email: String(c.email),
        logoText: String(c.logoText || ''),
        logoIcon: String(c.logoIcon || 'Wrench'),
        logoFileUrl: c.logoFileUrl ? String(c.logoFileUrl) : undefined,
        heroBadge: String(c.heroBadge || ''),
        heroHeadline: String(c.heroHeadline || ''),
        heroSubheadline: String(c.heroSubheadline || ''),
        heroPrimaryBtn: String(c.heroPrimaryBtn || ''),
        heroSecondaryBtn: String(c.heroSecondaryBtn || ''),
        aboutTitle: String(c.aboutTitle || ''),
        aboutDescription: String(c.aboutDescription || ''),
        aboutStatLabel1: String(c.aboutStatLabel1 || ''),
        aboutStatVal1: String(c.aboutStatVal1 || ''),
        aboutStatLabel2: String(c.aboutStatLabel2 || ''),
        aboutStatVal2: String(c.aboutStatVal2 || ''),
        contactAddress: String(c.contactAddress || ''),
        contactHours: String(c.contactHours || '')
      },
      assets: parsed.assets || { ...(INDUSTRY_DEFAULT_ASSETS[parsed.metadata?.industryId || 'construction'] || DEFAULT_ASSETS) },
      extensions: parsed.extensions || {}
    };

    const upgradedProject = this.upgradeIfNeeded(project);
    this.saveProject(upgradedProject);
    return upgradedProject;
  }
}
