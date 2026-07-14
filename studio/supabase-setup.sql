-- ==========================================================
-- Supabase Database Schema & Storage Configuration
-- Copy and run this script in your Supabase SQL Editor
-- ==========================================================

-- 1. Create the Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cat TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  price TEXT DEFAULT '0',
  oldprice TEXT,
  template TEXT NOT NULL,
  badge TEXT DEFAULT 'New',
  color TEXT,
  mediatype TEXT DEFAULT 'image',
  videourl TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  slides JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  thumb TEXT,
  status TEXT DEFAULT 'draft',
  "githubAssetId" TEXT,
  "githubAssetName" TEXT,
  "updatedAt" TEXT
);

-- Enable Row Level Security (RLS) on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create Policies for Products Table
-- Anyone can view live products (Storefront view)
CREATE POLICY "Allow public read access to live products" ON public.products
  FOR SELECT USING (status = 'live' OR TRUE); -- Change to status = 'live' if you want to hide drafts from public storefront

-- Authenticated admins can perform any operation (Insert, Update, Delete)
CREATE POLICY "Allow authenticated admins full access" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. Configure Storage Buckets
-- Ensure that the 'templates' storage bucket is created
-- If your Supabase environment supports pg_net or custom extensions, you can run:
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Public read policies for 'templates' storage bucket so customers can download ZIPs
CREATE POLICY "Public Access for Template Downloads" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'templates');

-- Authenticated admins can upload files to 'templates' bucket
CREATE POLICY "Admin Uploads to Template Storage" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Admin Deletions from Template Storage" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'templates');
