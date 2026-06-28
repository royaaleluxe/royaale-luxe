import { z } from "zod";
import { SAINT_LUCIA_DISTRICTS, PRODUCT_SIZES, BANKS } from "@/lib/constants";

const districtSchema = z.enum(SAINT_LUCIA_DISTRICTS);
const sizeSchema = z.enum(PRODUCT_SIZES);
const bankIds = BANKS.map((b) => b.id) as [string, ...string[]];

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  image: z.string().max(2048),
  price: z.number().positive().max(1_000_000),
  color: z.string().min(1).max(64),
  colorHex: z.string().max(16),
  size: sizeSchema,
  quantity: z.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  orderId: z.string().min(1).max(64),
  items: z.array(cartItemSchema).min(1).max(50),
  firstName: z.string().min(1).max(80).trim(),
  lastName: z.string().min(1).max(80).trim(),
  email: z.string().email().max(254),
  phone: z.string().min(6).max(24).trim(),
  district: districtSchema,
  community: z.string().min(1).max(120).trim(),
  directions: z.string().min(1).max(500).trim(),
  bankId: z.enum(bankIds),
  receiptUrl: z.string().min(1).max(1_500_000),
  couponCode: z.string().max(32).optional(),
  saveAddress: z.boolean().optional(),
});

export const notifyAdminSchema = z.object({
  orderId: z.string().min(1).max(64),
  firestoreOrderId: z.string().min(1).max(128),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const newsletterSchema = z.object({
  email: z.string().email().max(254).trim().toLowerCase(),
});

export const bulkPromoSchema = z.object({
  prefix: z.string().min(2).max(12).regex(/^[A-Z0-9]+$/),
  count: z.number().int().min(1).max(100),
  discountPercent: z.number().min(1).max(100),
  description: z.string().max(200).optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  minOrderAmount: z.number().positive().optional(),
  active: z.boolean().optional().default(true),
});

export const backInStockSchema = z.object({
  productId: z.string().min(1).max(128),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
