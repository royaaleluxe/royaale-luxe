"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileImage } from "lucide-react";
import { SPRING_TRANSITION } from "@/lib/constants";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
}

export function FileUpload({
  onFileSelect,
  accept = "image/png,image/jpeg,application/pdf",
  label = "Drag & drop your receipt here",
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <motion.div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
        dragging ? "border-brand-pink-accent bg-brand-pink/30" : "border-brand-muted/30 bg-white/40"
      }`}
      whileHover={{ scale: 1.01 }}
      transition={SPRING_TRANSITION}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      {fileName ? (
        <div className="flex flex-col items-center gap-2">
          <FileImage className="w-10 h-10 text-emerald-600" />
          <p className="text-sm font-medium text-brand-charcoal">{fileName}</p>
          <p className="text-xs text-brand-muted">Receipt ready for upload</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-10 h-10 text-brand-muted" />
          <p className="text-sm font-medium text-brand-charcoal">{label}</p>
          <p className="text-xs text-brand-muted">PNG, JPEG, or PDF</p>
        </div>
      )}
    </motion.div>
  );
}
