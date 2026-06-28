"use client";

import Image, { type ImageProps } from "next/image";
import { isConfiguredImageHost, normalizeImageUrl } from "@/lib/images";

type ProductImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

export function ProductImage({
  src,
  alt,
  className,
  fill,
  sizes,
  priority,
  width,
  height,
  ...rest
}: ProductImageProps) {
  if (!src?.trim()) {
    return (
      <div
        className={`bg-brand-pink/40 flex items-center justify-center text-brand-muted text-xs ${className ?? ""}`}
        style={fill ? { position: "absolute", inset: 0 } : undefined}
      >
        No image
      </div>
    );
  }

  const normalized = normalizeImageUrl(src);

  if (isConfiguredImageHost(normalized)) {
    return (
      <Image
        src={normalized}
        alt={alt}
        className={className}
        fill={fill}
        sizes={sizes}
        priority={priority}
        width={width}
        height={height}
        {...rest}
      />
    );
  }

  if (fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalized}
        alt={alt ?? ""}
        className={className}
        sizes={sizes}
        style={{ position: "absolute", height: "100%", width: "100%", inset: 0, objectFit: "cover" }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalized}
      alt={alt ?? ""}
      className={className}
      width={typeof width === "number" ? width : undefined}
      height={typeof height === "number" ? height : undefined}
    />
  );
}
