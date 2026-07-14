async function generateHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  const hashArray = Array.from(new Uint8Array(mac));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context: { request: Request; env: any }) {
  const { request, env } = context;

  const JWT_SECRET = env.JWT_SECRET || "lifehut_studio_secret_key_123456";
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";

  try {
    const { productId, email } = await request.json();

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. Fetch product from Supabase to verify it exists and is indeed free
    let product: any = null;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const products = await res.json();
        product = products[0];
      }
    }

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const priceNum = parseFloat(product.price);
    if (!isNaN(priceNum) && priceNum > 0) {
      return new Response(JSON.stringify({ error: "Product is paid. Use payment flow." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate secure temporary download token valid for 24 hours
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payloadString = `${product.id}:${product.githubAssetName || ''}:${expiry}`;
    const tokenSig = await generateHmacSignature(JWT_SECRET, payloadString);
    const downloadToken = btoa(`${payloadString}:${tokenSig}`);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: `/api/download?token=${downloadToken}`,
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
