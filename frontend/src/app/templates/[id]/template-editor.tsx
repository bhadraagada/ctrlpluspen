"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TextArea {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  align?: string;
}

interface TemplateConfig {
  pageSize: string;
  width?: number;
  height?: number;
  orientation: string;
  margins: { top: number; right: number; bottom: number; left: number };
  backgroundColor: string;
  textAreas: TextArea[];
  showLines?: boolean;
  lineSpacing?: number;
  border?: { width: number; color: string; style: string };
}

interface TemplateEditorProps {
  templateId: string;
}

export function TemplateEditor({ templateId }: TemplateEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState<Record<string, string>>({});
  const [documentName, setDocumentName] = useState("");
  const [style, setStyle] = useState(9);
  const [bias, setBias] = useState(0.75);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [activeField, setActiveField] = useState<string | null>(null);

  const templateQuery = api.templates.getById.useQuery({ id: templateId });
  const utils = api.useUtils();

  const createDocumentMutation = api.templates.createDocument.useMutation({
    onSuccess: (doc) => {
      utils.templates.getDocuments.invalidate();
      router.push(`/templates/documents/${doc.id}`);
    },
  });

  const template = templateQuery.data;
  const config = template?.config as TemplateConfig | undefined;

  useEffect(() => {
    if (config?.textAreas) {
      const initialContent: Record<string, string> = {};
      config.textAreas.forEach((area) => {
        initialContent[area.id] = "";
      });
      setContent(initialContent);
    }
  }, [config]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setContent((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleGenerate = () => {
    if (!template) return;

    createDocumentMutation.mutate({
      templateId: template.id,
      name: documentName || `${template.name} - ${new Date().toLocaleDateString()}`,
      content,
      style,
      bias,
      strokeColor,
      strokeWidth,
    });
  };

  const getPageDimensions = () => {
    if (!config) return { width: 595, height: 842 }; // A4 default
    
    if (config.pageSize === "custom" && config.width && config.height) {
      return { width: config.width, height: config.height };
    }
    
    // Standard page sizes in points
    const sizes: Record<string, { width: number; height: number }> = {
      A4: { width: 595, height: 842 },
      A5: { width: 420, height: 595 },
      Letter: { width: 612, height: 792 },
    };
    
    const size = sizes[config.pageSize] ?? sizes.A4!;
    
    if (config.orientation === "landscape") {
      return { width: size.height, height: size.width };
    }
    
    return size;
  };

  const pageDimensions = getPageDimensions();
  const scale = Math.min(600 / pageDimensions.width, 800 / pageDimensions.height);

  if (templateQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (templateQuery.error || !template || !config) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
        <div className="rounded-full bg-red-500/20 p-4">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="mt-4 font-medium text-white">Template Not Found</h3>
        <p className="mt-2 text-sm text-white/50">{templateQuery.error?.message ?? "This template doesn't exist"}</p>
        <Link
          href="/templates"
          className="mt-6 rounded-full bg-white px-6 py-2 text-sm font-medium text-black transition hover:scale-[1.02]"
        >
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/templates" className="text-white/40 hover:text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">{template.name}</h1>
            {template.description && (
              <p className="mt-1 text-sm text-white/50">{template.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={createDocumentMutation.isPending || Object.values(content).every((v) => !v.trim())}
          className="flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
        >
          {createDocumentMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
              Generating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Generate Document
            </>
          )}
        </button>
      </div>

      {createDocumentMutation.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {createDocumentMutation.error.message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Preview Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Preview</h2>
          <div className="flex justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8">
            <div
              className="relative shadow-2xl"
              style={{
                width: pageDimensions.width * scale,
                height: pageDimensions.height * scale,
                backgroundColor: config.backgroundColor,
                border: config.border ? `${config.border.width}px ${config.border.style} ${config.border.color}` : undefined,
              }}
            >
               {/* Lines for journal */}
               {config.showLines && config.lineSpacing && (
                 <svg
                   className="absolute inset-0 pointer-events-none"
                   width="100%"
                   height="100%"
                 >
                   {Array.from({ length: Math.floor(pageDimensions.height / config.lineSpacing!) }).map((_, i) => (
                     <line
                       key={i}
                       x1={config.margins.left * scale}
                       y1={(config.margins.top + i * config.lineSpacing!) * scale}
                       x2={(pageDimensions.width - config.margins.right) * scale}
                       y2={(config.margins.top + i * config.lineSpacing!) * scale}
                      stroke="#e0e0e0"
                      strokeWidth="1"
                    />
                  ))}
                </svg>
              )}

              {/* Text Areas */}
              {config.textAreas.map((area) => (
                <div
                  key={area.id}
                  onClick={() => setActiveField(area.id)}
                  className={`absolute cursor-pointer transition-all ${
                    activeField === area.id
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent"
                      : "hover:bg-blue-500/10"
                  }`}
                  style={{
                    left: area.x * scale,
                    top: area.y * scale,
                    width: area.width * scale,
                    height: area.height * scale,
                    padding: 4 * scale,
                  }}
                >
                  {content[area.id] ? (
                    <p
                      className="whitespace-pre-wrap break-words"
                      style={{
                        fontSize: area.fontSize * scale * 0.8,
                        fontFamily: "'Caveat', cursive",
                        color: strokeColor,
                        textAlign: (area.align as any) ?? "left",
                        lineHeight: 1.4,
                      }}
                    >
                      {content[area.id]}
                    </p>
                  ) : (
                    <span
                      className="text-gray-400 italic"
                      style={{ fontSize: area.fontSize * scale * 0.7 }}
                    >
                      {area.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="space-y-6">
          {/* Document Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Document Name</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={`${template.name} - ${new Date().toLocaleDateString()}`}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
            />
          </div>

          {/* Content Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Content</h3>
            {config.textAreas.map((area) => (
              <div
                key={area.id}
                className={`space-y-2 rounded-lg border p-4 transition ${
                  activeField === area.id
                    ? "border-blue-500/50 bg-blue-500/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
                onClick={() => setActiveField(area.id)}
              >
                <label className="text-sm font-medium text-white/70">{area.label}</label>
                {area.height > 50 ? (
                  <textarea
                    value={content[area.id] ?? ""}
                    onChange={(e) => handleFieldChange(area.id, e.target.value)}
                    placeholder={`Enter ${area.label.toLowerCase()}...`}
                    rows={Math.min(6, Math.max(2, Math.floor(area.height / 30)))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30 resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={content[area.id] ?? ""}
                    onChange={(e) => handleFieldChange(area.id, e.target.value)}
                    placeholder={`Enter ${area.label.toLowerCase()}...`}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Handwriting Settings */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-medium text-white">Handwriting Style</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-white/30"
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i} className="bg-[#0a0a0a]">
                      Style {i}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-white/70">Bias: {bias.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1.25"
                  step="0.05"
                  value={bias}
                  onChange={(e) => setBias(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-white/70">Ink Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                  />
                  <input
                    type="text"
                    value={strokeColor}
                    onChange={(e) => setStrokeColor(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-white/70">Stroke Width: {strokeWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>
            </div>
          </div>

          {/* Quick Color Presets */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">Presets:</span>
            {[
              { color: "#000000", name: "Black" },
              { color: "#1a365d", name: "Navy" },
              { color: "#2d3748", name: "Dark Gray" },
              { color: "#744210", name: "Brown" },
              { color: "#1e40af", name: "Blue" },
            ].map((preset) => (
              <button
                key={preset.color}
                onClick={() => setStrokeColor(preset.color)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  strokeColor === preset.color ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
