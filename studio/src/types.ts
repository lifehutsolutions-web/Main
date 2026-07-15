export type ProductBadge = 'New' | 'Hot' | 'Free' | '';
export type MediaType = 'carousel' | 'video';
export type ProductStatus = 'draft' | 'live';

export interface Product {
  id: string;
  name: string;
  cat: string;
  desc: string;
  price: string; // empty string or numeric string
  oldprice: string; // empty string or numeric string
  template: string; // template slug or ID
  badge: ProductBadge;
  color: string; // background gradient CSS
  mediatype: MediaType;
  videourl?: string;
  tags: string[]; // card tags
  features: string[]; // modal features checklist
  slides: string[]; // carousel slide labels
  images: string[]; // base64 images
  thumb?: string; // base64 video thumbnail
  status: ProductStatus;
  githubAssetId?: string | number; // references release asset on GitHub
  githubAssetName?: string; // the filename uploaded
  genurl?: string; // optional live customization url
  updatedAt: string;
}

export interface AdminSession {
  token: string;
  email: string;
}
