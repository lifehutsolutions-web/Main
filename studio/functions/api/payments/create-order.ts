export async function onRequestPost(context: { request: Request; env: any }) {
  const { request, env } = context;

  const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID || "";
  const RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET || "";
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";

  try {
    const { productId } = await request.json();

    // 1. Fetch product from Supabase using native fetch (zero dependencies)
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
    if (isNaN(priceNum) || priceNum <= 0) {
      return new Response(JSON.stringify({ error: "Product is free. Use direct claim." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const amountPaise = priceNum * 100;

    // 2. Create Razorpay order
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      // Return simulated order
      return new Response(JSON.stringify({
        order: {
          id: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
          amount: amountPaise,
          currency: "INR",
          receipt: product.id,
          isMock: true,
        },
        keyId: "rzp_test_dummyKeyId"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const authString = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: product.id,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: `Razorpay API Error: ${text}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const order = await response.json();
    return new Response(JSON.stringify({ order, keyId: RAZORPAY_KEY_ID }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
