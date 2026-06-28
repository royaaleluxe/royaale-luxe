"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductImage } from "@/components/Elements/ProductImage";
import { Plus, Pencil, Trash2, X, ImageMinus, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { saveProduct, deleteProduct } from "@/lib/firestore";
import { triggerBackInStockCheck } from "@/lib/api-client";
import { uploadProductImage, isFirebaseStorageEnabled } from "@/lib/storage";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/images";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, GLASS_CLASS, PRODUCT_SIZES, SPRING_TRANSITION } from "@/lib/constants";
import type { Product, StockVariant } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";

const emptyProduct = (): Omit<Product, "id"> => ({
  title: "",
  description: "",
  images: [],
  price: 0,
  originalPrice: undefined,
  category: "General",
  variants: [],
  featured: false,
  bestseller: false,
  newArrival: false,
});

export function AdminProducts() {
  const { products } = useStore();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct());
  const [variantColor, setVariantColor] = useState("");
  const [variantHex, setVariantHex] = useState("#FFD1DC");
  const [variantSize, setVariantSize] = useState<ProductSize>("M");
  const [variantQty, setVariantQty] = useState(0);
  const [variantImage, setVariantImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const openNew = () => {
    setEditing({ id: "", ...emptyProduct() });
    setForm(emptyProduct());
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    const { id, ...rest } = product;
    setForm(rest);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadProductImage(editing?.id || "new", files[i], i);
        urls.push(url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      showToast("Images uploaded", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed — paste an image URL instead",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () => {
    if (!variantColor.trim()) {
      showToast("Enter a color name", "error");
      return;
    }
    const existing = form.variants.find((v) => v.color === variantColor.trim());
    const duplicate = form.variants.some(
      (v) => v.color === variantColor.trim() && v.size === variantSize
    );
    if (duplicate) {
      showToast("This color and size combination already exists", "error");
      return;
    }
    const variant: StockVariant = {
      color: variantColor.trim(),
      colorHex: existing?.colorHex || variantHex,
      size: variantSize,
      quantity: variantQty,
      image: variantImage || existing?.image || form.images[0],
    };
    setForm((f) => ({ ...f, variants: [...f.variants, variant] }));
    setVariantColor("");
    setVariantQty(0);
    setVariantImage("");
  };

  const removeVariant = (index: number) => {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  };

  const updateVariant = (index: number, updates: Partial<StockVariant>) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...updates } : v)),
    }));
  };

  const syncColorImage = (color: string, image: string) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.color === color ? { ...v, image } : v)),
    }));
  };

  const addImageUrl = () => {
    const normalized = normalizeImageUrl(imageUrl);
    if (!normalized) return;
    if (!isValidImageUrl(normalized)) {
      showToast("Enter a valid direct image URL (https://...)", "error");
      return;
    }
    setForm((f) => ({ ...f, images: [...f.images, normalized] }));
    setImageUrl("");
    showToast("Image URL added", "success");
  };

  const removeImage = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    showToast("Image removed", "success");
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setForm((f) => {
      const next = [...f.images];
      const target = index + direction;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, images: next };
    });
  };

  const setImageAlt = (url: string, alt: string) => {
    setForm((f) => ({
      ...f,
      imageAlts: { ...(f.imageAlts || {}), [url]: alt },
    }));
  };

  const duplicateProduct = (product: Product) => {
    const { id, ...rest } = product;
    setEditing({ id: "", ...rest, title: `${rest.title} (Copy)` });
    setForm({ ...rest, title: `${rest.title} (Copy)` });
    showToast("Duplicated — save to create", "success");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast("Product title is required", "error");
      return;
    }
    if (!form.price || form.price <= 0) {
      showToast("Enter a valid price", "error");
      return;
    }
    try {
      const product: Product = {
        id: editing?.id || "",
        ...form,
        images: form.images.map(normalizeImageUrl),
        altImages: form.altImages?.map(normalizeImageUrl),
      };
      await saveProduct(product);
      if (product.id) {
        triggerBackInStockCheck(product.id)
          .then((result) => {
            if (result.emailsSent > 0) {
              showToast(`Back-in-stock emails sent to ${result.emailsSent} customer(s)`, "success");
            }
          })
          .catch(() => {});
      }
      showToast("Product saved", "success");
      setEditing(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save product";
      showToast(message, "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      showToast("Product deleted", "success");
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const addProductButton = (
    <motion.button
      onClick={openNew}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-sm font-semibold"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Plus className="w-4 h-4" /> Add Product
    </motion.button>
  );

  return (
    <div>
      <div className="text-center mb-6 space-y-4">
        <h2 className="text-2xl font-bold">Product Inventory</h2>
        {addProductButton}
      </div>

      <div className={`${GLASS_CLASS} rounded-2xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left bg-white/20">
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <p className="text-brand-muted mb-4">No products yet. Add your first item to the catalog.</p>
                  {addProductButton}
                </td>
              </tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-b border-white/10">
                <td className="p-4 font-medium">{p.title}</td>
                <td className="p-4 text-brand-muted">{p.category}</td>
                <td className="p-4">{formatCurrency(p.price)}</td>
                <td className="p-4">{p.variants.reduce((s, v) => s + v.quantity, 0)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-white/40 rounded" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => duplicateProduct(p)} className="p-1.5 hover:bg-white/40 rounded" title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="w-full max-w-2xl pointer-events-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-glass overflow-y-auto max-h-[90vh]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="p-8">
                <div className="flex justify-between mb-6">
                  <h3 className="text-xl font-bold">{editing.id ? "Edit Product" : "New Product"}</h3>
                  <button onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                  <input
                    placeholder="Title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm resize-none"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Price (XCD)"
                      value={form.price || ""}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Original Price (optional)"
                      value={form.originalPrice || ""}
                      onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) || undefined })}
                      className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                    />
                  </div>
                  <input
                    placeholder="Category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                  />

                  <div className="flex gap-4 text-sm">
                    {(["featured", "bestseller", "newArrival"] as const).map((flag) => (
                      <label key={flag} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!form[flag]}
                          onChange={(e) => setForm({ ...form, [flag]: e.target.checked })}
                        />
                        {flag}
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Product Images</label>
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    {!isFirebaseStorageEnabled && (
                      <p className="text-xs text-brand-muted mt-1">
                        Firebase Storage requires a Blaze plan — use image URLs below, or upload small images (under 800KB).
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <input
                        placeholder="Direct image URL (not a Google search link)"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl border border-white/40 bg-white/60 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addImageUrl}
                        className="px-4 py-2 bg-brand-pink rounded-xl text-sm font-medium"
                      >
                        Add URL
                      </button>
                    </div>
                    {form.images.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {form.images.map((url, i) => (
                          <div key={`${url}-${i}`} className="flex gap-2 items-start p-2 rounded-xl bg-white/40 border border-white/30">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <ProductImage src={url} alt="" fill className="object-cover" sizes="64px" />
                              {i === 0 && (
                                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center">Cover</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                placeholder="Alt text (accessibility)"
                                value={form.imageAlts?.[url] || ""}
                                onChange={(e) => setImageAlt(url, e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-white/40 bg-white/60 text-xs"
                              />
                              <div className="flex gap-1">
                                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="p-1 rounded bg-white/60 disabled:opacity-30">
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="p-1 rounded bg-white/60 disabled:opacity-30">
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={() => removeImage(i)} className="p-1 rounded bg-red-50 text-red-500 ml-auto">
                                  <ImageMinus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/20 pt-4">
                    <h4 className="font-semibold text-sm mb-1">Stock Variants</h4>
                    <p className="text-xs text-brand-muted mb-3">
                      Add color, size, and quantity. Link each color to a product image — shoppers see that image when they pick the color.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-white/40 border border-white/30">
                      <input
                        placeholder="Color name"
                        value={variantColor}
                        onChange={(e) => {
                          const name = e.target.value;
                          setVariantColor(name);
                          const existing = form.variants.find((v) => v.color === name.trim());
                          if (existing) {
                            setVariantHex(existing.colorHex);
                            setVariantImage(existing.image || form.images[0] || "");
                          }
                        }}
                        className="px-3 py-2 rounded-lg border text-sm min-w-[100px]"
                      />
                      <input
                        type="color"
                        value={variantHex}
                        onChange={(e) => setVariantHex(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                        title="Swatch color"
                      />
                      <select
                        value={variantSize}
                        onChange={(e) => setVariantSize(e.target.value as ProductSize)}
                        className="px-3 py-2 rounded-lg border text-sm"
                      >
                        {PRODUCT_SIZES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={variantQty || ""}
                        onChange={(e) => setVariantQty(Number(e.target.value))}
                        className="w-20 px-3 py-2 rounded-lg border text-sm"
                      />
                      {form.images.length > 0 && (
                        <select
                          value={variantImage || form.images[0]}
                          onChange={(e) => setVariantImage(e.target.value)}
                          className="px-3 py-2 rounded-lg border text-sm max-w-[140px]"
                          title="Image for this color"
                        >
                          {form.images.map((url, i) => (
                            <option key={`${url}-${i}`} value={url}>
                              Image {i + 1}{i === 0 ? " (cover)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={addVariant}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-brand-pink rounded-lg text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>

                    {form.variants.length === 0 ? (
                      <p className="text-xs text-brand-muted italic">No variants yet.</p>
                    ) : (
                      <div className="rounded-xl border border-white/30 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-white/30 text-left text-xs uppercase tracking-wider text-brand-muted">
                              <th className="p-2.5">Color</th>
                              <th className="p-2.5">Size</th>
                              <th className="p-2.5">Qty</th>
                              <th className="p-2.5">Image</th>
                              <th className="p-2.5 w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {form.variants.map((v, i) => (
                              <tr key={`${v.color}-${v.size}-${i}`} className="border-t border-white/20">
                                <td className="p-2.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-5 h-5 rounded-full border border-gray-300 shrink-0"
                                      style={{ backgroundColor: v.colorHex }}
                                    />
                                    <span className="text-xs font-medium">{v.color}</span>
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <select
                                    value={v.size}
                                    onChange={(e) => updateVariant(i, { size: e.target.value as ProductSize })}
                                    className="px-2 py-1 rounded border text-xs"
                                  >
                                    {PRODUCT_SIZES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={v.quantity}
                                    onChange={(e) => updateVariant(i, { quantity: Number(e.target.value) })}
                                    className="w-16 px-2 py-1 rounded border text-xs"
                                  />
                                </td>
                                <td className="p-2.5">
                                  {form.images.length > 0 ? (
                                    <select
                                      value={v.image || form.images[0]}
                                      onChange={(e) => syncColorImage(v.color, e.target.value)}
                                      className="max-w-[100px] px-2 py-1 rounded border text-xs"
                                    >
                                      {form.images.map((url, imgI) => (
                                        <option key={`${url}-${imgI}`} value={url}>
                                          Img {imgI + 1}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-brand-muted">Add images first</span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <button
                                    type="button"
                                    onClick={() => removeVariant(i)}
                                    className="p-1.5 rounded hover:bg-red-50 text-red-500"
                                    aria-label="Remove variant"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <motion.button
                    onClick={handleSave}
                    className="w-full py-3 bg-black text-white rounded-full font-semibold text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                  >
                    Save Product
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
