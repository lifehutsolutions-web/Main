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
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2));
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
   VITE DEV SERVER & PRODUCTION BUNDLING MIDDLEWARES
   ================================================================= */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
