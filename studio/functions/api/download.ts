async function verifyHmacSignature(secret: string, data: string, signature: string): Promise<boolean> {
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
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === signature;
}

export async function onRequestGet(context: { request: Request; env: any }) {
  const { request, env } = context;

  const JWT_SECRET = env.JWT_SECRET || "lifehut_studio_secret_key_123456";
  const GITHUB_TOKEN = env.GITHUB_TOKEN || "";
  const GITHUB_REPO = env.GITHUB_REPO || "";
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Unauthorized. Token is missing.", { status: 401 });
    }

    // 1. Decode token
    let decodedString = "";
    try {
      decodedString = atob(token);
    } catch {
      return new Response("Invalid download link format.", { status: 400 });
    }

    const parts = decodedString.split(":");
    if (parts.length !== 4) {
      return new Response("Invalid download link tokens.", { status: 400 });
    }

    const [productId, filename, expiryStr, signature] = parts;
    const expiry = parseInt(expiryStr, 10);

    // 2. Check expiration
    if (Date.now() > expiry) {
      return new Response("Your secure download link has expired (links are valid for 24h).", { status: 410 });
    }

    // 3. Verify signature
    const payloadString = `${productId}:${filename}:${expiryStr}`;
    const isValid = await verifyHmacSignature(JWT_SECRET, payloadString, signature);
    if (!isValid) {
      return new Response("Unauthorized download request signature.", { status: 401 });
    }

    // 4. Fetch product metadata to check storage type (Supabase or GitHub)
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
      return new Response("Product template not found in database.", { status: 404 });
    }

    const assetId = product.githubAssetId;
    const assetName = filename || product.githubAssetName || "template.zip";

    // 5. Serve/Redirect based on storage type
    if (assetId && typeof assetId === "string" && !assetId.startsWith("local") && isNaN(Number(assetId))) {
      // This is a Supabase Storage path!
      const downloadUrl = `${SUPABASE_URL}/storage/v1/object/public/templates/${assetId}`;
      return Response.redirect(downloadUrl, 302);
    } else if (product.githubAssetId && GITHUB_TOKEN && GITHUB_REPO && product.githubAssetId !== "local") {
      // GitHub Releases path
      const assetUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/assets/${product.githubAssetId}`;
      const response = await fetch(assetUrl, {
        headers: {
          "Authorization": `token ${GITHUB_TOKEN}`,
          "Accept": "application/octet-stream",
          "User-Agent": "Cloudflare-Pages-Worker"
        }
      });

      if (!response.ok) {
        return new Response("Secure download stream from storage provider failed.", { status: response.status });
      }

      const fileHeaders = new Headers();
      fileHeaders.set("Content-Disposition", `attachment; filename="${assetName}"`);
      fileHeaders.set("Content-Type", "application/zip");

      return new Response(response.body, {
        status: 200,
        headers: fileHeaders
      });
    } else {
      return new Response("Template file asset was not found or is misconfigured.", { status: 404 });
    }

  } catch (error: any) {
    return new Response(`Download error: ${error.message}`, { status: 500 });
  }
}
