"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Gift } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const stepLabels = ["Role", "Product Link", "Item Details", "Summary"];

export function NewDealModal() {
  const { setNewDealModalOpen } = useAppStore()
  const [step, setStep] = useState(1)
  const [role, setRole] = useState<"buyer" | "seller" | null>(null)
  const [productLink, setProductLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-0 backdrop-blur-sm sm:p-4">
      <div className="h-full w-full overflow-y-auto rounded-none border-0 bg-card p-4 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-3xl sm:border sm:border-border sm:p-8">
        {/* Header with integrated progress */}
        <div className="mb-8 flex items-center justify-between">
          {/* Left side - Back button or placeholder */}
          <div className="flex items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>

          {/* Center - Progress Steps */}
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                    i + 1 <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:block",
                    i + 1 <= step
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-8",
                      i + 1 < step ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Right side - Close button */}
          <div className="flex items-center">
            <button
              onClick={() => setNewDealModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <div>
            <h3 className="mb-8 text-center text-xl font-semibold text-foreground">
              Your Role
            </h3>
            <div className="mx-auto max-w-md space-y-4">
              {(["buyer", "seller"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                    role === r
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border-2",
                      role === r ? "border-primary" : "border-muted-foreground",
                    )}
                  >
                    {role === r && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-lg font-medium capitalize",
                      role === r ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!role}
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Product Link */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="mb-1 text-lg font-semibold text-foreground">
                Paste Product Link
              </h3>
              <p className="text-xs text-muted-foreground">
                Product name will appear if found
              </p>
            </div>

            {/* Ссылка */}
            <div className="mx-auto max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste product link here"
                  className="w-full rounded-xl border border-border bg-secondary px-5 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                />
                <button
                  onClick={() => setStep(3)}
                  disabled={!productLink?.trim()}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/*  or */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Upload file + description */}
            <div className="mx-auto max-w-md space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Upload document (optional)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 px-4 py-5 text-center hover:border-primary/50">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedFile(file);
                        setDescription('');
                      }
                    }}
                  />
                  <svg className="mb-2 h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">Click or drag file</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, up to 10 MB</p>
                  {uploadedFile && (
                    <p className="mt-2 text-xs text-primary truncate max-w-[260px]">
                      {uploadedFile.name}
                    </p>
                  )}
                </label>
              </div>

              {!uploadedFile && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Description (if no file)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional info about the deal..."
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Item Details */}
        {step === 3 && (
          <div className="space-y-4">

            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                Check item details
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-tight">
                We've fetched the information from the link. Please verify everything is correct.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">

              {/* Product Image Placeholder */}
              <div className="space-y-2">
                <div className="aspect-[4/3] w-full max-w-[340px] mx-auto flex items-center justify-center rounded-xl border border-border bg-secondary text-sm text-muted-foreground"> {/* aspect-square → 4/3, убрано лишнее */}
                  Product Image Preview
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {["Front", "Back", "Side"].map((label) => (
                    <div
                      key={label}
                      className="aspect-square flex items-center justify-center rounded-lg border border-border bg-secondary text-xs text-muted-foreground transition-all hover:ring-1 hover:ring-primary"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Правая колонка — форма */}
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                  <input
                    type="text"
                    defaultValue="iPhone 15 (256 GB, Pink)"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                  <textarea
                    rows={2}
                    defaultValue="Lightly used, minor screen scratches. Fully functional. Comes with original box and charger."
                    className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Box size (cm)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      defaultValue={20}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-16 rounded-lg border border-border bg-secondary px-2 py-1 text-center text-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Price</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        defaultValue={500}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">EUR</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Shipping</label>
                    <div className="flex items-center rounded-lg border border-border bg-secondary px-3 py-1.5">
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">EUR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(4)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              Deal Summary
            </h3>
            <div className="mb-8 space-y-3 rounded-2xl border border-border bg-secondary p-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium text-foreground">
                  iPhone 15 (256 GB, Pink)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium text-foreground">500 EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="font-medium text-foreground">5 EUR</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (3%):</span>
                <span className="font-medium text-foreground">15 EUR</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">520 EUR</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setNewDealModalOpen(false)}
              className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              Create Deal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
