export interface ProductDetails {
  id: string;
  name: string;
  priceINR: number;
  description: string;
}

export async function fetchProductDetails(templateId: string): Promise<ProductDetails> {
  try {
    const res = await fetch('/products.json');
    if (!res.ok) throw new Error('Failed to fetch products');
    const products = await res.json();
    if (products[templateId]) {
      return products[templateId];
    }
  } catch (e) {
    console.warn('Could not fetch products.json, using default pricing', e);
  }
  
  // Default fallback pricing if file fails to load
  const defaults: Record<string, ProductDetails> = {
    'apex-classic': { id: 'apex-classic', name: 'Apex Classic Template', priceINR: 499, description: 'Lifetime access to Apex Classic template' },
    'brick-modern': { id: 'brick-modern', name: 'Brick Modernist Template', priceINR: 499, description: 'Lifetime access to Brick Modernist template' },
    'consult-pro': { id: 'consult-pro', name: 'Consult Pro Template', priceINR: 599, description: 'Lifetime access to Consult Pro template' },
    'saas-modern': { id: 'saas-modern', name: 'SaaS Minimalist Template', priceINR: 699, description: 'Lifetime access to SaaS Minimalist template' },
  };
  return defaults[templateId] || { id: templateId, name: `${templateId} Template`, priceINR: 499, description: 'Lifetime access' };
}
