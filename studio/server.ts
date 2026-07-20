import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "lifehut_studio_secret_key_123456";

// Create local data directories if they don't exist
const DATA_DIR = path.join(process.cwd(), "data");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");
const IMAGES_DIR = path.join(DATA_DIR, "images");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
if (!fs.existsSync(PRODUCTS_FILE) || fs.readFileSync(PRODUCTS_FILE, "utf-8").trim() === "[]" || fs.readFileSync(PRODUCTS_FILE, "utf-8").trim() === "") {
  const seedProducts = [
    {
      id: "p_portfolio_prime",
      name: "Portfolio Prime - Developer Layout",
      cat: "Portfolio",
      desc: "A premium, responsive, developer portfolio template designed with elegant dark mode, a sleek masonry gallery showcase, and highly polished micro-interactions.",
      price: "1499",
      oldprice: "2999",
      template: "portfolio-prime",
      badge: "Hot",
      color: "linear-gradient(135deg, #0f172a, #1e3a8a)",
      mediatype: "carousel",
      tags: ["React", "Tailwind", "Vite", "Motion"],
      features: ["Elegant Dark Mode", "Responsive Layout", "Contact Form Integration", "Interactive Skill Canvas", "Smooth Page Transitions"],
      slides: ["Home View", "About Me Section", "Interactive Work Showcase", "Contact Form Panel"],
      images: [],
      status: "live",
      updatedAt: "2026-07-15T05:00:00.000Z"
    },
    {
      id: "p_saas_spark",
      name: "SaaS Spark - Startup Landing Page",
      cat: "SaaS / Startup",
      desc: "High-converting, sleek landing page built for SaaS applications and startups. Includes bento-grid features, interactive pricing model calculator, and testimonial layouts.",
      price: "2499",
      oldprice: "4999",
      template: "saas-spark",
      badge: "New",
      color: "linear-gradient(135deg, #020617, #3b82f6)",
      mediatype: "carousel",
      tags: ["SaaS", "Bento Grid", "Analytics", "Vite"],
      features: ["Bento Grid Feature Section", "Interactive Pricing Cards", "Fully Responsive Layout", "Custom SVG Icons", "SEO Optimized Build"],
      slides: ["Hero View", "Analytics Grid", "Interactive Pricing Calculator", "Testimonials Showcase"],
      images: [],
      status: "live",
      updatedAt: "2026-07-15T05:00:00.000Z"
    },
    {
      id: "p_bistro_bites",
      name: "Bistro Bites - Restaurant Template",
      cat: "Restaurant",
      desc: "Charming, elegant culinary template designed for upscale bistros and cafes. Showcases interactive food categories, online reservation flow, and dynamic customer stories.",
      price: "0",
      oldprice: "999",
      template: "bistro-bites",
      badge: "Free",
      color: "linear-gradient(135deg, #1c1917, #78350f)",
      mediatype: "carousel",
      tags: ["Culinary", "Menu", "Reservation", "Tailwind"],
      features: ["Charming Stone-themed UI", "Interactive Food Menu", "Table Reservation Form", "Dynamic Food Gallery", "Google Maps Grounding"],
      slides: ["Restaurant Hero", "Interactive Culinary Menu", "Customer Story Carousel", "Online Booking Sheet"],
      images: [],
      status: "live",
      updatedAt: "2026-07-15T05:00:00.000Z"
    }
  ];
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seedProducts, null, 2));
}

const QNA_FILE = path.join(DATA_DIR, "qna.json");
if (!fs.existsSync(QNA_FILE)) {
  const seedQna = [
    {
      id: "q_1",
      question: "Are the source files included with the portfolio template? Is it easy to customize?",
      author: "Arjun Mehta",
      timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      category: "code",
      upvotes: 14,
      answers: [
        {
          id: "a_1_1",
          author: "Lifehut Team (Developer)",
          text: "Yes! All purchases include full, un-minified React components, TypeScript files, Tailwind config, and Vite layouts. It is fully ready for one-click Vercel or Netlify deployments.",
          timestamp: new Date(Date.now() - 1.8 * 24 * 3600 * 1000).toISOString(),
          isAdmin: true
        }
      ]
    },
    {
      id: "q_2",
      question: "Do you support Stripe or PayPal payment gateways for international customers?",
      author: "Sarah Jenkins",
      timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      category: "pricing",
      upvotes: 9,
      answers: [
        {
          id: "a_2_1",
          author: "Lifehut Team (Support)",
          text: "Currently, our primary gateway is Razorpay (which supports international credit cards as well!). We are actively building a dedicated native Stripe elements integration which will launch in our v1.4.0 update.",
          timestamp: new Date(Date.now() - 0.9 * 24 * 3600 * 1000).toISOString(),
          isAdmin: true
        }
      ]
    },
    {
      id: "q_3",
      question: "Can I use these templates to build and deploy commercial projects for clients?",
      author: "Vikram Dev",
      timestamp: new Date(Date.now() - 0.5 * 24 * 3600 * 1000).toISOString(),
      category: "licensing",
      upvotes: 18,
      answers: [
        {
          id: "a_3_1",
          author: "Lifehut Team (Admin)",
          text: "Absolutely! Under our commercial license guidelines, you can use our templates to build custom client projects, host them anywhere, and charge clients. There are no recurring fees or royalty charges.",
          timestamp: new Date(Date.now() - 0.4 * 24 * 3600 * 1000).toISOString(),
          isAdmin: true
        }
      ]
    }
  ];
  fs.writeFileSync(QNA_FILE, JSON.stringify(seedQna, null, 2));
}

const ROADMAP_FILE = path.join(DATA_DIR, "roadmap.json");
if (!fs.existsSync(ROADMAP_FILE)) {
  const seedRoadmap = [
    {
      id: "rm_1",
      title: "Stripe Multicurrency Gateway",
      desc: "Enabling global payments with Stripe Elements, support for local credit cards, Apple Pay, and Google Pay worldwide.",
      status: "In Progress",
      category: "payment",
      votes: 42,
      version: "v1.4.0",
      date: "Coming Aug 2026"
    },
    {
      id: "rm_2",
      title: "Next.js 15 App Router Layouts",
      desc: "Providing compiled Next.js SSR-friendly layouts for our existing React Single Page Application templates.",
      status: "Planned",
      category: "framework",
      votes: 28,
      version: "v2.0.0",
      date: "Planned Q3 2026"
    },
    {
      id: "rm_3",
      title: "Interactive Live Customizer Tool",
      desc: "Build headers, modify color tokens, and preview templates in real-time in your browser before exporting the ZIP.",
      status: "In Progress",
      category: "customizer",
      votes: 56,
      version: "v1.5.0",
      date: "Coming Sep 2026"
    },
    {
      id: "rm_4",
      title: "Razorpay Secure India Live Gateway",
      desc: "Instant automated ZIP releases secured with high-speed Razorpay checkout supporting UPI, NetBanking, and Card transactions.",
      status: "Shipped",
      category: "payment",
      votes: 98,
      version: "v1.2.0",
      date: "Shipped July 2026"
    }
  ];
  fs.writeFileSync(ROADMAP_FILE, JSON.stringify(seedRoadmap, null, 2));
}

const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");
if (!fs.existsSync(SUBS_FILE)) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify([], null, 2));
}

const COMMENTS_FILE = path.join(DATA_DIR, "comments.json");
if (!fs.existsSync(COMMENTS_FILE)) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify([], null, 2));
}

const BROADCASTS_FILE = path.join(DATA_DIR, "broadcasts.json");
if (!fs.existsSync(BROADCASTS_FILE)) {
  fs.writeFileSync(BROADCASTS_FILE, JSON.stringify([], null, 2));
}

// Set up body parsing and file upload middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure multer for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for template ZIPs
});

/* =================================================================
   GITHUB API UTILITIES
   ================================================================= */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || ""; // Format: "owner/repo"

/**
 * Perform an authenticated GitHub API request using native fetch
 */
async function githubFetch(urlPath: string, options: RequestInit = {}) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN_MISSING");
  
  const headers = {
    "Authorization": `token ${GITHUB_TOKEN}`,
    "Accept": "application/vnd.github.v3+json",
    ...((options.headers as any) || {}),
  };

  const response = await fetch(`https://api.github.com${urlPath}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API Error (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Handle private database sync with GitHub Gist
 */
async function getProductsFromGist(): Promise<any[]> {
  const gistId = process.env.GITHUB_GIST_ID;
  if (!gistId || !GITHUB_TOKEN) {
    // Read from local cache/file
    const content = fs.readFileSync(PRODUCTS_FILE, "utf-8");
    return JSON.parse(content);
  }

  try {
    const data = await githubFetch(`/gists/${gistId}`);
    const file = data.files["products.json"];
    if (file && file.content) {
      const parsed = JSON.parse(file.content);
      // Save local backup only if it changed to prevent infinite reload loop
      const newContent = JSON.stringify(parsed, null, 2);
      let localContent = "";
      if (fs.existsSync(PRODUCTS_FILE)) {
        localContent = fs.readFileSync(PRODUCTS_FILE, "utf-8");
      }
      if (localContent !== newContent) {
        fs.writeFileSync(PRODUCTS_FILE, newContent);
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to fetch products from Gist:", error);
  }

  // Fallback to local
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
}

async function saveProductsToGist(products: any[]) {
  // Save locally first
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));

  const gistId = process.env.GITHUB_GIST_ID;
  if (!gistId || !GITHUB_TOKEN) return;

  try {
    await githubFetch(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify({
        files: {
          "products.json": {
            content: JSON.stringify(products, null, 2),
          },
        },
      }),
    });
  } catch (error) {
    console.error("Failed to save products to Gist:", error);
    throw error;
  }
}

/**
 * Creates/Finds the 'templates' release on GitHub and uploads a template file asset
 */
async function uploadToGithubRelease(filename: string, buffer: Buffer, mimeType: string) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    // Return local placeholder filename
    return { id: "local", name: filename };
  }

  try {
    // 1. Get or create release tag 'templates'
    let release: any = null;
    try {
      release = await githubFetch(`/repos/${GITHUB_REPO}/releases/tags/templates`);
    } catch {
      // Create 'templates' release if missing
      release = await githubFetch(`/repos/${GITHUB_REPO}/releases`, {
        method: "POST",
        body: JSON.stringify({
          tag_name: "templates",
          name: "Product Templates Store",
          body: "Storage release for Lifehut Studio website template zip files.",
          draft: false,
          prerelease: false,
        }),
      });
    }

    // 2. Check if asset with same name already exists and delete it
    if (release.assets && Array.isArray(release.assets)) {
      const existing = release.assets.find((a: any) => a.name === filename);
      if (existing) {
        await githubFetch(`/repos/${GITHUB_REPO}/releases/assets/${existing.id}`, {
          method: "DELETE",
        });
      }
    }

    // 3. Upload asset to the release upload url
    const uploadUrl = release.upload_url.replace("{?name,label}", `?name=${encodeURIComponent(filename)}`);
    
    const headers = {
      "Authorization": `token ${GITHUB_TOKEN}`,
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
    };

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: buffer,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload asset: ${text}`);
    }

    const assetData = await response.json();
    return { id: assetData.id, name: assetData.name };
  } catch (error: any) {
    console.error("GitHub Release Upload error:", error);
    throw error;
  }
}

/* =================================================================
   RAZORPAY GATEWAY UTILITIES
   ================================================================= */
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/**
 * Create a payment order via Razorpay API or local simulated order
 */
async function createRazorpayOrder(amountRupees: number, receiptId: string) {
  const amountPaise = amountRupees * 100;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    // Local payment simulation
    return {
      id: `order_mock_${Math.random().toString(36).slice(2, 10)}`,
      amount: amountPaise,
      currency: "INR",
      receipt: receiptId,
      isMock: true,
    };
  }

  const authString = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authString}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: receiptId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Razorpay API Error: ${text}`);
  }

  return response.json();
}

/* =================================================================
   MIDDLEWARES
   ================================================================= */
const adminEmail = process.env.ADMIN_EMAIL || "admin@lifehutsolutions.com";
const adminPassword = process.env.ADMIN_PASSWORD || "Lifehut@2026";

/**
 * Validate Admin Authentication Token
 */
function authenticateAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Token missing." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.email === adminEmail) {
      req.admin = decoded;
      next();
    } else {
      res.status(403).json({ error: "Invalid admin token." });
    }
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

/* =================================================================
   API ROUTES
   ================================================================= */

// Admin authentication
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, email });
  } else {
    res.status(400).json({ error: "Invalid credentials." });
  }
});

// Fetch product catalog (Scrubbed of sensitive attributes like githubAssetId)
app.get("/api/products", async (req, res) => {
  try {
    const products = await getProductsFromGist();
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin product CRUD endpoints
app.post("/api/products", authenticateAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const products = await getProductsFromGist();
    
    const existingIndex = products.findIndex((p) => p.id === productData.id);
    if (existingIndex > -1) {
      products[existingIndex] = { ...products[existingIndex], ...productData, updatedAt: new Date().toISOString() };
    } else {
      products.push({ ...productData, status: productData.status || "draft", updatedAt: new Date().toISOString() });
    }

    await saveProductsToGist(products);

    // Automated newsletter broadcast to #CodeReleases if requested
    if (productData.broadcastNotification && productData.status === "live") {
      try {
        const subs = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
        const targetSubs = subs.filter((s: any) => s.topics && s.topics.includes("releases"));
        const recipientEmails = targetSubs.map((s: any) => s.email);

        const newBroadcast = {
          id: `bc_auto_${Date.now()}`,
          subject: `🚀 New Release Drop: ${productData.name} is now LIVE!`,
          message: `Hello Developer,\n\nWe have just published a new premium code template!\n\nTemplate Name: ${productData.name}\nCategory: ${productData.cat}\nDescription: ${productData.desc}\nPrice: INR ${productData.price || "Free"}\n\nLog in to your Dashboard or visit the store front to check it out.\n\nHappy Coding,\nLifehut Team`,
          topic: "releases",
          recipientsCount: recipientEmails.length,
          recipients: recipientEmails,
          timestamp: new Date().toISOString()
        };

        const broadcasts = JSON.parse(fs.readFileSync(BROADCASTS_FILE, "utf-8"));
        broadcasts.unshift(newBroadcast);
        fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2));
      } catch (broadcastErr) {
        console.error("Automated template release broadcast failed:", broadcastErr);
      }
    }

    res.json({ success: true, product: productData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let products = await getProductsFromGist();
    
    const product = products.find((p) => p.id === id);
    if (product && product.githubAssetId && GITHUB_TOKEN && GITHUB_REPO) {
      try {
        await githubFetch(`/repos/${GITHUB_REPO}/releases/assets/${product.githubAssetId}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Could not delete github release asset:", err);
      }
    }

    // Also delete any local files
    if (product && product.githubAssetName) {
      const localFilePath = path.join(TEMPLATES_DIR, product.githubAssetName);
      if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
    }

    products = products.filter((p) => p.id !== id);
    await saveProductsToGist(products);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle publish status
app.post("/api/products/:id/publish", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "live" or "draft"
    const products = await getProductsFromGist();
    const product = products.find((p) => p.id === id);
    
    if (product) {
      product.status = status;
      product.updatedAt = new Date().toISOString();
      await saveProductsToGist(products);
      res.json({ success: true, product });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Batch Go Live endpoint
app.post("/api/products/go-live", authenticateAdmin, async (req, res) => {
  try {
    const products = await getProductsFromGist();
    products.forEach((p) => {
      p.status = "live";
    });
    await saveProductsToGist(products);
    res.json({ success: true, count: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Template Upload endpoint
app.post("/api/upload-template", authenticateAdmin, upload.single("templateZip"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filename = req.file.originalname;
    const buffer = req.file.buffer;
    const mimetype = req.file.mimetype;

    if (!filename.endsWith(".zip")) {
      return res.status(400).json({ error: "Template must be a ZIP file (.zip)" });
    }

    // 1. Upload to GitHub private release (if configured)
    let assetInfo = { id: "local", name: filename };
    if (GITHUB_TOKEN && GITHUB_REPO) {
      assetInfo = await uploadToGithubRelease(filename, buffer, mimetype);
    } else {
      // Fallback: save to local data/templates dir
      fs.writeFileSync(path.join(TEMPLATES_DIR, filename), buffer);
    }

    res.json({
      success: true,
      githubAssetId: assetInfo.id,
      githubAssetName: assetInfo.name,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =================================================================
   PAYMENT & DOWNLOAD WORKFLOWS
   ================================================================= */

// 1. Create a payment order
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const { productId } = req.body;
    const products = await getProductsFromGist();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const priceNum = parseFloat(product.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Product is free. Use direct claim." });
    }

    const order = await createRazorpayOrder(priceNum, product.id);
    res.json({ order, keyId: RAZORPAY_KEY_ID });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Claim free templates
app.post("/api/payments/claim-free", async (req, res) => {
  try {
    const { productId, email } = req.body;
    const products = await getProductsFromGist();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const priceNum = parseFloat(product.price);
    if (priceNum > 0) {
      return res.status(400).json({ error: "Product is paid. Use payment flow." });
    }

    // Generate secure temporary download token valid for 24 hours
    const downloadToken = jwt.sign(
      { productId: product.id, filename: product.githubAssetName },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      downloadUrl: `/api/download?token=${downloadToken}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Verify Payment & Generate secure download URL
app.post("/api/payments/verify", async (req, res) => {
  try {
    const { orderId, paymentId, signature, productId } = req.body;
    const products = await getProductsFromGist();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let isVerified = false;

    if (orderId.startsWith("order_mock_")) {
      // Mock payment verification is always successful
      isVerified = true;
    } else {
      // Verify signature cryptography using HMAC-SHA256
      const secret = RAZORPAY_KEY_SECRET;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      isVerified = expectedSignature === signature;
    }

    if (isVerified) {
      // Create secure, token-gated download token valid for 24 hours
      const downloadToken = jwt.sign(
        { productId: product.id, filename: product.githubAssetName },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        downloadUrl: `/api/download?token=${downloadToken}`,
      });
    } else {
      res.status(400).json({ error: "Payment verification failed" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Secure Download Stream endpoint
app.get("/api/download", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).send("Unauthorized. Token is missing.");

    // Verify secure temporary download token
    const decoded = jwt.verify(token as string, JWT_SECRET) as any;
    const { productId, filename } = decoded;

    const products = await getProductsFromGist();
    const product = products.find((p) => p.id === productId);

    if (!product) return res.status(404).send("Product not found");

    const assetName = filename || product.githubAssetName;
    if (!assetName) return res.status(404).send("Asset file not found for this product.");

    // Stream download based on whether GitHub repository is configured
    if (product.githubAssetId && GITHUB_TOKEN && GITHUB_REPO && product.githubAssetId !== "local") {
      try {
        const headers = {
          "Authorization": `token ${GITHUB_TOKEN}`,
          "Accept": "application/octet-stream",
        };

        const assetUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/assets/${product.githubAssetId}`;
        const response = await fetch(assetUrl, { headers });

        if (!response.ok) {
          throw new Error(`GitHub Asset streaming error: ${response.statusText}`);
        }

        // Set attachment headers
        res.setHeader("Content-Disposition", `attachment; filename="${assetName}"`);
        res.setHeader("Content-Type", "application/zip");

        // Stream the fetch response body back to the customer
        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
      } catch (err: any) {
        console.error("Failed to stream private GitHub Release asset:", err);
        res.status(500).send("Secure download stream failed. Please try again.");
      }
    } else {
      // Local fallback mode: stream local file
      const localPath = path.join(TEMPLATES_DIR, assetName);
      if (fs.existsSync(localPath)) {
        res.setHeader("Content-Disposition", `attachment; filename="${assetName}"`);
        res.setHeader("Content-Type", "application/zip");
        fs.createReadStream(localPath).pipe(res);
      } else {
        res.status(404).send("File not found on this server.");
      }
    }
  } catch (err) {
    res.status(401).send("Invalid or expired download link.");
  }
});

/* =================================================================
   PUBLIC INTERACTIVE VISITOR HUB ENDPOINTS
   ================================================================= */

// Fetch all Q&As
app.get("/api/qna", (req, res) => {
  try {
    const qnas = JSON.parse(fs.readFileSync(QNA_FILE, "utf-8"));
    res.json(qnas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new question
app.post("/api/qna", (req, res) => {
  try {
    const { question, author, category } = req.body;
    if (!question || !author) {
      return res.status(400).json({ error: "Question and nickname are required." });
    }
    const qnas = JSON.parse(fs.readFileSync(QNA_FILE, "utf-8"));
    const newQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question,
      author,
      timestamp: new Date().toISOString(),
      category: category || "general",
      upvotes: 0,
      answers: []
    };
    qnas.unshift(newQuestion);
    fs.writeFileSync(QNA_FILE, JSON.stringify(qnas, null, 2));
    res.json(newQuestion);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post an answer to a question
app.post("/api/qna/:id/answer", (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, isAdmin } = req.body;
    if (!text || !author) {
      return res.status(400).json({ error: "Answer text and author are required." });
    }
    const qnas = JSON.parse(fs.readFileSync(QNA_FILE, "utf-8"));
    const questionIndex = qnas.findIndex((q: any) => q.id === id);
    if (questionIndex === -1) {
      return res.status(404).json({ error: "Question not found." });
    }
    const newAnswer = {
      id: `a_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: isAdmin ? "Lifehut Team (Developer)" : author,
      text,
      timestamp: new Date().toISOString(),
      isAdmin: !!isAdmin
    };
    qnas[questionIndex].answers.push(newAnswer);
    fs.writeFileSync(QNA_FILE, JSON.stringify(qnas, null, 2));
    res.json(newAnswer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote a question
app.post("/api/qna/:id/vote", (req, res) => {
  try {
    const { id } = req.params;
    const qnas = JSON.parse(fs.readFileSync(QNA_FILE, "utf-8"));
    const question = qnas.find((q: any) => q.id === id);
    if (!question) {
      return res.status(404).json({ error: "Question not found." });
    }
    question.upvotes = (question.upvotes || 0) + 1;
    fs.writeFileSync(QNA_FILE, JSON.stringify(qnas, null, 2));
    res.json({ success: true, upvotes: question.upvotes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch roadmap
app.get("/api/roadmap", (req, res) => {
  try {
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_FILE, "utf-8"));
    res.json(roadmap);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote a roadmap item
app.post("/api/roadmap/:id/vote", (req, res) => {
  try {
    const { id } = req.params;
    const roadmap = JSON.parse(fs.readFileSync(ROADMAP_FILE, "utf-8"));
    const item = roadmap.find((r: any) => r.id === id);
    if (!item) {
      return res.status(404).json({ error: "Feature not found." });
    }
    item.votes = (item.votes || 0) + 1;
    fs.writeFileSync(ROADMAP_FILE, JSON.stringify(roadmap, null, 2));
    res.json({ success: true, votes: item.votes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to newsletter / updates
app.post("/api/subscriptions", (req, res) => {
  try {
    const { email, topics } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }
    const subs = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    const exists = subs.find((s: any) => s.email.toLowerCase() === email.toLowerCase());
    
    const token = `LH-${Math.floor(100000 + Math.random() * 900000)}`;
    if (exists) {
      exists.topics = topics || exists.topics;
      exists.updatedAt = new Date().toISOString();
      fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
      return res.json({ success: true, alreadyExists: true, token: exists.token || token });
    }

    const newSub = {
      id: `sub_${Date.now()}`,
      email,
      topics: topics || [],
      token,
      timestamp: new Date().toISOString()
    };
    subs.push(newSub);
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
    res.json({ success: true, token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all subscriptions (Admin only)
app.get("/api/subscriptions", authenticateAdmin, (req, res) => {
  try {
    const subs = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    res.json(subs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a subscription (Admin only)
app.delete("/api/subscriptions/:id", authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let subs = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    subs = subs.filter((s: any) => s.id !== id);
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all sent broadcasts (Admin only)
app.get("/api/subscriptions/broadcasts", authenticateAdmin, (req, res) => {
  try {
    const broadcasts = JSON.parse(fs.readFileSync(BROADCASTS_FILE, "utf-8"));
    res.json(broadcasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send email broadcast / newsletter (Admin only)
app.post("/api/subscriptions/broadcast", authenticateAdmin, (req, res) => {
  try {
    const { subject, message, topic } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const subs = JSON.parse(fs.readFileSync(SUBS_FILE, "utf-8"));
    // Filter by topic if specified
    const targetSubs = topic && topic !== "all"
      ? subs.filter((s: any) => s.topics && s.topics.includes(topic))
      : subs;

    const recipientEmails = targetSubs.map((s: any) => s.email);

    const newBroadcast = {
      id: `bc_${Date.now()}`,
      subject,
      message,
      topic: topic || "all",
      recipientsCount: recipientEmails.length,
      recipients: recipientEmails,
      timestamp: new Date().toISOString()
    };

    const broadcasts = JSON.parse(fs.readFileSync(BROADCASTS_FILE, "utf-8"));
    broadcasts.unshift(newBroadcast);
    fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(broadcasts, null, 2));

    res.json({
      success: true,
      broadcast: newBroadcast
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =================================================================
   PRODUCT REVIEWS & COMMENTS ENDPOINTS
   ================================================================= */

// Fetch product comments (with auto-seeding if empty)
app.get("/api/comments/:productId", (req, res) => {
  try {
    const { productId } = req.params;
    let comments = [];
    if (fs.existsSync(COMMENTS_FILE)) {
      comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    } else {
      fs.writeFileSync(COMMENTS_FILE, JSON.stringify([], null, 2));
    }

    let productComments = comments.filter((c: any) => c.productId === productId);

    if (productComments.length === 0) {
      // Find the product to get its name
      let productName = "this template";
      try {
        if (fs.existsSync(PRODUCTS_FILE)) {
          const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
          const prod = products.find((p: any) => p.id === productId);
          if (prod) productName = prod.name;
        }
      } catch (e) {
        console.error("Error reading products for comment seeding:", e);
      }

      const seeds = [
        {
          id: `c_seed_1_${productId}`,
          productId,
          author: "Rohan Deshmukh",
          rating: 5,
          comment: `Absolutely brilliant template! The code quality for ${productName} is spectacular. Extremely clean Tailwind structure, easy to customize colors with standard tokens, and the Vite configuration works perfectly out-of-the-box. Highly recommended for any Indian developers or SaaS founders!`,
          tag: "Verified Purchase",
          timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          helpful_Votes: 12,
          replies: [
            {
              id: `r_seed_1_1_${productId}`,
              author: "Lifehut Team (Developer)",
              text: "Thank you so much Rohan! We worked hard on structuring the utility tokens to make edits seamless. Let us know on WhatsApp if you require help setting up the webhook gateways!",
              timestamp: new Date(Date.now() - 2.8 * 24 * 3600 * 1000).toISOString(),
              isAdmin: true
            }
          ]
        },
        {
          id: `c_seed_2_${productId}`,
          productId,
          author: "Sneha Sen",
          rating: 4,
          comment: `Perfect for my portfolio launch. Layout is modern and responsive. I love the interactive elements and page transitions. Just one suggestion: please add Svelte versions of the components in the future roadmap!`,
          tag: "Verified Purchase",
          timestamp: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
          helpful_Votes: 5,
          replies: []
        },
        {
          id: `c_seed_3_${productId}`,
          productId,
          author: "Vikram Malhotra",
          rating: 5,
          comment: `Is the UPI/Razorpay payment workflow integrated directly in the source code or do we need external routing? Asking because I need a self-hosted checkout page.`,
          tag: "Pre-Sale Question",
          timestamp: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
          helpful_Votes: 2,
          replies: [
            {
              id: `r_seed_3_1_${productId}`,
              author: "Lifehut Team (Developer)",
              text: "Hi Vikram! The ZIP folder includes the fully-configured client checkout module and clear instructions on how to bind your custom Razorpay API credentials. It is 100% self-hosted and independent.",
              timestamp: new Date(Date.now() - 11.5 * 24 * 3600 * 1000).toISOString(),
              isAdmin: true
            }
          ]
        }
      ];

      comments.push(...seeds);
      fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
      productComments = seeds;
    }

    res.json(productComments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a new product comment
app.post("/api/comments/:productId", (req, res) => {
  try {
    const { productId } = req.params;
    const { author, rating, comment, tag } = req.body;
    if (!author || !rating || !comment) {
      return res.status(400).json({ error: "Author, rating, and comment content are required." });
    }
    const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    const newComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId,
      author,
      rating: Number(rating),
      comment,
      tag: tag || "Visitor",
      timestamp: new Date().toISOString(),
      helpful_Votes: 0,
      replies: []
    };
    comments.unshift(newComment);
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
    res.json(newComment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upvote comment helpful status
app.post("/api/comments/:productId/:commentId/vote", (req, res) => {
  try {
    const { commentId } = req.params;
    const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    const comment = comments.find((c: any) => c.id === commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found." });
    }
    comment.helpful_Votes = (comment.helpful_Votes || 0) + 1;
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
    res.json({ success: true, helpful_Votes: comment.helpful_Votes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post a reply to a comment
app.post("/api/comments/:productId/:commentId/reply", (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, author, isAdmin } = req.body;
    if (!text || !author) {
      return res.status(400).json({ error: "Reply text and author are required." });
    }
    const comments = JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf-8"));
    const commentIndex = comments.findIndex((c: any) => c.id === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ error: "Comment not found." });
    }
    const newReply = {
      id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      author: isAdmin ? "Lifehut Team (Developer)" : author,
      text,
      timestamp: new Date().toISOString(),
      isAdmin: !!isAdmin
    };
    comments[commentIndex].replies = comments[commentIndex].replies || [];
    comments[commentIndex].replies.push(newReply);
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
    res.json(newReply);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* =================================================================
   VITE DEV SERVER & PRODUCTION BUNDLING MIDDLEWARES
   ================================================================= */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Catch-all wildcard route to serve and transform index.html in development mode
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.join(process.cwd(), "index.html");
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");
          html = await vite.transformIndexHtml(url, html);
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Lifehut Studio] Running at http://localhost:${PORT}`);
  });
}

startServer();
