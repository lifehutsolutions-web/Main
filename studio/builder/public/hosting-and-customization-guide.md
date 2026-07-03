# Hosting, Freezing & Customization Guide for Studio App

This comprehensive guide explains how to host your Website Studio application, dynamically "freeze" layout and industry selections for your customers, and expand templates in the future without relying on an AI assistant.

---

## 1. Hosting Your Application
Since this is a client-side React + TypeScript application built using Vite, you can compile it into a set of fast, static HTML/JS/CSS files and host it almost anywhere for free or low cost.

### Option A: GitHub Pages (Recommended for GitHub Users)
1. **Push your code to GitHub**: Put your repository on GitHub.
2. **Build your site**:
   - Install the GitHub Pages deploy utility in your project:
     ```bash
     npm install -D gh-pages
     ```
   - Add these scripts to your `package.json`:
     ```json
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
     ```
3. **Deploy**: Run `npm run deploy`. Your built site will be pushed to a `gh-pages` branch and hosted automatically at `https://<your-username>.github.io/<your-repo-name>/`.

### Option B: Vercel or Netlify (Simplest, Automatic Deploys)
1. Connect your GitHub repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Set the build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Click **Deploy**. Every time you push a change to your GitHub main branch, the site will automatically rebuild and update!

---

## 2. Freezing Industry, Template, & Layout dynamically
To allow your main e-commerce website to dictate the template and lock certain configuration panels (so customers don't accidentally break or change their industry, template, or overall layout), you can read options from **URL Query Parameters** (e.g., `https://your-studio.com/?industry=tech_saas&template=saas_dark&freeze=true`).

Here is exactly how to implement this in the React codebase:

### Implementation Steps
We can modify the App initialization in `src/App.tsx` or `src/components/ConfigPanel.tsx` to read the URL parameter and hide the matching controls.

#### Step 1: Detect "Freeze" or initial parameters in `src/App.tsx`
```typescript
// Add this helper function at the top of src/App.tsx
const getURLParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    industry: params.get('industry'),   // e.g., 'tech_saas'
    template: params.get('template'),   // e.g., 'saas_dark'
    freeze: params.get('freeze') === 'true' // e.g., true (disables selection dropdowns)
  };
};
```

#### Step 2: Lock the UI in `src/components/ConfigPanel.tsx`
In `ConfigPanel.tsx`, find the JSX elements for **Industry Selection** and **Template Selection**, and apply the following conditional disabled/hidden styles:

```tsx
const { freeze, industry } = getURLParams();

// In the rendering of Industry dropdown:
{freeze ? (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 font-medium">
    Selected Industry: <span className="font-bold text-indigo-600 capitalize">{project.metadata.industryId}</span>
  </div>
) : (
  <select 
    value={project.metadata.industryId}
    onChange={(e) => changeIndustry(e.target.value)}
    className="w-full border rounded-lg px-3 py-2 ..."
  >
    {/* options */}
  </select>
)}
```

By adding a `freeze=true` query parameter, you keep the editor controls for text, custom logos, and colors, but completely remove or disable the template/industry selection controls!

---

## 3. Creating More Templates in the Future
You **do not** need an AI assistant to add templates. The library of templates is entirely defined in code inside `/src/library/TemplateLibrary.ts`. 

You can add templates simply by opening that file and appending new JSON objects to the array.

### How to add a custom template in `src/library/TemplateLibrary.ts`:
Find the `TEMPLATES` array in `TemplateLibrary.ts`. It looks like this:

```typescript
export const TEMPLATES: TemplateConfig[] = [
  {
    id: "construction_standard",
    name: "Classic Construction",
    industryId: "construction",
    // ... layout, hero, features configs ...
  },
  {
    id: "saas_modern",
    name: "SaaS Launchpad",
    industryId: "tech_saas",
    // ... and so on ...
  }
];
```

#### Steps to add a template:
1. Copy an existing template object (e.g., `saas_modern`).
2. Paste it as a new element at the bottom of the `TEMPLATES` array.
3. Update the fields:
   - `id`: Choose a unique string (e.g., `agency_minimalist`).
   - `name`: What your customer sees in the template picker (e.g., "Minimal Creative Agency").
   - `industryId`: Map it to your desired industry category (e.g., `services`, `tech_saas`, or a new industry ID).
   - `hero` / `features` / `about`: Adjust the default titles, descriptions, and mock text to fit the new layout theme.

---

## 4. Modifying Code Anytime After Hosting
Can you modify your app after it's hosted? **Yes, absolutely, at any time!**

### The Workflow:
1. Open your project folder locally on your computer in an editor (like VS Code).
2. Edit any code file (such as CSS, React components, images, or template configurations).
3. Test your changes locally by running:
   ```bash
   npm run dev
   ```
4. Once you are happy with the changes, push them to your GitHub repository:
   ```bash
   git add .
   git commit -m "Added a new template & updated gallery photos"
   git push origin main
   ```
5. If you are using Vercel, Netlify, or AWS, your hosted live website will pick up the push and **redeploy automatically** within 1–2 minutes! Your customers will instantly see the new templates, fixes, and updates.

---

*This guide was generated specifically for your Website Studio Platform.*
