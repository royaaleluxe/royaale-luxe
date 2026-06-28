import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_TRANSITION } from "@/lib/constants";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-display text-xl text-brand-charcoal mb-2">{title}</p>
      {description && <p className="text-sm text-brand-muted mb-6 max-w-sm mx-auto">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <motion.span
            className="inline-block px-6 py-2.5 bg-brand-charcoal text-white rounded-full text-sm font-semibold"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
          >
            {actionLabel}
          </motion.span>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <motion.button
          onClick={onAction}
          className="px-6 py-2.5 bg-brand-charcoal text-white rounded-full text-sm font-semibold"
          whileTap={{ scale: 0.98 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}
