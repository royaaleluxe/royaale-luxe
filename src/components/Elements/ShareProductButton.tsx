"use client";

import { Link2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface ShareProductButtonProps {
  productId: string;
  title: string;
}

export function ShareProductIconButton({ productId, title }: ShareProductButtonProps) {
  const { showToast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}/products/${productId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* copy fallback */
      }
    }
    await navigator.clipboard.writeText(url);
    showToast("Link copied", "success");
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="p-2.5 rounded-full bg-brand-pink/80 hover:bg-brand-pink-accent/60"
      aria-label="Share"
    >
      <Link2 className="w-5 h-5 text-brand-charcoal" />
    </button>
  );
}
