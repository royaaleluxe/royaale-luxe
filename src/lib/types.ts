import type { District, OrderStatus, ProductSize } from "./constants";



export interface StockVariant {

  color: string;

  colorHex: string;

  size: ProductSize;

  quantity: number;

  /** Product image URL for this color (shared across sizes of the same color). */

  image?: string;

}



export interface Product {

  id: string;

  title: string;

  description: string;

  images: string[];

  altImages?: string[];

  /** Alt text per image URL for accessibility */

  imageAlts?: Record<string, string>;

  price: number;

  originalPrice?: number;

  category: string;

  variants: StockVariant[];

  featured?: boolean;

  bestseller?: boolean;

  newArrival?: boolean;

  createdAt?: string;

}



export interface CartItem {

  productId: string;

  title: string;

  image: string;

  price: number;

  color: string;

  colorHex: string;

  size: ProductSize;

  quantity: number;

}



export interface SavedAddress {

  id: string;

  label?: string;

  district: District;

  community: string;

  directions: string;

  phone: string;

  isDefault?: boolean;

}



export interface BackInStockAlert {

  productId: string;

  color: string;

  size: ProductSize;

  createdAt: string;

}



export interface UserNotification {

  id: string;

  message: string;

  read: boolean;

  createdAt: string;

}



export interface UserProfile {

  uid: string;

  firstName: string;

  lastName: string;

  email: string;

  phoneNumber: string;

  savedWishlist: string[];

  savedCart?: CartItem[];

  savedAddresses?: SavedAddress[];

  backInStockAlerts?: BackInStockAlert[];

  orderHistory: string[];

  notifications: UserNotification[];

  disabled?: boolean;

  adminNotes?: string;

}



export interface DeliveryInfo {

  district: District;

  community: string;

  directions: string;

  phone: string;

}



export interface Order {

  id: string;

  orderId: string;

  userId: string;

  userEmail: string;

  userName: string;

  items: CartItem[];

  subtotal: number;

  deliveryFee: number;

  discount: number;

  total: number;

  delivery: DeliveryInfo;

  bankId: string;

  receiptUrl?: string;

  status: OrderStatus;

  couponCode?: string;

  internalNotes?: string;

  createdAt: string;

}



export interface DistrictFee {

  district: District;

  fee: number;

  active: boolean;

  minDays?: number;

  maxDays?: number;

}



export interface DeliveryDay {

  id: string;

  label: string;

  active: boolean;

}



export interface SiteSettings {

  heroSlides: { image: string; title: string; subtitle: string; cta: string; link: string }[];

  flashSaleActive: boolean;

  flashSaleEndsAt?: string;

  promoCode?: string;

  promoDiscount?: number;

  heroText?: string;

  deliveryDays?: DeliveryDay[];

}



export interface AdminUser {

  uid: string;

  email: string;

  role: "admin" | "superadmin";

  addedAt?: string;

}



export interface PromoCode {

  id: string;

  code: string;

  discountPercent: number;

  active: boolean;

  description?: string;

  startsAt?: string;

  expiresAt?: string;

  minOrderAmount?: number;

  createdAt: string;

}



export interface AdminAlert {

  id: string;

  type: "new_order" | "low_stock";

  message: string;

  orderId?: string;

  firestoreOrderId?: string;

  read: boolean;

  createdAt: string;

}



export interface NewsletterSubscriber {

  id: string;

  email: string;

  subscribedAt: string;

  source?: string;

}



export type ProductSortOption = "newest" | "price-asc" | "price-desc" | "name";



export interface ProductFilterState {

  category?: string;

  minPrice?: number;

  maxPrice?: number;

  sizes?: ProductSize[];

  colors?: string[];

  inStockOnly?: boolean;

  sort?: ProductSortOption;

}


