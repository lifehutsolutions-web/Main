import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, ProductBadge, ProductStatus } from "../types";
import { supabase } from "../lib/supabaseClient";
import VisitorHub from "./VisitorHub";
import ProductComments from "./ProductComments";

interface StoreFrontProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToManager: () => void;
}

// Category lists mapping
const CAT_LABELS: Record<string, string> = {
  all: "All themes",
  saas: "SaaS / Startup",
  portfolio: "Portfolio",
  agency: "Agency",
  business: "Business",
  ecommerce: "E-Commerce",
  restaurant: "Restaurant",
  personalbrand: "Personal Brand",
  education: "Education",
  healthcare: "Healthcare",
  realestate: "Real Estate",
  event: "Event / Wedding",
  ngo: "NGO / Non-Profit"
};

export default function StoreFront({
  products,
  isLoading,
  onRefresh,
  onNavigateToManager
}: StoreFrontProps) {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [activeBadge, setActiveBadge] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [isListView, setIsListView] = useState<boolean>(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalSlideIdx, setModalSlideIdx] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Razorpay and Payment State
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [secureDownloadUrl, setSecureDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [claimEmail, setClaimEmail] = useState<string>("");

  // Load wishlist and dark theme
  useEffect(() => {
    const savedWish = localStorage.getItem("ls-wishlist");
    if (savedWish) setWishlist(JSON.parse(savedWish));

    const savedDark = localStorage.getItem("ls-dark");
    if (savedDark === "1") {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Freeze background scrolling when product detail modal is open
  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const toggleDark = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "");
    localStorage.setItem("ls-dark", nextDark ? "1" : "");
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let nextWish = [...wishlist];
    if (nextWish.includes(id)) {
      nextWish = nextWish.filter(item => item !== id);
    } else {
      nextWish.push(id);
    }
    setWishlist(nextWish);
    localStorage.setItem("ls-wishlist", JSON.stringify(nextWish));
  };

  // Filter categories helper
  const catToSlug = (cat: string) => {
    const key = (cat || "").toLowerCase().trim();
    if (key.includes("saas") || key.includes("startup")) return "saas";
    if (key.includes("portfolio")) return "portfolio";
    if (key.includes("agency")) return "agency";
    if (key.includes("business")) return "business";
    if (key.includes("e-commerce") || key.includes("ecommerce")) return "ecommerce";
    if (key.includes("restaurant")) return "restaurant";
    if (key.includes("personal brand") || key.includes("personalbrand")) return "personalbrand";
    if (key.includes("education")) return "education";
    if (key.includes("healthcare")) return "healthcare";
    if (key.includes("real estate") || key.includes("realestate")) return "realestate";
    if (key.includes("event") || key.includes("wedding")) return "event";
    if (key.includes("ngo") || key.includes("non-profit")) return "ngo";
    return key.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  };

  const formatCategoryLabel = (cat: string) => {
    if (CAT_LABELS[cat]) return CAT_LABELS[cat];
    return cat
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Extracted list of unique categories from currently live products
  const liveProducts = products.filter(p => p.status === "live");
  const categories = ["all", ...new Set(liveProducts.map(p => catToSlug(p.cat)))];

  // Filter & sort application
  const filteredProducts = liveProducts
    .filter(p => {
      const catSlug = catToSlug(p.cat);
      const catOk = activeCat === "all" || catSlug === activeCat;
      const badgeOk = activeBadge === "all" || (p.badge && p.badge.toLowerCase() === activeBadge);
      const matchesSearch = !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return catOk && badgeOk && matchesSearch;
    })
    .sort((a, b) => {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      if (sortBy === "free-first") return priceA - priceB;
      return 0; // Default Gist order
    });

  // Razorpay dynamic loader helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleFreeClaim = async (product: Product) => {
    if (!claimEmail || !claimEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      if (supabase && product.githubAssetId && typeof product.githubAssetId === "string" && !product.githubAssetId.startsWith("local")) {
        // Direct download from Supabase Storage
        const { data } = supabase.storage
          .from("templates")
          .getPublicUrl(product.githubAssetId);

        if (data && data.publicUrl) {
          setPaymentStatus("success");
          setSecureDownloadUrl(data.publicUrl);
          window.location.href = data.publicUrl;
          return;
        }
      }

      // Fallback to Express backend
      const res = await fetch("/api/payments/claim-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email: claimEmail }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentStatus("success");
        setSecureDownloadUrl(data.downloadUrl);
        // Automatically trigger download
        window.location.href = data.downloadUrl;
      } else {
        throw new Error(data.error || "Failed to process download link.");
      }
    } catch (err: any) {
      setPaymentStatus("error");
      setErrorMessage(err.message || "Something went wrong.");
    }
  };

  const handleRazorpayPayment = async (product: Product) => {
    setPaymentStatus("processing");
    setErrorMessage(null);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you offline?");
      }

      // 1. Create order on Express backend
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const { order, keyId } = await orderRes.json();

      // 2. Open Razorpay Checkout Dialog
      const options = {
        key: keyId || "rzp_test_dummyKeyId", // Fallback for simulation mode
        amount: order.amount,
        currency: order.currency,
        name: "Lifehut Studio",
        description: `Template: ${product.name}`,
        image: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/icons/layout-grid.svg",
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // 3. Verify payment signature on backend
            setPaymentStatus("processing");
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id || order.id,
                paymentId: response.razorpay_payment_id || "pay_simulated",
                signature: response.razorpay_signature || "sig_simulated",
                productId: product.id,
              }),
            });

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json();
              throw new Error(verifyErr.error || "Verification failed");
            }

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentStatus("success");
              setSecureDownloadUrl(verifyData.downloadUrl);
              // Trigger automatic zip download safely
              window.location.href = verifyData.downloadUrl;
            }
          } catch (verifyError: any) {
            setPaymentStatus("error");
            setErrorMessage(verifyError.message || "Payment signature verification failed.");
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
        },
        theme: {
          color: "#1a56db",
        },
        modal: {
          ondismiss: () => {
            setPaymentStatus("idle");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPaymentStatus("error");
      setErrorMessage(err.message || "An error occurred during payment processing.");
    }
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalSlideIdx(0);
    setPaymentStatus("idle");
    setSecureDownloadUrl(null);
    setErrorMessage(null);
    setClaimEmail("");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {/* NAVIGATION BAR */}
      <nav className="nav sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border)] px-4 md:px-8 bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="nav-brand flex items-center gap-2.5">
          <div className="nav-logo flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--hero-grad)] text-white text-base">
            <i className="ti ti-layout-grid"></i>
          </div>
          <div>
            <div className="nav-name text-sm md:text-base font-semibold">
              Lifehut <span className="text-[var(--blue)]">Studio™</span>
            </div>
            <div className="nav-by text-[10px] text-[var(--text3)]">by Lifehut Solutions</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => document.getElementById("themes-section")?.scrollIntoView({ behavior: "smooth" })}
            className="nav-link text-sm text-[var(--text2)] hover:text-[var(--blue)] cursor-pointer"
          >
            Themes
          </button>
          <button
            onClick={() => document.getElementById("hosting-section")?.scrollIntoView({ behavior: "smooth" })}
            className="nav-link text-sm text-[var(--text2)] hover:text-[var(--blue)] cursor-pointer"
          >
            Hosting
          </button>
          <button
            onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
            className="nav-link text-sm text-[var(--text2)] hover:text-[var(--blue)] cursor-pointer"
          >
            Features
          </button>
        </div>

        {/* Real-time Search Bar */}
        <div className="relative flex-1 max-w-[140px] xs:max-w-[180px] sm:max-w-xs mx-2 sm:mx-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text3)]">
            <i className="ti ti-search text-sm"></i>
          </div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--blue)] focus:bg-[var(--bg)] transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
              aria-label="Clear search"
            >
              <i className="ti ti-x text-[10px]"></i>
            </button>
          )}
        </div>

        <div className="nav-right flex items-center gap-2.5">
          <button
            className="dark-toggle flex items-center rounded-lg border border-[var(--border)] p-2 text-[var(--text2)] hover:text-[var(--text)] cursor-pointer"
            onClick={toggleDark}
            aria-label="Toggle Dark Mode"
          >
            <i className={isDark ? "ti ti-sun text-lg" : "ti ti-moon text-lg"}></i>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero relative overflow-hidden bg-[var(--hero-grad)] px-4 py-20 text-center text-white md:px-8">
        {/* Animated Background Circle Decorator */}
        <motion.div
          className="absolute w-[380px] h-[380px] rounded-full bg-[#1a56db]/15 pointer-events-none"
          animate={{
            left: ["75%", "45%", "15%", "-5%", "15%", "45%", "75%", "85%", "75%"],
            top: ["-10%", "-15%", "-10%", "20%", "50%", "55%", "50%", "20%", "-10%"],
            scale: [1, 1.05, 0.95, 1.02, 0.98, 1.05, 1, 0.98, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs text-white/90">
            <span className="pulse h-2 w-2 rounded-full bg-emerald-400"></span>
            Direct Digital Storefront — Razorpay Secure
          </div>
          <h1 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Premium website themes.
            <br />
            <span className="italic text-blue-300">Explore. Select. Deploy.</span>
          </h1>
          <p className="hero-sub mx-auto mt-6 max-w-xl text-sm text-white/70 sm:text-base">
            Premium digital designs and developer toolkits crafted by Lifehut Solutions. Enjoy live carousels, full feature reviews, and secure file claims instantly.
          </p>
          <div className="hero-actions mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => document.getElementById("themes-section")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-white flex items-center gap-2 rounded-lg bg-white hover:bg-blue-5 px-6 py-3.5 text-sm font-semibold text-blue-900 transition-all cursor-pointer"
            >
              <i className="ti ti-layout-grid"></i> Browse Templates
            </button>
          </div>

          <div className="hero-stats mt-16 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 sm:grid-cols-4" role="list">
            <div role="listitem">
              <div className="hero-stat-num text-2xl sm:text-3xl font-bold">{liveProducts.length}+</div>
              <div className="hero-stat-lbl text-[10px] uppercase tracking-wider text-white/50">Themes Live</div>
            </div>
            <div role="listitem">
              <div className="hero-stat-num text-2xl sm:text-3xl font-bold">100%</div>
              <div className="hero-stat-lbl text-[10px] uppercase tracking-wider text-white/50">Secured Checkout</div>
            </div>
            <div role="listitem">
              <div className="hero-stat-num text-2xl sm:text-3xl font-bold">₹</div>
              <div className="hero-stat-lbl text-[10px] uppercase tracking-wider text-white/50">INR Payments</div>
            </div>
            <div role="listitem">
              <div className="hero-stat-num text-2xl sm:text-3xl font-bold">Instant</div>
              <div className="hero-stat-lbl text-[10px] uppercase tracking-wider text-white/50">Protected Zip</div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFIT TRUST BAR */}
      <div className="trust-bar flex flex-wrap justify-center gap-8 border-b border-[var(--border)] bg-[var(--bg2)] py-4 px-4 text-xs font-medium text-[var(--text2)]" role="list" aria-label="Key Benefits">
        <div className="trust-item flex items-center gap-2" role="listitem">
          <i className="ti ti-shield-check text-base text-[var(--blue)]"></i> Razorpay & UPI Secure
        </div>
        <div className="trust-item flex items-center gap-2" role="listitem">
          <i className="ti ti-download text-base text-[var(--blue)]"></i> Token-Protected Download Links
        </div>
        <div className="trust-item flex items-center gap-2" role="listitem">
          <i className="ti ti-brand-github text-base text-[var(--blue)]"></i> Private Releases Storage
        </div>
        <div className="trust-item flex items-center gap-2" role="listitem">
          <i className="ti ti-headset text-base text-[var(--blue)]"></i> Dedicated Indian Support
        </div>
      </div>

      {/* THEMES CATALOGUE SECTION */}
      <section className="products-section px-4 py-16 md:px-8 bg-[var(--bg)]" id="themes-section">
        <div className="mx-auto max-w-6xl">
          <div className="section-header text-center mb-10">
            <span className="section-eyebrow inline-block rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
              Catalog
            </span>
            <h2 className="section-title text-2xl sm:text-4xl font-bold mt-3">Find the theme that fits your vision</h2>
            <p className="section-sub text-sm text-[var(--text2)] mt-2 max-w-xl mx-auto">
              Scribble colors, dynamic carousels, and checkout instantly. Every purchased item streams through a secure, encrypted token.
            </p>
          </div>

          {/* FILTER AND VIEW TOGGLE BAR */}
          <div className="filter-bar flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* All themes selection */}
              <button
                onClick={() => setActiveCat("all")}
                className={`ftab rounded-lg border border-[var(--border)] px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
                  activeCat === "all"
                    ? "bg-[var(--blue)] text-white border-[var(--blue)]"
                    : "text-[var(--text2)] hover:border-[var(--blue)] bg-[var(--bg)]"
                }`}
              >
                All themes
              </button>

              {/* Industry Dropdown */}
              <select
                value={activeCat === "all" ? "" : activeCat}
                onChange={e => {
                  const val = e.target.value;
                  setActiveCat(val || "all");
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-xs font-semibold text-[var(--text2)] outline-none cursor-pointer hover:border-[var(--blue)] transition-colors"
              >
                <option value="">Select Industry...</option>
                {categories
                  .filter(cat => cat !== "all")
                  .map(cat => (
                    <option key={cat} value={cat}>
                      {formatCategoryLabel(cat)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Badge selector */}
              <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-1 bg-[var(--bg2)]">
                {["all", "new", "hot", "free"].map(badge => (
                  <button
                    key={badge}
                    onClick={() => setActiveBadge(badge)}
                    className={`rounded-md px-3 py-1 text-[11px] font-semibold cursor-pointer transition-all ${
                      activeBadge === badge
                        ? "bg-[var(--blue)] text-white"
                        : "text-[var(--text2)] hover:text-[var(--text)]"
                    }`}
                  >
                    {badge.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-medium text-[var(--text2)] outline-none cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="free-first">Free templates first</option>
              </select>

              {/* View Layout buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => setIsListView(false)}
                  className={`rounded-lg border border-[var(--border)] p-2 text-sm cursor-pointer transition-all ${
                    !isListView ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                  aria-label="Grid View"
                >
                  <i className="ti ti-layout-grid"></i>
                </button>
                <button
                  onClick={() => setIsListView(true)}
                  className={`rounded-lg border border-[var(--border)] p-2 text-sm cursor-pointer transition-all ${
                    isListView ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "text-[var(--text3)] hover:text-[var(--text)]"
                  }`}
                  aria-label="List View"
                >
                  <i className="ti ti-layout-list"></i>
                </button>
                <button
                  onClick={onRefresh}
                  className="rounded-lg border border-[var(--border)] p-2 text-sm text-[var(--text3)] hover:text-[var(--text)] cursor-pointer"
                  title="Refresh store list"
                >
                  <i className="ti ti-refresh"></i>
                </button>
              </div>
            </div>
          </div>

          {/* CATALOGUE GRID */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin text-3xl text-[var(--blue)] mb-3">
                <i className="ti ti-loader-2"></i>
              </div>
              <div className="text-sm text-[var(--text3)] font-medium">Syncing template store...</div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-16 text-center text-[var(--text3)]">
              <i className="ti ti-box-off text-4xl mb-4 opacity-40 block"></i>
              <div className="text-base font-semibold">No active templates found</div>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                No templates are currently active in this category. Please check back later.
              </p>
            </div>
          ) : (
            <div className={isListView ? "flex flex-col gap-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
              {filteredProducts.map((p, pIdx) => {
                const isLiked = wishlist.includes(p.id);
                const hasPrice = p.price && parseFloat(p.price) > 0;
                
                return (
                  <motion.article
                    layout
                    key={p.id}
                    onClick={() => openProductModal(p)}
                    className={`pcard flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${
                      isListView ? "md:flex-row" : ""
                    }`}
                  >
                    {/* Media area */}
                    <div className={`relative h-52 bg-[var(--bg3)] ${isListView ? "md:w-72 md:h-auto flex-shrink-0" : "w-full"}`}>
                      {/* Image render */}
                      {p.images && p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          style={{ background: p.color || "linear-gradient(135deg, #0f172a, #1e3a8a)" }}
                          className="w-full h-full flex flex-col items-center justify-center text-white/80 p-4"
                        >
                          <i className={`ti ${p.mediatype === "video" ? "ti-video" : "ti-photo"} text-3xl opacity-50 mb-2`}></i>
                          <span className="text-[11px] font-semibold tracking-wider uppercase text-center">
                            {p.mediatype === "video" ? "Video Walkthrough" : p.slides[0] || "Theme Preview"}
                          </span>
                        </div>
                      )}

                      {/* Top left badge */}
                      {p.badge && (
                        <span className={`media-tl absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase ${
                          p.badge === "New" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                          p.badge === "Hot" ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300" :
                          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}>
                          {p.badge}
                        </span>
                      )}

                      {/* Wishlist Top Right */}
                      <button
                        onClick={(e) => toggleWishlist(p.id, e)}
                        className="wish-btn absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:scale-110 cursor-pointer text-sm"
                        aria-label="Add to Wishlist"
                      >
                        <i className={`ti ${isLiked ? "ti-heart-filled text-rose-500" : "ti-heart"}`}></i>
                      </button>

                      {/* Bottom Right detail pill */}
                      <div className="media-pill absolute bottom-3 right-3 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white flex items-center gap-1.5">
                        <i className={`ti ${p.mediatype === "video" ? "ti-video" : "ti-photo"}`}></i>
                        {p.mediatype === "video" ? "Walkthrough" : `${p.slides.length} Screens`}
                      </div>
                    </div>

                    {/* Card Content body */}
                    <div className="card-body p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="card-top flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="card-cat text-[10px] font-bold tracking-wider text-[var(--text3)]">
                              {formatCategoryLabel(catToSlug(p.cat))}
                            </div>
                            <h3 className="card-title text-base font-bold text-[var(--text)] mt-1 line-clamp-1">
                              {p.name}
                            </h3>
                          </div>
                          <div className="card-stars flex items-center text-xs text-amber-500 whitespace-nowrap">
                            <i className="ti ti-star-filled"></i>
                            <i className="ti ti-star-filled"></i>
                            <i className="ti ti-star-filled"></i>
                            <i className="ti ti-star-filled"></i>
                            <i className="ti ti-star-filled"></i>
                            <span className="text-[10px] text-[var(--text3)] ml-1">(5.0)</span>
                          </div>
                        </div>

                        <p className="card-desc text-xs text-[var(--text2)] leading-relaxed mb-4 line-clamp-2">
                          {p.desc}
                        </p>

                        {/* tags */}
                        <div className="card-tags flex flex-wrap gap-1 mb-4">
                          {p.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="card-tag rounded bg-[var(--bg3)] text-[var(--text2)] text-[10px] px-2 py-0.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* footer details */}
                      <div className="card-footer flex items-center justify-between border-t border-[var(--border)] pt-4 mt-auto">
                        <div className="flex items-baseline">
                          {hasPrice ? (
                            <>
                              <span className="price-now text-lg font-bold">
                                ₹{Number(p.price).toLocaleString("en-IN")}
                              </span>
                              {p.oldprice && (
                                <>
                                  <span className="price-was text-xs text-[var(--text3)] text-decoration-line-through ml-2 line-through">
                                    ₹{Number(p.oldprice).toLocaleString("en-IN")}
                                  </span>
                                  <span className="price-save text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded px-1.5 py-0.5 ml-2">
                                    {Math.round((1 - parseFloat(p.price) / parseFloat(p.oldprice)) * 100)}% OFF
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="price-free-lbl text-base font-bold text-emerald-600 dark:text-emerald-400">
                              Free
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => openProductModal(p)}
                          className="btn-explore rounded-lg bg-[var(--blue)] hover:bg-[var(--blue-dark)] text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <i className="ti ti-eye"></i> Explore
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* HOSTING SECTION */}
      <section className="hosting-section px-4 py-16 md:px-8 bg-[var(--bg2)] border-y border-[var(--border)]" id="hosting-section">
        <div className="mx-auto max-w-5xl">
          <div className="hosting-header text-center mb-10">
            <div className="compat-badge inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg px-3 py-1 text-xs font-semibold">
              <i className="ti ti-circle-check"></i> Standard Static Build
            </div>
            <h2 className="section-title text-2xl sm:text-3xl font-bold mt-4">Deploy effortlessly on any host</h2>
            <p className="section-sub text-sm text-[var(--text2)] mt-2 max-w-md mx-auto">
              Lifehut templates are bundled into structured, clean, zip files containing fully-compiled HTML, CSS, and assets.
            </p>
          </div>

          <div className="platforms-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" role="list">
            {[
              { name: "Vercel", desc: "Drag & drop launch", icon: "ti-triangle" },
              { name: "Netlify", desc: "One-click deployment", icon: "ti-bolt" },
              { name: "GitHub Pages", desc: "Free static host", icon: "ti-brand-github" },
              { name: "Cloudflare Pages", desc: "Global edge network", icon: "ti-cloud" },
              { name: "AWS Amplify", desc: "Amazon web cloud", icon: "ti-brand-aws" },
              { name: "Firebase Hosting", desc: "Google cloud CDN", icon: "ti-brand-firebase" },
              { name: "Hostinger", desc: "FTP file uploads", icon: "ti-server-2" },
              { name: "GoDaddy", desc: "Shared public host", icon: "ti-world" },
              { name: "DigitalOcean", desc: "App cloud platform", icon: "ti-server" },
              { name: "Fly.io", desc: "Close to users", icon: "ti-rocket" },
              { name: "GitLab Pages", desc: "Automated CI/CD host", icon: "ti-brand-gitlab" },
              { name: "Surge.sh", desc: "Instant CLI publishing", icon: "ti-terminal" },
              { name: "Render", desc: "Free web hosting", icon: "ti-terminal-2" },
              { name: "Custom Host", desc: "Standard ZIP folder", icon: "ti-folder" }
            ].map(p => (
              <div key={p.name} className="platform-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-center hover:border-[var(--blue)] transition-all" role="listitem">
                <div className="platform-icon h-10 w-10 mx-auto mb-3 bg-[var(--bg3)] text-[var(--blue)] rounded-lg flex items-center justify-center text-lg">
                  <i className={`ti ${p.icon}`}></i>
                </div>
                <div className="platform-name text-xs font-semibold">{p.name}</div>
                <div className="platform-desc text-[10px] text-[var(--text3)] mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>

          <div className="hosting-note flex gap-3 rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/20 p-5 mt-8 text-xs text-blue-800 dark:text-blue-300" role="note">
            <i className="ti ti-info-circle text-lg flex-shrink-0"></i>
            <div>
              <strong>Pure HTML & CSS standard templates:</strong> All templates downloaded from Lifehut Studio are completely isolated, standalone files. No databases, proprietary locks, or runtime limits. Stream safely, build freely.
            </div>
          </div>
        </div>
      </section>

      {/* WHY LIFEHUT FEATURES SECTION */}
      <section className="features-section px-4 py-16 md:px-8 bg-[var(--bg)]" id="features-section">
        <div className="mx-auto max-w-5xl">
          <div className="section-header text-center mb-12">
            <span className="section-eyebrow inline-block rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
              Benefits
            </span>
            <h2 className="section-title text-2xl sm:text-3xl font-bold mt-3">Why Lifehut Studio?</h2>
            <p className="section-sub text-sm text-[var(--text2)] mt-2">
              Every digital template is curated, polished, and secured server-side.
            </p>
          </div>

          <div className="features-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" role="list">
            {[
              { title: "Walkthrough Previews", desc: "Preview full images or watch videos inside the explore dialog before committing.", icon: "ti-movie" },
              { title: "Secured Downloads", desc: "Zips are hosted directly on secure, high-speed cloud servers, accessed via signed backend relays.", icon: "ti-lock-square" },
              { title: "One-Time Payment", desc: "No subscriptions, lock-ins, or credits. Clear pricing with UPI support.", icon: "ti-currency-rupee" },
              { title: "Pure Static Bundle", desc: "Templates deploy anywhere, load at blazing speeds, and are easy to customize.", icon: "ti-file-zip" },
              { title: "Design Assets Included", desc: "SaaS and premium startup packages bundle complete original vector design assets.", icon: "ti-vector" },
              { title: "Affordable Premium Quality", desc: "Get industry-grade designs and hand-crafted layouts at an accessible, transparent flat rate.", icon: "ti-tag" },
              { title: "Easy & Seamless Editing", desc: "Clean, well-documented code allows you to customize components and content effortlessly.", icon: "ti-edit" },
              { title: "Indian Support Desk", desc: "Immediate assistance from the Lifehut core developer team — no generic bots.", icon: "ti-headset" }
            ].map(f => (
              <div key={f.title} className="feature-card bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--blue)] transition-all" role="listitem">
                <div className="feat-icon h-10 w-10 mb-4 bg-blue-50 dark:bg-blue-950/20 text-[var(--blue)] rounded-lg flex items-center justify-center text-lg">
                  <i className={`ti ${f.icon}`}></i>
                </div>
                <h4 className="feat-title text-xs font-semibold mb-1">{f.title}</h4>
                <p className="feat-desc text-[11px] text-[var(--text2)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer bg-[#0a1628] py-14 px-4 text-slate-400 md:px-8" role="contentinfo">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="footer-brand flex items-center gap-2 mb-4">
                <div className="footer-logo-box h-8 w-8 bg-[var(--blue)] rounded-lg flex items-center justify-center text-white text-sm">
                  <i className="ti ti-layout-grid"></i>
                </div>
                <span className="footer-logo-name text-base font-bold text-white">
                  Lifehut <span className="text-blue-400">Studio™</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-sm">
                Premium website templates and digital instruments curated by Lifehut Solutions. Enjoy standard static files and secured checkout relays built for developers and startups.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Resources</h4>
              <button onClick={() => document.getElementById("themes-section")?.scrollIntoView({ behavior: "smooth" })} className="block text-xs hover:text-white mb-2.5 cursor-pointer">Catalog Store</button>
              <button onClick={() => document.getElementById("hosting-section")?.scrollIntoView({ behavior: "smooth" })} className="block text-xs hover:text-white mb-2.5 cursor-pointer">Hosting Guides</button>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Company</h4>
              <a href="https://www.lifehutsolutions.com" target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-white mb-2.5">Lifehut Solutions</a>
              <a href="https://www.lifehutsolutions.com" target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-white mb-2.5">About Us</a>
              <a href="https://www.lifehutsolutions.com" target="_blank" rel="noopener noreferrer" className="block text-xs hover:text-white mb-2.5">Inquire Quote</a>
            </div>
          </div>

          <div className="footer-bottom border-t border-slate-800 mt-10 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span>&copy; {new Date().getFullYear()} Lifehut Solutions. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Use</a>
              <a href="#" className="hover:text-white">Refunds</a>
            </div>
          </div>
        </div>
      </footer>

      {/* DETAIL EXPLORE & CHECKOUT MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[var(--card)] rounded-2xl overflow-hidden shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col"
            >
              {/* Top media block */}
              <div className="relative h-60 bg-[var(--bg3)] flex-shrink-0 overflow-hidden">
                {selectedProduct.mediatype === "video" ? (
                  /* Video Render */
                  <div className="w-full h-full relative">
                    {selectedProduct.videourl ? (
                      selectedProduct.videourl.includes("youtube.com") || selectedProduct.videourl.includes("youtu.be") ? (
                        <iframe
                          src={selectedProduct.videourl}
                          className="w-full h-full absolute inset-0"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <video
                          src={selectedProduct.videourl}
                          className="w-full h-full object-cover"
                          controls
                          playsInline
                        ></video>
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--hero-grad)] text-white">
                        <i className="ti ti-video text-4xl opacity-50 mb-2 animate-pulse"></i>
                        <span className="text-xs">No video URL added</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Images Carousel Render */
                  <div className="w-full h-full relative">
                    {selectedProduct.images && selectedProduct.images[modalSlideIdx] ? (
                      <img
                        src={selectedProduct.images[modalSlideIdx]}
                        alt={selectedProduct.slides[modalSlideIdx]}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        style={{ background: selectedProduct.color || "linear-gradient(135deg, #0f172a, #1e3a8a)" }}
                        className="w-full h-full flex flex-col items-center justify-center text-white/80 p-6"
                      >
                        <i className="ti ti-photo text-4xl opacity-50 mb-2"></i>
                        <span className="text-sm font-semibold tracking-wide">
                          {selectedProduct.slides[modalSlideIdx] || "Mock Slide Preview"}
                        </span>
                      </div>
                    )}

                    {/* Carousel Left/Right arrows */}
                    {selectedProduct.slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setModalSlideIdx(prev => (prev - 1 + selectedProduct.slides.length) % selectedProduct.slides.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--blue)] shadow-md hover:scale-105 cursor-pointer"
                          aria-label="Previous Slide"
                        >
                          <i className="ti ti-chevron-left text-lg"></i>
                        </button>
                        <button
                          onClick={() => setModalSlideIdx(prev => (prev + 1) % selectedProduct.slides.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[var(--blue)] shadow-md hover:scale-105 cursor-pointer"
                          aria-label="Next Slide"
                        >
                          <i className="ti ti-chevron-right text-lg"></i>
                        </button>
                      </>
                    )}

                    {/* Navigation Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selectedProduct.slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setModalSlideIdx(i)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            modalSlideIdx === i ? "bg-white w-5" : "bg-white/40 w-2"
                          }`}
                        ></button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button top right */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-md hover:scale-105 cursor-pointer text-base"
                  aria-label="Close Dialog"
                >
                  <i className="ti ti-x"></i>
                </button>
              </div>

              {/* Scrollable details area */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                <div className="modal-cat text-[10px] font-bold tracking-wider text-[var(--text3)] mb-1">
                  {formatCategoryLabel(catToSlug(selectedProduct.cat))}
                </div>
                <h3 className="modal-title text-xl md:text-2xl font-bold mb-3">{selectedProduct.name}</h3>
                <p className="modal-desc text-xs md:text-sm text-[var(--text2)] leading-relaxed mb-6">
                  {selectedProduct.desc}
                </p>

                {/* Checklist Features */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-3">
                  Checklist & Features included
                </h4>
                <div className="modal-features grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {selectedProduct.features && selectedProduct.features.length > 0 ? (
                    selectedProduct.features.map(feat => (
                      <div key={feat} className="mfeat flex items-center gap-2 text-xs text-[var(--text2)]">
                        <i className="ti ti-circle-check text-base text-[var(--blue)]"></i>
                        {feat}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[var(--text3)] italic">Standard file components included.</div>
                  )}
                </div>

                {/* Amazon-style Reviews & Q&A Discussion section */}
                <ProductComments productId={selectedProduct.id} productName={selectedProduct.name} />

                {/* Payment status, alert box & download controls */}
                {paymentStatus !== "idle" && (
                  <div className={`p-4 rounded-xl mb-6 text-xs flex flex-col gap-2 ${
                    paymentStatus === "processing" ? "bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border border-blue-200" :
                    paymentStatus === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200" :
                    "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200"
                  }`}>
                    <div className="flex items-center gap-2 font-semibold">
                      <i className={`ti ${
                        paymentStatus === "processing" ? "ti-loader-2 animate-spin" :
                        paymentStatus === "success" ? "ti-circle-check" :
                        "ti-alert-circle"
                      } text-base`}></i>
                      {paymentStatus === "processing" ? "Verifying secured files..." :
                       paymentStatus === "success" ? "Payment successfully verified!" :
                       "Verification / Transaction failed"}
                    </div>
                    {paymentStatus === "processing" && (
                      <p>Connecting to secure storage. Do not refresh or exit checkout.</p>
                    )}
                    {paymentStatus === "success" && (
                      <div>
                        <p className="mb-2">Your secure, token-protected download URL has been created.</p>
                        <a
                          href={secureDownloadUrl || "#"}
                          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
                        >
                          <i className="ti ti-download"></i> Download Template Folder
                        </a>
                      </div>
                    )}
                    {paymentStatus === "error" && (
                      <p>{errorMessage || "Failed to finalize payment check."}</p>
                    )}
                  </div>
                )}

                {/* Footer action keys */}
                <div className="modal-footer flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
                  <div>
                    {selectedProduct.price && parseFloat(selectedProduct.price) > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text3)] uppercase font-semibold">Single payment</span>
                        <div className="flex items-baseline gap-2">
                          <span className="modal-price text-2xl font-bold">
                            ₹{Number(selectedProduct.price).toLocaleString("en-IN")}
                          </span>
                          {selectedProduct.oldprice && (
                            <span className="modal-price-old text-xs text-[var(--text3)] line-through">
                              ₹{Number(selectedProduct.oldprice).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text3)] uppercase font-semibold font-mono">Free item</span>
                        <span className="modal-price text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          Free Claim
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Claims and payment trigger */}
                    {selectedProduct.price && parseFloat(selectedProduct.price) > 0 ? (
                      <button
                        onClick={() => handleRazorpayPayment(selectedProduct)}
                        disabled={paymentStatus === "processing"}
                        className="btn-modal-p flex-1 sm:flex-none justify-center rounded-xl bg-[var(--blue)] hover:bg-[var(--blue-dark)] text-white font-semibold text-sm px-6 py-3 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <i className="ti ti-brand-up"></i> Buy & Download Now
                      </button>
                    ) : (
                      /* Free claim input and trigger */
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <div className="flex gap-1">
                          <input
                            type="email"
                            placeholder="Enter your email"
                            value={claimEmail}
                            onChange={e => setClaimEmail(e.target.value)}
                            disabled={paymentStatus === "processing" || paymentStatus === "success"}
                            className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text)] outline-none min-w-[160px] bg-[var(--bg)]"
                          />
                          <button
                            onClick={() => handleFreeClaim(selectedProduct)}
                            disabled={paymentStatus === "processing" || paymentStatus === "success" || !claimEmail}
                            className="btn-modal-p rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <i className="ti ti-download"></i> Claim Free
                          </button>
                        </div>
                        <div className="text-[9px] text-[var(--text3)]">Download zip directly from private releases.</div>
                      </div>
                    )}

                    {selectedProduct.genurl && (
                      <a
                        href={selectedProduct.genurl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-modal-s justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--bg2)] text-[var(--text)] px-4 py-3 text-sm flex items-center gap-1.5 transition-all"
                      >
                        <i className="ti ti-eye"></i> Live Customize
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <VisitorHub />
    </div>
  );
}
