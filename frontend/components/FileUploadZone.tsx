"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

type FileUploadZoneProps = {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  currentFile?: File | null;
  onClear?: () => void;
};

export function FileUploadZone({
  onFileSelect,
  accept,
  label,
  description,
  disabled = false,
  currentFile,
  onClear
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) onFileSelect(files[0]);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFileSelect(files[0]);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const acceptHint = (accept || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join("  ");

  return (
    <div
      className={`file-upload-zone ${isDragging ? "dragging" : ""} ${disabled ? "disabled" : ""} ${currentFile ? "has-file" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="upload-input-hidden"
      />

      <div className="upload-content modern">
        <div className="upload-top">
          <div className="upload-label">{label}</div>
          {acceptHint && <span className="upload-accept">{acceptHint}</span>}
        </div>

        {currentFile ? (
          <>
            <div className="upload-file-row">
              <div className="upload-filename">{currentFile.name}</div>
              <div className="upload-filesize">{(currentFile.size / 1024).toFixed(1)} KB</div>
            </div>
            <div className="upload-inline-actions">
              <button
                type="button"
                className="mini-btn"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                Replace
              </button>
              {onClear && (
                <button
                  type="button"
                  className="mini-btn danger"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {description && <div className="upload-description">{description}</div>}
            <div className="upload-hint">Click or drag file to upload</div>
            <button
              type="button"
              className="mini-btn"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Browse File
            </button>
          </>
        )}
      </div>
    </div>
  );
}
