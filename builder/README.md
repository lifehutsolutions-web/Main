# Lifehut Studio Builder

A highly customizable, high-performance, frontend-only website builder and visual configuration studio. This builder allows clients to select their industry, pick from premade layouts, edit content (hero sections, features, galleries, FAQs, forms), and instantly preview or download the compiled static website.

## Core Features
- **Instant Real-Time Previews**: Powered by a highly optimized, client-side, iframe-isolated render engine.
- **Multi-Industry & Layout Library**: Modular designs for Construction, Services, and Tech/SaaS.
- **Client-Side Asset Upgrading**: Dynamic fallback to high-resolution, royalty-free images matching the chosen industry context.
- **Zero-AI Dependency**: Blazing-fast static compilation with no external API calls, ensuring high availability and zero latency.
- **Configuration Lock (Freeze Mode)**: Lock specific templates, industries, or views via URL query parameters, perfect for e-commerce checkouts.

---

## Dynamic Lock & Integration (Freeze Mode)

You can embed or link to the builder from your e-commerce platform and pass URL parameters to restrict or configure the editor interface.

### Supported Parameters
- `industry`: Pre-selects the industry (e.g., `construction`, `services`, `tech_saas`).
- `template`: Pre-selects the starting template ID.
- `freeze=true`: Disables and hides the industry/template selector controls, freezing the client into a specific design structure while allowing them to customize the text and images.

**Example Integration URL:**
```
https://your-studio-domain.com/?industry=services&template=services_standard&freeze=true
```

---

## Development & Deployment

### Quick Start
Install dependencies and run the developer server locally:
```bash
npm install
npm run dev
```

### Build & Compilation
Build the production-ready, highly optimized, static bundle:
```bash
npm run build
```
The compiled files will output to the `/dist` directory. These can be hosted on any static hosting provider (e.g., GitHub Pages, Vercel, Netlify, Cloudflare Pages, S3).

### Directory Map
- `/src/library/TemplateLibrary.ts`: The central schema-definition file containing all default content, colors, and industry layouts.
- `/src/library/RenderEngine.ts`: The core rendering pipeline that turns JSON configurations into production-grade HTML/CSS.
- `/src/library/ProjectManager.ts`: Handles local storage, active project configurations, state-migrations, and auto-upgrades.
- `/src/components/ConfigPanel.tsx`: The sidebar containing tabs for customizing copy, colors, gallery images, and section structures.
- `/src/components/LivePreview.tsx` & `/src/components/FullPreviewModal.tsx`: Viewport frames utilizing the iframe isolator to securely display the live rendered static output.
