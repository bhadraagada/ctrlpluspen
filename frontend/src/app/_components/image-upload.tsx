"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadProps {
  onImageSelect: (imageBase64: string, file: File) => void;
  isLoading?: boolean;
  currentImage?: string | null;
}

export function ImageUpload({
  onImageSelect,
  isLoading = false,
  currentImage = null,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onImageSelect(base64, file);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    multiple: false,
    disabled: isLoading,
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-500/10"
            : isLoading
              ? "cursor-not-allowed border-gray-600 bg-gray-800/50"
              : "border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50"
        }`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative w-full p-4">
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-[400px] rounded-lg object-contain"
            />
            {!isLoading && (
              <button
                onClick={handleClear}
                className="absolute right-6 top-6 rounded-full bg-red-500/80 p-2 text-white transition-colors hover:bg-red-600"
                title="Remove image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-gray-700 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-200">
                {isDragActive ? "Drop the image here" : "Drag & drop an image"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                or click to select a file (JPG, PNG)
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="text-sm text-gray-300">Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
