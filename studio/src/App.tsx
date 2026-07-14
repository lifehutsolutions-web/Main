import { useState, useEffect } from "react";
import { Product } from "./types";
import StoreFront from "./components/StoreFront";
import ProductManager from "./components/ProductManager";

export default function App() {
  const [view, setView] = useState<"store" | "admin">("store");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to load products list:", err);
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
