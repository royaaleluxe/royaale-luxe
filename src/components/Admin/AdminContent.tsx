"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, ImageMinus } from "lucide-react";
import { ProductImage } from "@/components/Elements/ProductImage";
import { useStore } from "@/context/StoreContext";
import { saveSiteSettings } from "@/lib/firestore";
import { uploadHeroImage, isFirebaseStorageEnabled } from "@/lib/storage";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/images";
import { useToast } from "@/context/ToastContext";
import { GLASS_CLASS, SPRING_TRANSITION } from "@/lib/constants";
import type { SiteSettings } from "@/lib/types";

export function AdminContent() {
  const { settings } = useStore();
  const { showToast } = useToast();
  const [form, setForm] = useState<SiteSettings>(
    settings || {
      heroSlides: [],
      flashSaleActive: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSiteSettings(form);
      showToast("Site settings saved", "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateSlide = (index: number, field: string, value: string) => {
    const slides = [...form.heroSlides];
    slides[index] = { ...slides[index], [field]: value };
    setForm({ ...form, heroSlides: slides });
  };

  const handleSlideImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlide(index);
    try {
      const url = await uploadHeroImage(index, file);
      updateSlide(index, "image", url);
      showToast("Hero image uploaded", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed — paste an image URL instead",
        "error"
      );
    } finally {
      setUploadingSlide(null);
      e.target.value = "";
    }
  };

  const addSlideImageUrl = (index: number, rawUrl: string) => {
    const normalized = normalizeImageUrl(rawUrl);
    if (!normalized) return;
    if (!isValidImageUrl(normalized)) {
      showToast("Enter a valid direct image URL (https://...)", "error");
      return;
    }
    updateSlide(index, "image", normalized);
    showToast("Image URL set", "success");
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Content & Drop Manager</h2>

      <div className="space-y-6">
        <div className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
          <h3 className="font-semibold">Hero Text</h3>
          <textarea
            rows={2}
            value={form.heroText || ""}
            onChange={(e) => setForm({ ...form, heroText: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm resize-none"
          />
        </div>

        <div className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
          <h3 className="font-semibold">Flash Sale & Countdown</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.flashSaleActive}
              onChange={(e) => setForm({ ...form, flashSaleActive: e.target.checked })}
            />
            Enable flash sale countdown
          </label>
          <input
            type="datetime-local"
            value={form.flashSaleEndsAt?.slice(0, 16) || ""}
            onChange={(e) => setForm({ ...form, flashSaleEndsAt: new Date(e.target.value).toISOString() })}
            className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
          />
        </div>

        {form.heroSlides.map((slide, i) => (
          <div key={i} className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
            <h3 className="font-semibold">Hero Slide {i + 1}</h3>

            <div>
              <label className="text-sm font-medium block mb-2">Slide Image</label>
              {slide.image && (
                <div className="relative w-full max-w-md aspect-[16/9] rounded-xl overflow-hidden border border-white/40 mb-3 group">
                  <ProductImage src={slide.image} alt={slide.title} fill className="object-cover" sizes="400px" />
                  <button
                    type="button"
                    onClick={() => updateSlide(i, "image", "")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <ImageMinus className="w-4 h-4" />
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center gap-2 w-full max-w-md px-4 py-3 rounded-xl border-2 border-dashed border-white/50 bg-white/30 text-sm font-medium cursor-pointer hover:bg-white/50 transition-colors">
                <Upload className="w-4 h-4" />
                {uploadingSlide === i ? "Uploading..." : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingSlide === i}
                  onChange={(e) => handleSlideImageUpload(i, e)}
                />
              </label>
              {!isFirebaseStorageEnabled && (
                <p className="text-xs text-brand-muted mt-1">
                  Firebase Storage requires a Blaze plan — use image URLs below, or upload small images (under 800KB).
                </p>
              )}
              <div className="flex gap-2 mt-2 max-w-md">
                <input
                  placeholder="Or paste image URL"
                  defaultValue={slide.image.startsWith("data:") ? "" : slide.image}
                  key={`url-${i}-${slide.image.slice(0, 20)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addSlideImageUrl(i, (e.target as HTMLInputElement).value);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/40 bg-white/60 text-sm"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    addSlideImageUrl(i, input.value);
                  }}
                  className="px-4 py-2 bg-brand-pink rounded-xl text-sm font-medium"
                >
                  Set URL
                </button>
              </div>
            </div>

            <input
              placeholder="Title"
              value={slide.title}
              onChange={(e) => updateSlide(i, "title", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              placeholder="Subtitle"
              value={slide.subtitle}
              onChange={(e) => updateSlide(i, "subtitle", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                placeholder="CTA Text"
                value={slide.cta}
                onChange={(e) => updateSlide(i, "cta", e.target.value)}
                className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
              />
              <input
                placeholder="Link"
                value={slide.link}
                onChange={(e) => updateSlide(i, "link", e.target.value)}
                className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
              />
            </div>
          </div>
        ))}

        <motion.button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-black text-white rounded-full font-semibold text-sm disabled:opacity-50"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_TRANSITION}
        >
          {saving ? "Saving..." : "Save All Settings"}
        </motion.button>
      </div>
    </div>
  );
}
