"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { ProductImage } from "./ProductImage";

interface ImageZoomGalleryProps {
  images: string[];
  alt: string;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  imageAlts?: Record<string, string>;
}

export function ImageZoomGallery({
  images,
  alt,
  activeIndex,
  onIndexChange,
  imageAlts,
}: ImageZoomGalleryProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const current = images[activeIndex] || images[0];
  const currentAlt = (current && imageAlts?.[current]) || alt;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative aspect-[3/4] md:min-h-[520px] overflow-hidden cursor-zoom-in group"
        onClick={() => setZoomOpen(true)}
        onMouseMove={handleMouseMove}
      >
        <ProductImage
          src={current}
          alt={currentAlt}
          fill
          className="object-cover transition-transform duration-300 md:group-hover:scale-110"
          style={{
            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
          }}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
        <div className="absolute top-3 left-3 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-4 h-4" />
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(i);
                }}
                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                  activeIndex === i ? "border-brand-pink-accent" : "border-white/50"
                }`}
              >
                <ProductImage src={img} alt="" fill className="object-cover" sizes="56px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {zoomOpen && (
          <motion.div
            className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomOpen(false)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-2 text-white"
              onClick={() => setZoomOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-3xl aspect-[3/4]">
              <ProductImage
                src={current}
                alt={currentAlt}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onIndexChange(i);
                    }}
                    className={`w-3 h-3 rounded-full ${activeIndex === i ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
