import { useState, useEffect } from "react";
import { Product } from "./types";
import StoreFront from "./components/StoreFront";
import ProductManager from "./components/ProductManager";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [view, setView] = useState<"store" | "admin">("store");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Sync state with URL query parameters and pathnames for neat routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    const path = window.location.pathname.toLowerCase();

    if (
      viewParam === "admin" ||
      viewParam === "manager" ||
      path.endsWith("/admin") ||
      path.endsWith("/manager") ||
      path.endsWith("/product-manager") ||
      path.endsWith("/product_manager") ||
      path.includes("/admin/") ||
      path.includes("/manager/") ||
      path.includes("/product-manager/") ||
      path.includes("/product_manager/")
    ) {
      setView("admin");
    } else {
      setView("store");
    }

    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("updatedAt", { ascending: false });
        if (error) {
          if (error.code === "42P01") {
            setDbError("Table 'public.products' does not exist in your Supabase database. Please copy the schema from 'supabase-setup.sql' and execute it in your Supabase SQL Editor.");
          } else {
            setDbError(`Supabase Database Error: ${error.message} (Code ${error.code})`);
          }
          throw error;
        }
        setProducts(data || []);
      } else {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      }
    } catch (err: any) {
      console.error("Failed to load products list:", err);
      if (!supabase) {
        setDbError("Unable to load product catalogue. Is the backend server running?");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToView = (nextView: "store" | "admin") => {
    setView(nextView);
    const params = new URLSearchParams(window.location.search);
    if (nextView === "admin") {
      params.set("view", "admin");
    } else {
      params.delete("view");
    }
    // Update browser URL without refreshing
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  return (
    <>
      {dbError && (
        <div className="bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 py-3 px-4 text-xs md:text-sm text-center font-sans tracking-wide">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>⚠️ <strong>Configuration Alert:</strong> {dbError}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText("supabase-setup.sql");
                alert("Please see the 'supabase-setup.sql' file in the root directory for the script!");
              }}
              className="underline hover:no-underline font-medium ml-1"
            >
              Learn how to fix
            </button>
          </div>
        </div>
      )}
      {view === "store" ? (
        <StoreFront
          products={products}
          isLoading={isLoading}
          onRefresh={fetchProducts}
          onNavigateToManager={() => handleNavigateToView("admin")}
        />
      ) : (
        <ProductManager
          products={products}
          isLoading={isLoading}
          onRefresh={fetchProducts}
          onNavigateToStore={() => handleNavigateToView("store")}
        />
      )}
    </>
  );
}
