import React, { useState, useEffect } from "react";
import { Product, ProductBadge, ProductStatus, MediaType } from "../types";
import { supabase } from "../lib/supabaseClient";

interface ProductManagerProps {
  products: Product[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateToStore: () => void;
}

const COLOR_GRADIENTS = [
  { name: "Navy Blue", value: "linear-gradient(135deg, #0f172a, #1e3a8a)", colors: ["#0f172a", "#1e3a8a"] },
  { name: "Deep Purple", value: "linear-gradient(135deg, #1c1c2e, #4a1d96)", colors: ["#1c1c2e", "#4a1d96"] },
  { name: "Forest Green", value: "linear-gradient(135deg, #064e3b, #059669)", colors: ["#064e3b", "#059669"] },
  { name: "Burnt Orange", value: "linear-gradient(135deg, #7c2d12, #c2410c)", colors: ["#7c2d12", "#c2410c"] },
  { name: "Electric Blue", value: "linear-gradient(135deg, #1e3a5f, #2563eb)", colors: ["#1e3a5f, #2563eb"] },
  { name: "Violet", value: "linear-gradient(135deg, #3b0764, #7c3aed)", colors: ["#3b0764", "#7c3aed"] },
  { name: "Sky Blue", value: "linear-gradient(135deg, #0c4a6e, #0ea5e9)", colors: ["#0c4a6e", "#0ea5e9"] },
  { name: "Charcoal", value: "linear-gradient(135deg, #1a1a1a, #404040)", colors: ["#1a1a1a", "#404040"] },
  { name: "Rose", value: "linear-gradient(135deg, #881337, #e11d48)", colors: ["#881337", "#e11d48"] },
  { name: "Teal", value: "linear-gradient(135deg, #134e4a, #0d9488)", colors: ["#134e4a", "#0d9488"] }
];

export default function ProductManager({
  products = [],
  isLoading,
  onRefresh,
  onNavigateToStore
}: ProductManagerProps) {
  const safeProducts = Array.isArray(products) ? products : [];

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Layout View State
  const [activeTab, setActiveTab] = useState<"list" | "form" | "reviews" | "settings" | "help" | "newsletter">("list");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Newsletter Subscribers & Broadcast States
  const [broadcastNotification, setBroadcastNotification] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");
  const [broadcastTopic, setBroadcastTopic] = useState<string>("releases");
  const [fetchingSubs, setFetchingSubs] = useState<boolean>(false);
  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);
  const [newsletterAlert, setNewsletterAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Reviews State
const [reviews, setReviews] = useState<any[]>([]);
const [loadingReviews, setLoadingReviews] = useState(false);
const [selectedReview, setSelectedReview] = useState<any | null>(null);
const [developerReply, setDeveloperReply] = useState("");

  // Form Fields State
  const [fName, setFName] = useState<string>("");
  const [fCat, setFCat] = useState<string>("SaaS / Startup");
  const [fDesc, setFDesc] = useState<string>("");
  const [fTemplate, setFTemplate] = useState<string>("");
  const [fPrice, setFPrice] = useState<string>("");
  const [fOldPrice, setFOldPrice] = useState<string>("");
  const [fBadge, setFBadge] = useState<ProductBadge>("New");
  const [fColor, setFColor] = useState<string>(COLOR_GRADIENTS[0].value);
  const [fMediaType, setFMediaType] = useState<MediaType>("carousel");
  const [fVideoUrl, setFVideoUrl] = useState<string>("");
  const [fTags, setFTags] = useState<string[]>([]);
  const [fFeatures, setFFeatures] = useState<string[]>([]);
  const [fSlides, setFSlides] = useState<string[]>(["Hero section", "Features", "Pricing"]);
  const [fImages, setFImages] = useState<string[]>([]);
  const [fThumb, setFThumb] = useState<string>("");
  
  // File upload states (template zip file)
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploadStatus, setZipUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadedAssetId, setUploadedAssetId] = useState<string | number>("");
  const [uploadedAssetName, setUploadedAssetName] = useState<string>("");

  // Input states
  const [tagInput, setTagInput] = useState<string>("");
  const [featInput, setFeatInput] = useState<string>("");

  // Local state alerts
  const [formAlert, setFormAlert] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // GitHub Config settings state
  const [gitToken, setGitToken] = useState<string>("");
  const [gitRepo, setGitRepo] = useState<string>("");
  const [gitGistId, setGitGistId] = useState<string>("");
  const [gitStatus, setGitStatus] = useState<{ type: "ok" | "err" | "warn" | "loading" | "idle"; msg: string }>({
    type: "idle",
    msg: "Gist sync not tested."
  });

  const [migrationStatus, setMigrationStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string }>({
    type: "idle",
    msg: ""
  });

  // Load Admin Token on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem("ls-admin-token");
    if (savedToken) {
      setToken(savedToken);
    }

    // Load GitHub settings from localStorage (for display purposes, server reads from process.env but we can allow admin override/sync tools!)
    const savedGit = localStorage.getItem("ls-gist-override");
    if (savedGit) {
      try {
        const parsed = JSON.parse(savedGit);
        setGitToken(parsed.token || "");
        setGitRepo(parsed.repo || "");
        setGitGistId(parsed.gistId || "");
      } catch {}
    }
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    if (!email || !password) {
      setLoginError("Please enter email and password.");
      return;
    }

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          setToken(data.session.access_token);
          localStorage.setItem("ls-admin-token", data.session.access_token);
          showToast("Welcome back, Administrator!");
          onRefresh();
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (res.ok && data.token) {
          setToken(data.token);
          localStorage.setItem("ls-admin-token", data.token);
          showToast("Welcome back, Administrator!");
          onRefresh();
        } else {
          setLoginError(data.error || "Authentication failed. Try again.");
        }
      }
    } catch (err: any) {
      setLoginError(err.message || "Authentication failed.");
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setToken(null);
    localStorage.removeItem("ls-admin-token");
    showToast("Signed out successfully.");
  };

  // Toast notifier helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Form field reset helper
  const resetFormFields = () => {
    setEditingProduct(null);
    setFName("");
    setFCat("SaaS / Startup");
    setFDesc("");
    setFTemplate("");
    setFPrice("");
    setFOldPrice("");
    setFBadge("New");
    setFColor(COLOR_GRADIENTS[0].value);
    setFMediaType("carousel");
    setFVideoUrl("");
    setFTags([]);
    setFFeatures([]);
    setFSlides(["Hero section", "Features", "Pricing"]);
    setFImages([]);
    setFThumb("");
    setZipFile(null);
    setZipUploadStatus("idle");
    setUploadedAssetId("");
    setUploadedAssetName("");
    setBroadcastNotification(false);
    setFormAlert(null);
  };

  const startAddProduct = () => {
    resetFormFields();
    setActiveTab("form");
  };

  const startEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFName(p.name);
    setFCat(p.cat);
    setFDesc(p.desc);
    setFTemplate(p.template);
    setFPrice(p.price);
    setFOldPrice(p.oldprice);
    setFBadge(p.badge);
    setFColor(p.color);
    setFMediaType(p.mediatype);
    setFVideoUrl(p.videourl || "");
    setFTags(Array.isArray(p.tags) ? [...p.tags] : []);
    setFFeatures(Array.isArray(p.features) ? [...p.features] : []);
    setFSlides(Array.isArray(p.slides) ? [...p.slides] : []);
    setFImages(Array.isArray(p.images) ? [...p.images] : []);
    setFThumb(p.thumb || "");
    setZipFile(null);
    setZipUploadStatus(p.githubAssetId ? "success" : "idle");
    setUploadedAssetId(p.githubAssetId || "");
    setUploadedAssetName(p.githubAssetName || "");
    setBroadcastNotification(false);
    setFormAlert(null);
    setActiveTab("form");
  };

  const handlePublishStatus = async (p: Product, newStatus: ProductStatus) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .update({ status: newStatus, updatedAt: new Date().toISOString() })
          .eq("id", p.id);
        if (error) throw error;
        showToast(`Template successfully moved to ${newStatus}`);
        onRefresh();
      } else {
        const res = await fetch(`/api/products/${p.id}/publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (res.ok) {
          showToast(`Template successfully moved to ${newStatus}`);
          onRefresh();
        } else {
          const data = await res.json();
          showToast(data.error || "Failed to update template status.");
        }
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred.");
    }
  };

  const handleBatchGoLive = async () => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .update({ status: "live", updatedAt: new Date().toISOString() })
          .neq("id", "");
        if (error) throw error;
        showToast("Blazing fast! All products are now Live!");
        onRefresh();
      } else {
        const res = await fetch("/api/products/go-live", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });

        if (res.ok) {
          showToast("Blazing fast! All products are now Live!");
          onRefresh();
        } else {
          showToast("Batch action failed.");
        }
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred.");
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      setFormAlert({ type: "error", msg: "Invalid file type. File must end in .zip extension." });
      return;
    }

    setZipFile(file);
    setZipUploadStatus("uploading");

    try {
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("templates")
          .upload(filePath, file);

        if (error) throw error;

        setZipUploadStatus("success");
        setUploadedAssetId(filePath);
        setUploadedAssetName(file.name);
        setFormAlert({ type: "success", msg: "ZIP file template securely packaged to Supabase Storage!" });
      } else {
        const formData = new FormData();
        formData.append("templateZip", file);

        const res = await fetch("/api/upload-template", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setZipUploadStatus("success");
          setUploadedAssetId(data.githubAssetId);
          setUploadedAssetName(data.githubAssetName);
          setFormAlert({ type: "success", msg: "ZIP file template securely packaged to Release storage!" });
        } else {
          throw new Error(data.error || "Failed to upload file.");
        }
      }
    } catch (err: any) {
      setZipUploadStatus("error");
      setFormAlert({ type: "error", msg: err.message || "File upload streaming failed." });
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 4 - fImages.length;
    const toProcess = files.slice(0, remaining);

    toProcess.forEach((file: any) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFImages(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeScreenshot = (idx: number) => {
    setFImages(prev => (prev || []).filter((_, i) => i !== idx));
  };

  const handleVideoThumbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file: any = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setFThumb(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Keyboard dismiss and add tag chip handlers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !fTags.includes(val)) {
        setFTags(prev => [...prev, val]);
      }
      setTagInput("");
    }
  };

  const handleAddFeature = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = featInput.trim();
      if (val && !fFeatures.includes(val)) {
        setFFeatures(prev => [...prev, val]);
      }
      setFeatInput("");
    }
  };

  const handleAddSlideLabel = () => {
    setFSlides(prev => [...prev, `New screen label`]);
  };

  const handleRemoveSlideLabel = (idx: number) => {
    if ((fSlides || []).length <= 1) return;
    setFSlides(prev => (prev || []).filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async () => {
    if (!fName || !fDesc || !fTemplate) {
      setFormAlert({ type: "error", msg: "Please fill in Theme name, Template ID, and Description." });
      return;
    }

    if (zipUploadStatus !== "success" || !uploadedAssetName) {
      setFormAlert({ type: "error", msg: "Please upload the template ZIP file before saving." });
      return;
    }

    const industrySlug = fCat.toLowerCase().trim().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const builderUrl = `https://studio.lifehutsolutions.com/?industry=${industrySlug}&template=${fTemplate}&freeze=true`;

    const payload: Product = {
      id: editingProduct?.id || `p${Date.now()}`,
      name: fName,
      cat: fFCatOption || fCat,
      desc: fDesc,
      price: fPrice,
      oldprice: fOldPrice,
      template: fTemplate,
      badge: fBadge,
      color: fColor,
      mediatype: fMediaType,
      videourl: fVideoUrl,
      tags: fTags,
      features: fFeatures,
      slides: fSlides,
      images: fImages,
      thumb: fThumb,
      status: editingProduct?.status || "draft",
      githubAssetId: uploadedAssetId,
      githubAssetName: uploadedAssetName,
      broadcastNotification: broadcastNotification,
      updatedAt: new Date().toISOString()
    };

    try {
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .upsert(payload);
        if (error) throw error;

        showToast("Product saved successfully!");
        resetFormFields();
        onRefresh();
        setActiveTab("list");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast("Product saved successfully!");
          resetFormFields();
          onRefresh();
          setActiveTab("list");
        } else {
          const errData = await res.json();
          setFormAlert({ type: "error", msg: errData.error || "Failed to save product catalogue." });
        }
      }
    } catch (err: any) {
      setFormAlert({ type: "error", msg: err.message || "Server communication failed." });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setDeleteId(null);
    showToast("Processing product removal...");
    try {
      if (supabase) {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);
        if (error) throw error;

        showToast("Product permanently deleted.");
        onRefresh();
      } else {
        const res = await fetch(`/api/products/${id}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });

        if (res.ok) {
          showToast("Product permanently deleted.");
          onRefresh();
        } else {
          showToast("Failed to delete product.");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Server connection failed.");
    }
  };

  const handleSaveGistConfig = () => {
    if (!gitToken || !gitRepo) {
      setGitStatus({ type: "warn", msg: "Enter Token and Gist ID / Repo details." });
      return;
    }

    const config = { token: gitToken, repo: gitRepo, gistId: gitGistId };
    localStorage.setItem("ls-gist-override", JSON.stringify(config));
    setGitStatus({ type: "ok", msg: "Configuration stored in browser. Use Test to verify sync." });
  };

  const exportBackupJson = () => {
    if (safeProducts.length === 0) {
      showToast("No products in catalogue to backup.");
      return;
    }
    const blob = new Blob([JSON.stringify(safeProducts, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lifehut-studio-products-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast("Back-up JSON file created successfully!");
  };

  const migrateGistToSupabase = async () => {
    if (!supabase) {
      setMigrationStatus({ type: "error", msg: "Supabase integration keys are missing or not configured." });
      return;
    }
    setMigrationStatus({ type: "loading", msg: "Connecting to Gist and fetching catalogs..." });
    try {
      const res = await fetch("/api/products");
      if (!res.ok) {
        throw new Error(`Failed to fetch from local server backend (Status: ${res.status})`);
      }
      const localProducts = await res.json();
      if (!localProducts || localProducts.length === 0) {
        setMigrationStatus({ type: "error", msg: "No existing products found in Gist/local storage." });
        return;
      }
      
      setMigrationStatus({ type: "loading", msg: `Syncing ${localProducts.length} items to Supabase...` });
      
      const { error } = await supabase
        .from("products")
        .upsert(localProducts);
        
      if (error) throw error;
      
      setMigrationStatus({ type: "success", msg: `Successfully imported and synced ${localProducts.length} catalogues into your Supabase database!` });
      showToast("Gist catalogues successfully copied to Supabase!");
      onRefresh();
    } catch (err: any) {
      setMigrationStatus({ type: "error", msg: err.message || "Migration process failed." });
    }
  };

  const copyGeneratedHtml = () => {
    const cardHtml = `<!-- ${fName} Card Snippet -->
<article class="pcard" data-cat="${fCat.toLowerCase().trim().replace(/[^a-z0-9]/g, "")}">
  <div class="card-media">
    <div class="carousel" id="c${fTemplate}">
      <div class="carousel-track" id="ct${fTemplate}">
        <div class="carousel-slide"><img src="images/${fTemplate}-hero.jpg" alt="Hero"></div>
      </div>
    </div>
    <span class="media-tl badge-new">${fBadge}</span>
  </div>
  <div class="card-body">
    <h3 className="card-title">${fName}</h3>
    <p class="card-desc">${fDesc}</p>
    <div class="card-footer">
      <span class="price-now">₹${fPrice || "Free"}</span>
      <button class="btn-explore" onclick="openModal('${editingProduct?.id || "p_id"}')">Explore</button>
    </div>
  </div>
</article>`;

    navigator.clipboard.writeText(cardHtml).then(() => {
      showToast("Html snippet copied to clipboard! ✅");
    });
  };

  //Reviews Handling

  useEffect(() => {
  if (token && activeTab === "reviews") {
    loadReviews();
  }
}, [token, activeTab]);

  const loadReviews = async () => {
  setLoadingReviews(true);

  const { data } = await supabase
    .from("product_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  setReviews(data || []);
  setLoadingReviews(false);
};

const approveReview = async (id: string) => {
  await supabase
    .from("product_reviews")
    .update({
      status: "approved"
    })
    .eq("id", id);

  loadReviews();
};

const rejectReview = async (id: string) => {
  await supabase
    .from("product_reviews")
    .update({
      status: "rejected"
    })
    .eq("id", id);

  loadReviews();
};

const replyReview = async () => {
  if (!selectedReview || !developerReply.trim()) return;

  await supabase
    .from("review_replies")
    .insert({
      review_id: selectedReview.id,
      author: "Lifehut Team",
      text: developerReply,
      is_admin: true
    });

  setDeveloperReply("");
  loadReviews();
};

  // Custom visual list for datalist option helper
  const [fFCatOption, setFFCatOption] = useState<string>("");

  if (!token) {
    /* ══ LOGIN SCREEN UI ══ */
    return (
      <div className="login-screen fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0a1628] via-[#1a3a6e] to-[#1e4db7] text-[#0f1923]">
        <div className="login-box w-full max-w-[400px] bg-white rounded-2xl p-8 md:p-10 shadow-2xl">
          <div className="login-logo flex items-center gap-3 mb-6">
            <div className="login-logo-icon flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white text-xl shadow-md">
              <i className="ti ti-layout-grid"></i>
            </div>
            <div>
              <div className="login-logo-name font-bold text-slate-900 text-base md:text-lg">
                Lifehut <span className="text-blue-600">Studio™</span>
              </div>
              <div className="login-logo-sub text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Portal Auth
              </div>
            </div>
          </div>

          <h2 className="login-title text-xl font-bold tracking-tight text-slate-800">Admin Entrance</h2>
          <p className="login-sub text-xs text-slate-500 mt-1 mb-6">
            Input master credentials to orchestrate templates and release packages.
          </p>

          {loginError && (
            <div className="login-error bg-rose-50 text-rose-800 border border-rose-200 text-xs px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <i className="ti ti-alert-circle text-base"></i>
              <span>{loginError}</span>
            </div>
          )}

          <div className="login-field mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email address</label>
            <input
              type="email"
              placeholder="admin@lifehutsolutions.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
            />
          </div>

          <div className="login-field mb-4 relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter master key"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600"
              type="button"
            >
              <i className={showPassword ? "ti ti-eye-off text-base" : "ti ti-eye text-base"}></i>
            </button>
          </div>

          <button
            onClick={handleLogin}
            className="login-btn w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 font-semibold text-white rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ti ti-login"></i> Validate & Authenticate
          </button>

          <button
            onClick={onNavigateToStore}
            className="w-full mt-2 py-3.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ti ti-arrow-left"></i> Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app flex h-screen overflow-hidden bg-slate-100 text-[#0f1923] font-sans">
      
      {/* ── SIDEBAR ── */}
      <aside className="sidebar w-64 bg-[#0a1628] flex-shrink-0 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="sb-brand flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
            <div className="sb-logo h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-base">
              <i className="ti ti-layout-grid"></i>
            </div>
            <div>
              <div className="sb-name text-xs md:text-sm font-semibold text-white">Lifehut Studio™</div>
              <div className="sb-sub text-[9px] text-white/40">Product Catalogue Manager</div>
            </div>
          </div>

          <div className="sb-section mt-6 px-6 text-[9px] uppercase font-bold tracking-widest text-white/30">Catalogue</div>
          <button
            onClick={() => { setActiveTab("list"); resetFormFields(); }}
            className={`sb-link flex items-center gap-2 px-6 py-3 w-full text-xs font-medium border-0 transition-all cursor-pointer ${
              activeTab === "list" ? "bg-blue-600/35 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <i className="ti ti-layout-grid"></i> All Templates
            <span className="sb-count ml-auto text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">{safeProducts.length}</span>
          </button>
          <button
            onClick={startAddProduct}
            className={`sb-link flex items-center gap-2 px-6 py-3 w-full text-xs font-medium border-0 transition-all cursor-pointer ${
              activeTab === "form" && !editingProduct ? "bg-blue-600/35 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <i className="ti ti-plus"></i> Add New Template
          </button>

          {/* ===== Reviews ===== */}

<button
  onClick={() => setActiveTab("reviews")}
  className={`sb-link flex items-center gap-2 px-6 py-3 w-full text-xs font-medium border-0 transition-all cursor-pointer ${
    activeTab === "reviews"
      ? "bg-blue-600/35 text-white"
      : "text-white/60 hover:bg-white/5 hover:text-white"
  }`}
>
  <i className="ti ti-message-star"></i>
  Reviews
</button>

{/* ===== Reviews Ends===== */}

          <hr className="sb-divider border-white/5 my-4" />
          <div className="sb-section px-6 text-[9px] uppercase font-bold tracking-widest text-white/30">Settings</div>
          <button
            onClick={() => setActiveTab("settings")}
            className={`sb-link flex items-center gap-2 px-6 py-3 w-full text-xs font-medium border-0 transition-all cursor-pointer ${
              activeTab === "settings" ? "bg-blue-600/35 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <i className="ti ti-settings"></i> GitHub Gist sync
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`sb-link flex items-center gap-2 px-6 py-3 w-full text-xs font-medium border-0 transition-all cursor-pointer ${
              activeTab === "help" ? "bg-blue-600/35 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <i className="ti ti-help"></i> How to use
          </button>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/5">
          <div className="live-indicator flex items-center gap-1.5 text-[10px] text-white/50 mb-4 font-semibold">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            {safeProducts.filter(p => p && p.status === "live").length} templates live
          </div>
          <button
            onClick={handleBatchGoLive}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
          >
            <i className="ti ti-rocket"></i> Batch Publish (Live)
          </button>
          <button
            onClick={exportBackupJson}
            className="w-full mt-2 py-2.5 border border-white/10 hover:bg-white/5 text-white/70 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <i className="ti ti-download"></i> Export catalogue
          </button>
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2.5 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
          >
            <i className="ti ti-logout"></i> Log out Portal
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="main flex-1 flex flex-col overflow-hidden">
        
        {/* Topbar */}
        <header className="topbar h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="tb-title font-semibold text-slate-800 text-sm md:text-base capitalize flex items-center gap-2">
            <i className="ti ti-layout"></i>
            {
activeTab === "list"
? "Active Catalogue"
: activeTab === "form"
? (editingProduct ? "Edit Template Configuration" : "Add New Template")
: activeTab === "reviews"
? "Customer Reviews"
: activeTab === "settings"
? "GitHub Storage Sync"
: "Manager Instructions"
}
          </div>
          <div className="tb-right flex items-center gap-3">
            <button
              onClick={onNavigateToStore}
              className="btn-outline flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:text-blue-500 px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <i className="ti ti-eye"></i> Live storefront
            </button>
            {activeTab === "list" ? (
              <button
                onClick={startAddProduct}
                className="btn-primary flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <i className="ti ti-plus"></i> Add template
              </button>
            ) : activeTab === "form" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveTab("list"); resetFormFields(); }}
                  className="btn-outline flex items-center gap-1 px-4 py-2 text-xs rounded-lg border border-slate-200 cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProduct}
                  className="btn-primary flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  <i className="ti ti-device-floppy"></i> Save product
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {/* Content Panel Scroll area */}
        <div className="content flex-1 overflow-y-auto p-6 bg-slate-50">

          {/* LIST VIEW PANEL */}
          {activeTab === "list" && (
            <div className="panel active">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="animate-spin text-3xl text-blue-600 mb-3"><i className="ti ti-loader-2"></i></div>
                  <div className="text-xs text-slate-500 font-medium">Reading secure products database...</div>
                </div>
              ) : safeProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-500 bg-white">
                  <i className="ti ti-box-off text-4xl mb-4 opacity-40 block"></i>
                  <div className="text-sm font-semibold">No active templates found</div>
                  <p className="text-xs mt-1 max-w-sm mx-auto">Click below to start cataloging your premium templates.</p>
                  <button
                    onClick={startAddProduct}
                    className="mt-6 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Add Product Form
                  </button>
                </div>
              ) : (
                <div className="product-table bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Head */}
                  <div className="pt-head grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-6 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <div className="col-span-4">Product Details</div>
                    <div className="col-span-2">Sync Status</div>
                    <div className="col-span-2">Release File</div>
                    <div className="col-span-2">Price Tag</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {/* Body rows */}
                  <div className="divide-y divide-slate-100">
                    {safeProducts.map(p => (
                      <div key={p.id} className="pt-row grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-slate-50/50 transition-all text-xs">
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="h-8 w-11 rounded bg-slate-100 border flex items-center justify-center text-blue-600 text-sm font-semibold">
                            <i className="ti ti-layout"></i>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{p.cat}</div>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            p.status === "live" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${p.status === "live" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {p.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="col-span-2 truncate text-slate-500 font-mono text-[10px]">
                          {p.githubAssetName ? (
                            <span className="flex items-center gap-1 text-blue-600"><i className="ti ti-file-zip"></i> {p.githubAssetName}</span>
                          ) : (
                            <span className="text-slate-400">No file uploaded</span>
                          )}
                        </div>

                        <div className="col-span-2 font-semibold text-slate-800">
                          {p.price ? `₹${Number(p.price).toLocaleString("en-IN")}` : "Free"}
                          {p.oldprice && <div className="text-[10px] text-slate-400 line-through font-normal">₹{Number(p.oldprice).toLocaleString("en-IN")}</div>}
                        </div>

                        <div className="col-span-2 flex justify-end gap-1.5">
                          {p.status === "live" ? (
                            <button
                              onClick={() => handlePublishStatus(p, "draft")}
                              className="act-btn text-[10px] text-slate-500 hover:text-slate-800 bg-white border px-2 py-1 rounded"
                            >
                              <i className="ti ti-eye-off"></i> Draft
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublishStatus(p, "live")}
                              className="act-btn text-[10px] text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded font-bold"
                            >
                              <i className="ti ti-rocket"></i> Publish
                            </button>
                          )}
                          <button
                            onClick={() => startEditProduct(p)}
                            className="act-btn text-blue-600 hover:bg-blue-50 p-1.5 rounded border"
                            title="Edit"
                          >
                            <i className="ti ti-pencil"></i>
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="act-btn text-rose-600 hover:bg-rose-50 p-1.5 rounded border"
                            title="Delete"
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS PANEL */}

{activeTab === "reviews" && (

<div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

<div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">

<h2 className="font-semibold text-slate-800">

Customer Reviews

</h2>

<button

onClick={loadReviews}

className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"

>

Refresh

</button>

</div>

{loadingReviews ? (

<div className="p-12 text-center">

Loading Reviews...

</div>

) : (

<table className="w-full text-sm">

<thead className="bg-slate-50">

<tr>

<th className="p-3 text-left">Customer</th>

<th className="p-3 text-left">Product</th>

<th className="p-3 text-left">Rating</th>

<th className="p-3 text-left">Tag</th>

<th className="p-3 text-left">Status</th>

<th className="p-3 text-right">Action</th>

</tr>

</thead>

<tbody>

{reviews.map((review)=>(

<tr

key={review.id}

className="border-t"

>

<td className="p-3">

<div className="font-semibold">

{review.author}

</div>

<div className="text-xs text-slate-500">

{review.comment}

</div>

</td>

<td className="p-3">

{review.product_id}

</td>

<td className="p-3">

{"⭐".repeat(review.rating)}

</td>

<td className="p-3">

{review.tag}

</td>

<td className="p-3">

{review.status}

</td>

<td className="p-3 text-right space-x-2">

<button

onClick={()=>approveReview(review.id)}

className="px-3 py-1 rounded bg-green-600 text-white text-xs"

>

Approve

</button>

<button

onClick={()=>rejectReview(review.id)}

className="px-3 py-1 rounded bg-red-600 text-white text-xs"

>

Reject

</button>

</td>

</tr>

))}

</tbody>

</table>

)}

</div>

)}

          {/* ADD / EDIT CREATION FORM PANEL */}
          {activeTab === "form" && (
            <div className="panel">
              {formAlert && (
                <div className={`alert p-4 rounded-xl mb-6 text-xs flex items-center gap-2 ${
                  formAlert.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                  formAlert.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-200" :
                  "bg-blue-50 text-blue-800 border border-blue-200"
                }`}>
                  <i className="ti ti-alert-circle text-base"></i>
                  <span>{formAlert.msg}</span>
                </div>
              )}

              <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
                
                {/* Left controls Column */}
                <div className="w-full lg:flex-1 min-w-0 flex flex-col gap-6">
                  
                  {/* Basic information */}
                  <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                      <i className="ti ti-info-circle text-blue-500"></i> Basic Information
                    </h3>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Theme name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={fName}
                        onChange={e => setFName(e.target.value)}
                        placeholder="e.g. SaaS Launch Pro"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category <span className="text-rose-500">*</span></label>
                        <select
                          value={fCat}
                          onChange={e => setFCat(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                        >
                          <option value="SaaS / Startup">SaaS / Startup</option>
                          <option value="Portfolio">Portfolio</option>
                          <option value="Agency">Agency</option>
                          <option value="Business">Business</option>
                          <option value="E-Commerce">E-Commerce</option>
                          <option value="Restaurant">Restaurant</option>
                          <option value="Personal Brand">Personal Brand</option>
                          <option value="Education">Education</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Event / Wedding">Event / Wedding</option>
                          <option value="NGO / Non-Profit">NGO / Non-Profit</option>
                          <option value="custom">-- Custom category --</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom Category Option</label>
                        <input
                          type="text"
                          value={fFCatOption}
                          onChange={e => setFFCatOption(e.target.value)}
                          placeholder="Type if custom..."
                          disabled={fCat !== "custom"}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">Template ID Slug <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={fTemplate}
                        onChange={e => setFTemplate(e.target.value)}
                        placeholder="e.g. apex-classic, nova-pro"
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                      />
                      <div className="field-hint text-[10px] text-slate-400 mt-1">Slick lowercase identifier for generated customization links.</div>
                    </div>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">Generated Customize URL</label>
                      <input
                        type="text"
                        readOnly
                        value={fTemplate ? `https://studio.lifehutsolutions.com/?industry=${(fFCatOption || fCat || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}&template=${fTemplate}&freeze=true` : "Enter Template ID Slug above to generate URL"}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-400 bg-slate-100 cursor-not-allowed"
                      />
                    </div>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description <span className="text-rose-500">*</span></label>
                      <textarea
                        value={fDesc}
                        onChange={e => setFDesc(e.target.value)}
                        placeholder="Detailed presentation description..."
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50 h-24 resize-y"
                      ></textarea>
                    </div>
                  </div>

                  {/* Packaging Template Files */}
                  <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                      <i className="ti ti-file-zip text-emerald-500"></i> Packaging Release Files (.zip)
                    </h3>

                    <div className="field">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Upload Template Bundle Zip <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-4">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl px-4 py-6 bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-500 flex-1 transition-all">
                          <i className="ti ti-cloud-upload text-3xl text-slate-400 mb-1"></i>
                          <span className="text-xs font-semibold text-slate-700">
                            {zipFile ? zipFile.name : "Select Template ZIP Folder"}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">Upload files up to 100MB</span>
                          <input
                            type="file"
                            accept=".zip"
                            onChange={handleZipUpload}
                            className="hidden"
                          />
                        </label>

                        {zipUploadStatus !== "idle" && (
                          <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center w-40 h-28 text-xs ${
                            zipUploadStatus === "uploading" ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse" :
                            zipUploadStatus === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            "bg-rose-50 text-rose-700 border-rose-100"
                          }`}>
                            <i className={`ti ${
                              zipUploadStatus === "uploading" ? "ti-loader-2 animate-spin" :
                              zipUploadStatus === "success" ? "ti-circle-check text-xl" :
                              "ti-alert-circle text-xl"
                            } mb-1`}></i>
                            <div className="font-semibold text-[10px]">
                              {zipUploadStatus === "uploading" ? "Uploading to Cloud..." :
                               zipUploadStatus === "success" ? "Ready to Stream!" :
                               "Upload Failed!"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing and badges */}
                  <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                      <i className="ti ti-currency-rupee text-amber-500"></i> Pricing & Promotions
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sale Price (INR)</label>
                        <input
                          type="number"
                          value={fPrice}
                          onChange={e => setFPrice(e.target.value)}
                          placeholder="e.g. 1499"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                        />
                        <div className="field-hint text-[10px] text-slate-400 mt-1">Leave blank or set to 0 for free claim downloads.</div>
                      </div>

                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Original Price (INR)</label>
                        <input
                          type="number"
                          value={fOldPrice}
                          onChange={e => setFOldPrice(e.target.value)}
                          placeholder="e.g. 2999"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Highlight badge</label>
                      <div className="badge-picker flex gap-2 flex-wrap">
                        {(["New", "Hot", "Free", ""] as ProductBadge[]).map(badge => (
                          <button
                            key={badge}
                            onClick={() => setFBadge(badge)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                              fBadge === badge
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            {badge || "None"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Aesthetics and uploads */}
                  <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                      <i className="ti ti-palette text-violet-500"></i> Aesthetics & Assets Previews
                    </h3>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Visual Gradient Canvas</label>
                      <div className="color-swatches flex gap-2 flex-wrap">
                        {COLOR_GRADIENTS.map(sw => (
                          <button
                            key={sw.name}
                            style={{ background: sw.value }}
                            title={sw.name}
                            onClick={() => setFColor(sw.value)}
                            className={`h-8 w-8 rounded-lg border-2 cursor-pointer transition-all relative ${
                              fColor === sw.value ? "border-white ring-2 ring-blue-600" : "border-transparent"
                            }`}
                          >
                            {fColor === sw.value && (
                              <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Media Preview Format</label>
                      <select
                        value={fMediaType}
                        onChange={e => setFMediaType(e.target.value as MediaType)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                      >
                        <option value="carousel">Image Screenshots Carousel</option>
                        <option value="video">Walkthrough Video File</option>
                      </select>
                    </div>

                    {fMediaType === "carousel" ? (
                      /* IMAGES UPLOAD SCREEN */
                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Screenshots (Maximum 4 images)
                        </label>
                        <div className="flex flex-col gap-3">
                          <label className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-500 cursor-pointer">
                            <i className="ti ti-photo-up text-2xl text-slate-400"></i>
                            <span className="text-xs font-semibold mt-1">Upload screenshot files</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleScreenshotUpload}
                              className="hidden"
                            />
                          </label>

                          <div className="flex gap-2 flex-wrap">
                            {fImages.map((img, i) => (
                              <div key={i} className="relative h-14 w-20 border rounded overflow-hidden flex-shrink-0 bg-slate-100">
                                <img src={img} className="w-full h-full object-cover" alt="" />
                                <button
                                  onClick={() => removeScreenshot(i)}
                                  className="absolute top-1 right-1 h-4 w-4 bg-black/60 hover:bg-rose-600 rounded-full text-white text-[10px] flex items-center justify-center border-0"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Slides list */}
                        <div className="mt-4">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Slide labels</label>
                          <div className="flex flex-col gap-2">
                            {fSlides.map((slide, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  type="text"
                                  value={slide}
                                  onChange={e => {
                                    const next = [...fSlides];
                                    next[i] = e.target.value;
                                    setFSlides(next);
                                  }}
                                  className="flex-1 px-3 py-2 rounded-lg border text-xs"
                                />
                                <button
                                  onClick={() => handleRemoveSlideLabel(i)}
                                  className="p-2 text-rose-500 border border-slate-200 rounded-lg hover:bg-rose-50"
                                >
                                  <i className="ti ti-trash"></i>
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={handleAddSlideLabel}
                              className="w-full py-2 bg-slate-100 text-slate-600 border border-dashed rounded-lg text-xs"
                            >
                              Add Screen Slide label
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* VIDEO WALKTHROUGH */
                      <div className="field">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Walkthrough Video Link (Direct MP4 or YouTube embed)</label>
                        <input
                          type="url"
                          value={fVideoUrl}
                          onChange={e => setFVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/embed/xxx"
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                        />

                        {/* Video thumbnail */}
                        <div className="mt-4">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Video thumbnail image (optional)</label>
                          <label className="border border-dashed p-4 rounded-lg bg-slate-50 flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 text-xs">
                            <i className="ti ti-photo text-lg"></i> Select Thumbnail Image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleVideoThumbUpload}
                              className="hidden"
                            />
                          </label>
                          {fThumb && (
                            <div className="relative h-16 w-24 rounded border overflow-hidden mt-2">
                              <img src={fThumb} className="w-full h-full object-cover" alt="" />
                              <button
                                onClick={() => setFThumb("")}
                                className="absolute top-1 right-1 h-4 w-4 bg-black/60 rounded-full text-white text-[10px] flex items-center justify-center border-0"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist and tags */}
                  <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                      <i className="ti ti-tags text-rose-500"></i> Metadata Features & Tags
                    </h3>

                    <div className="field mb-4">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Card tags (Press Enter to add)</label>
                      <div className="tags-wrap flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[40px] bg-slate-50 items-center">
                        {fTags.map((t, idx) => (
                          <span key={t} className="bg-blue-50 text-blue-800 font-semibold px-2 py-1 rounded text-[11px] flex items-center gap-1">
                            {t}
                            <button onClick={() => setFTags(prev => (prev || []).filter((_, i) => i !== idx))} className="text-blue-500 font-bold hover:text-blue-800">×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Add card tag..."
                          className="flex-1 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">✓ Checklist features (Press Enter to add)</label>
                      <div className="tags-wrap flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[40px] bg-slate-50 items-center">
                        {fFeatures.map((f, idx) => (
                          <span key={f} className="bg-emerald-50 text-emerald-800 font-semibold px-2 py-1 rounded text-[11px] flex items-center gap-1">
                            {f}
                            <button onClick={() => setFFeatures(prev => (prev || []).filter((_, i) => i !== idx))} className="text-emerald-500 font-bold hover:text-emerald-800">×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={featInput}
                          onChange={e => setFeatInput(e.target.value)}
                          onKeyDown={handleAddFeature}
                          placeholder="Add modal feature..."
                          className="flex-1 outline-none text-xs bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Live card preview Column */}
                <div className="w-full lg:w-[350px] shrink-0 lg:sticky lg:top-6">
                  <div className="flex flex-col gap-4">
                    <div className="p-3 bg-slate-100 rounded-xl font-semibold text-slate-600 text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200">
                      <i className="ti ti-eye text-blue-500"></i> Real-time preview card
                    </div>
                    
                    {/* PCard container */}
                    <div className="pcard flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 w-full">
                      <div className="relative h-52 bg-slate-50 w-full flex items-center justify-center text-slate-400">
                        {fImages[0] ? (
                          <img src={fImages[0]} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div style={{ background: fColor || "linear-gradient(135deg, #0f172a, #1e3a8a)" }} className="w-full h-full flex flex-col items-center justify-center text-white/80 p-4">
                            <i className="ti ti-photo text-3xl opacity-50 mb-2"></i>
                            <span className="text-[11px] font-semibold tracking-wider uppercase text-center">{fSlides[0] || "Theme Preview"}</span>
                          </div>
                        )}
                        {fBadge && (
                          <span className={`media-tl absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase ${
                            fBadge === "New" ? "bg-amber-100 text-amber-800" :
                            fBadge === "Hot" ? "bg-rose-100 text-rose-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {fBadge}
                          </span>
                        )}
                        <button
                          className="wish-btn absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm hover:scale-110 cursor-pointer text-sm border-0"
                          aria-label="Add to Wishlist"
                        >
                          <i className="ti ti-heart"></i>
                        </button>
                        <div className="media-pill absolute bottom-3 right-3 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white flex items-center gap-1.5">
                          <i className={fMediaType === "video" ? "ti ti-video" : "ti ti-photo"}></i>
                          {fMediaType === "video" ? "Walkthrough" : `${fSlides.length} Screens`}
                        </div>
                      </div>

                      <div className="card-body p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="card-top flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="card-cat text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                {fFCatOption || fCat}
                              </div>
                              <h3 className="card-title text-base font-bold text-slate-800 mt-1 line-clamp-1">
                                {fName || "Sample Template Name"}
                              </h3>
                            </div>
                            <div className="card-stars flex items-center text-xs text-amber-500 whitespace-nowrap">
                              <i className="ti ti-star-filled"></i>
                              <i className="ti ti-star-filled"></i>
                              <i className="ti ti-star-filled"></i>
                              <i className="ti ti-star-filled"></i>
                              <i className="ti ti-star-filled"></i>
                              <span className="text-[10px] text-slate-400 ml-1">(5.0)</span>
                            </div>
                          </div>

                          <p className="card-desc text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                            {fDesc || "Detailed presentation description of your product theme template..."}
                          </p>

                          <div className="card-tags flex flex-wrap gap-1 mb-4">
                            {fTags.length > 0 ? (
                              fTags.slice(0, 3).map(tag => (
                                <span key={tag} className="card-tag rounded bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="card-tag rounded bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5">SaaS</span>
                                <span className="card-tag rounded bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5">Clean</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="card-footer flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
                          <div className="flex items-baseline">
                            {fPrice && parseFloat(fPrice) > 0 ? (
                              <>
                                <span className="price-now text-lg font-bold text-slate-800">
                                  ₹{Number(fPrice).toLocaleString("en-IN")}
                                </span>
                                {fOldPrice && parseFloat(fOldPrice) > 0 && (
                                  <>
                                    <span className="price-was text-xs text-slate-400 text-decoration-line-through ml-2 line-through">
                                      ₹{Number(fOldPrice).toLocaleString("en-IN")}
                                    </span>
                                    <span className="price-save text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 ml-2">
                                      {Math.round((1 - parseFloat(fPrice) / parseFloat(fOldPrice)) * 100)}% OFF
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="price-free-lbl text-base font-bold text-emerald-600">
                                Free
                              </span>
                            )}
                          </div>

                          <button className="btn-explore rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 transition-all cursor-pointer border-0">
                            <i className="ti ti-eye"></i> Explore
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Developer raw html copier */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-slate-700">Developer card HTML code</div>
                        <button
                          onClick={copyGeneratedHtml}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] px-2.5 py-1 rounded"
                        >
                          Copy raw HTML
                        </button>
                      </div>
                      <div className="bg-slate-900 rounded p-3 overflow-x-auto max-h-36">
                        <pre className="text-[10px] text-slate-300 font-mono">
                          {`<!-- ${fName} -->
<article class="pcard">
  ...
</article>`}
                        </pre>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* GITHUB STORAGE SYNC SETTINGS */}
          {activeTab === "settings" && (
            <div className="panel">
              <div className="max-w-xl">
                {gitStatus.type !== "idle" && (
                  <div className={`p-4 rounded-xl mb-4 text-xs flex items-center gap-2 ${
                    gitStatus.type === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                    gitStatus.type === "err" ? "bg-rose-50 text-rose-800 border border-rose-200" :
                    gitStatus.type === "loading" ? "bg-blue-50 text-blue-800 border border-blue-200 animate-pulse" :
                    "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    <i className="ti ti-info-circle text-base"></i>
                    <span>{gitStatus.msg}</span>
                  </div>
                )}

                <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                    <i className="ti ti-brand-github text-slate-800"></i> GitHub Gist & Releases Sync
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Your template catalog and `.zip` build packages are stored securely inside your private GitHub Gist database and releases repository.
                  </p>

                  <div className="field mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={gitToken}
                      onChange={e => setGitToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50 font-mono"
                    />
                    <div className="field-hint text-[10px] text-slate-400 mt-1">Requires classic token with <strong>gist</strong> and <strong>repo</strong> permissions ticked.</div>
                  </div>

                  <div className="field mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">GitHub Repository name</label>
                    <input
                      type="text"
                      value={gitRepo}
                      onChange={e => setGitRepo(e.target.value)}
                      placeholder="e.g. owner/repo"
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50"
                    />
                  </div>

                  <div className="field mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Optional Database Gist ID</label>
                    <input
                      type="text"
                      value={gitGistId}
                      onChange={e => setGitGistId(e.target.value)}
                      placeholder="e.g. 3d4f8a9b2c..."
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none text-xs text-slate-800 bg-slate-50 font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveGistConfig}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>

                <div className="form-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-6">
                  <h3 className="form-card-title text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b flex items-center gap-1.5">
                    <i className="ti ti-refresh text-blue-500"></i> Catalogue Sync & Backup Controls
                  </h3>
                  <button
                    onClick={exportBackupJson}
                    className="w-full py-3 bg-[#1f2937] hover:bg-[#111827] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mb-3"
                  >
                    <i className="ti ti-download"></i> Download Products database (.json)
                  </button>

                  {supabase && (
                    <div className="pt-3 border-t border-slate-100 mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Supabase Data Migration</div>
                      <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                        If your templates exist inside your GitHub Gist database but are not yet imported to Supabase, click below to clone them over instantly.
                      </p>
                      <button
                        onClick={migrateGistToSupabase}
                        disabled={migrationStatus.type === "loading"}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <i className="ti ti-database-import"></i> Sync Gist catalogues to Supabase
                      </button>
                      
                      {migrationStatus.type !== "idle" && (
                        <div className={`mt-2.5 p-2.5 rounded-lg text-[11px] leading-relaxed ${
                          migrationStatus.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                          migrationStatus.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-100" :
                          "bg-blue-50 text-blue-800 border border-blue-100 animate-pulse"
                        }`}>
                          {migrationStatus.msg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTATION HELP PANEL */}
          {activeTab === "help" && (
            <div className="panel max-w-2xl bg-white border rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b">How to Orchestrate Templates Catalogue</h3>
              <div className="text-xs text-slate-600 leading-relaxed space-y-4">
                <p>
                  <strong>1. Setup credentials:</strong> In the Gist sync settings tab, save your personal token and designated releases repository. If empty, the backend stores files locally in your server sandbox.
                </p>
                <p>
                  <strong>2. Adding new themes:</strong> Set a name, template ID slug, short marketing copy, card color swatches, and some features. Upload the finished template build zip file directly. It will package securely into releases.
                </p>
                <p>
                  <strong>3. Moving items back and forth:</strong> Change status toggles instantly from the catalog. Click Batch Publish to move all catalog items live instantly on the storefront.
                </p>
                <p>
                  <strong>4. High-contrast security download:</strong> Paid items prompt a secure checkout flow using Razorpay. Once signed, the backend streams the releases file back to the visitor, completely cloaking the download destination.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CONFIRM DELETE DIALOG DIALOG */}
      {deleteId && (
        <div className="confirm-bg fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="confirm-box bg-white rounded-xl p-6 w-80 shadow-2xl text-center border">
            <div className="confirm-icon h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto mb-4">
              <i className="ti ti-trash"></i>
            </div>
            <h4 className="confirm-title text-slate-800 font-bold text-sm">Delete template catalog?</h4>
            <p className="confirm-sub text-slate-400 text-xs mt-2 mb-6">This item and its associated release file will be permanently removed.</p>
            <div className="confirm-btns flex gap-2 justify-center">
              <button onClick={() => setDeleteId(null)} className="btn-cancel px-4 py-2 border rounded-lg text-xs font-medium bg-white hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button onClick={() => handleDeleteProduct(deleteId)} className="btn-confirm-del px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer">Delete Item</button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TOAST INDICATOR */}
      {toastMsg && (
        <div className="toast fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 z-[200] shadow-lg animate-bounce">
          <i className="ti ti-circle-check text-emerald-400 text-base"></i>
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
