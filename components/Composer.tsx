"use client";
import { useRef } from "react";
import { ArrowUpIcon, CalendarIcon, MicIcon, WaveIcon, StopIcon, PaperclipIcon, XIcon } from "./Icons";
import styles from "./Composer.module.css";
import { APP_NAME } from "@/lib/config";
import type { RefObject } from "react";

export type AttachedImage = {
  /** data-URL for preview */
  dataUrl: string;
  /** raw base64 without prefix */
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  name: string;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_IMAGES = 3;

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  streaming?: boolean;
  onVoice?: () => void;
  recording?: boolean;
  className?: string;
  onMic?: () => void;
  micListening?: boolean;
  micSupported?: boolean;
  contextLabel?: string;
  contextOpen?: boolean;
  onContextToggle?: () => void;
  contextButtonRef?: RefObject<HTMLButtonElement | null>;
  interim?: string;
  images?: AttachedImage[];
  onImagesChange?: (images: AttachedImage[]) => void;
  onAttachError?: (msg: string) => void;
};

export default function Composer({
  value, onChange, onSend, onStop, streaming = false, onVoice,
  recording = false, className = "", onMic, micListening = false,
  micSupported = true, contextLabel = "Today", contextOpen = false,
  onContextToggle, contextButtonRef, interim = "",
  images = [], onImagesChange, onAttachError,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = value.trim().length > 0 || images.length > 0;
  const displayValue = value + (interim ? `${value && !value.endsWith(" ") ? " " : ""}${interim}` : "");

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      onAttachError?.(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const filesToRead: File[] = [];
    for (let i = 0; i < files.length && filesToRead.length < remaining; i++) {
      const file = files[i];
      if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
        onAttachError?.(`${file.name}: only JPEG, PNG and WebP images are supported.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        onAttachError?.(`${file.name}: images must be under 5 MB.`);
        continue;
      }
      filesToRead.push(file);
    }

    if (filesToRead.length === 0) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    try {
      const loaded = await Promise.all(
        filesToRead.map((file) => new Promise<AttachedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = (e.target?.result as string) || "";
            const base64 = dataUrl.split(",")[1] ?? "";
            resolve({
              dataUrl,
              base64,
              mimeType: file.type as AttachedImage["mimeType"],
              name: file.name,
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        }))
      );
      onImagesChange?.([...images, ...loaded].slice(0, MAX_IMAGES));
    } catch {
      onAttachError?.("Failed to process image attachment.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (i: number) => {
    onImagesChange?.(images.filter((_, j) => j !== i));
  };

  return (
    <div className={`${styles.card} ${className}`}>
      {/* image thumbnails above the text field */}
      {images.length > 0 && (
        <div className={styles.thumbRow}>
          {images.map((img, i) => (
            <div key={i} className={styles.thumb}>
              {img.dataUrl
                ? <img src={img.dataUrl} alt={img.name} className={styles.thumbImg} />
                : <div className={styles.thumbLoading} />}
              <button
                type="button"
                className={styles.thumbRemove}
                aria-label={`Remove ${img.name}`}
                onClick={() => removeImage(i)}
              >
                <XIcon width={10} height={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        className={styles.input}
        value={displayValue}
        placeholder={`Ask ${APP_NAME} anything`}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canSend && !streaming && onSend()}
        enterKeyHint="send"
      />
      <div className={styles.row}>
        <button
          className={`${styles.tool} ${micListening ? styles.listening : ""} ${!micSupported ? styles.unsupported : ""}`}
          aria-label="Dictate"
          aria-pressed={micListening}
          onClick={onMic}
        >
          <MicIcon />
          {micListening && <span className={styles.rec} />}
        </button>
        <button
          ref={contextButtonRef}
          className={`${styles.tool} ${styles.today}`}
          aria-haspopup="listbox"
          aria-expanded={contextOpen}
          onClick={onContextToggle}
        >
          <CalendarIcon /><span>{contextLabel}</span>
        </button>
        <button className={styles.tool} aria-label="Voice mode" onClick={onVoice}><WaveIcon /></button>

        {/* attach button */}
        <button
          type="button"
          className={`${styles.tool} ${images.length >= MAX_IMAGES ? styles.attachDisabled : ""}`}
          aria-label="Attach image"
          disabled={images.length >= MAX_IMAGES}
          onClick={() => fileRef.current?.click()}
        >
          <PaperclipIcon />
          {images.length > 0 && <span className={styles.attachBadge}>{images.length}</span>}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={styles.fileInput}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {streaming ? (
          <button className={`${styles.send} ${styles.stop}`} aria-label="Stop" onClick={onStop}>
            <StopIcon width={15} height={15} />
          </button>
        ) : (
          <button
            className={`${styles.send} ${canSend ? styles.on : ""}`}
            aria-label="Send"
            disabled={!canSend}
            onClick={onSend}
          >
            <ArrowUpIcon width={17} height={17} />
          </button>
        )}
      </div>
    </div>
  );
}
