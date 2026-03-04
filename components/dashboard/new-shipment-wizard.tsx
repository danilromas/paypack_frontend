"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { X, Check, Sparkles, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const wizardSteps = [
  "Shipping Details",
  "Address Data",
  "Select Service",
  "Payment",
];

const services = [
  {
    name: "Express Delivery",
    provider: "DHL Express Worldwide",
    time: "24 hours",
    timeColor: "bg-destructive/10 text-destructive",
    price: "99.90",
    features: ["Door to door", "Real-time tracking"],
  },
  {
    name: "Standard Air",
    provider: "FedEx International",
    time: "3-5 days",
    timeColor: "bg-primary/10 text-primary",
    price: "45.50",
    features: ["Pickup Point", "Insurance included"],
  },
  {
    name: "Economy Sea",
    provider: "Maersk Line",
    time: "7-10 days",
    timeColor: "bg-warning/10 text-warning",
    price: "29.90",
    features: ["Deposit Point", "Eco-friendly"],
  },
];

export function NewShipmentWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(1);
  const [successOpen, setSuccessOpen] = useState(false);

  const confetti = useMemo(() => {
    if (!successOpen) return [];
    const colors = [
      "rgb(34 211 238)", // cyan
      "rgb(59 130 246)", // blue
      "rgb(16 185 129)", // emerald
      "rgb(245 158 11)", // amber
      "rgb(236 72 153)", // pink
    ];
    return Array.from({ length: 54 }, (_, i) => {
      const size = 8 + Math.round(Math.random() * 10);
      const left = Math.random() * 100;
      const delay = Math.random() * 1.8;
      const duration = 2.2 + Math.random() * 2.0;
      const color = colors[i % colors.length];
      return { i, size, left, delay, duration, color };
    });
  }, [successOpen]);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-4 flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:inset-10">
        {/* Header */}
        <div className="border-b border-border bg-secondary/30 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Create New Shipment
            </h2>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-4">
            {wizardSteps.map((label, i) => (
              <div key={label} className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all",
                    i + 1 <= step
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1 < step ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "ml-3 hidden text-sm font-medium md:block",
                    i + 1 <= step ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {i < wizardSteps.length - 1 && (
                  <div className="mx-4 h-0.5 w-16 bg-border">
                    <div
                      className={cn(
                        "h-full bg-primary transition-all",
                        i + 1 < step ? "w-full" : "w-0",
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Step 1 */}
          {step === 1 && (
            <div className="pp-animate-slide-in mx-auto max-w-4xl">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    From
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Ivanov Ivan"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Country
                      </label>
                      <select className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option>Italy</option>
                        <option>Russia</option>
                        <option>Germany</option>
                        <option>United Kingdom</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        Address
                      </label>
                      <textarea
                        defaultValue="Via Roma 123, Milano"
                        className="h-24 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    Package Details
                  </h3>
                  <div className="rounded-2xl border border-border bg-secondary/50 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        Default Package
                      </span>
                      <button className="text-sm text-primary hover:underline">
                        + Add package
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Weight (kg)", value: "2.5" },
                        { label: "Length (cm)", value: "30" },
                        { label: "Width (cm)", value: "20" },
                        { label: "Height (cm)", value: "15" },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            {f.label}
                          </label>
                          <input
                            type="number"
                            defaultValue={f.value}
                            className="w-full rounded-lg border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-primary">
                      Volumetric weight: 1.8 kg
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 3 && (
            <div className="pp-animate-slide-in mx-auto max-w-5xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Available Services
                </h3>
                <select className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground">
                  <option>Sort by: Default</option>
                  <option>Price: Low to High</option>
                  <option>Fastest Delivery</option>
                </select>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {services.map((svc, i) => (
                  <button
                    key={svc.name}
                    onClick={() => setSelectedService(i)}
                    className={cn(
                      "rounded-2xl border-2 p-6 text-left transition-all hover:shadow-lg",
                      selectedService === i
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          svc.timeColor,
                        )}
                      >
                        {svc.time}
                      </span>
                    </div>
                    <h4 className="mb-1 font-bold text-foreground">
                      {svc.name}
                    </h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {svc.provider}
                    </p>
                    <div className="mb-4 space-y-2">
                      {svc.features.map((f) => (
                        <div
                          key={f}
                          className="flex items-center gap-2 text-sm text-foreground"
                        >
                          <Check className="h-4 w-4 text-success" />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          EUR{svc.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /est.
                        </span>
                      </div>
                      <span
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-medium",
                          selectedService === i
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {selectedService === i ? "Selected" : "Select"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="pp-animate-slide-in mx-auto max-w-2xl space-y-6">
              <h3 className="text-lg font-semibold text-foreground">
                Receiver Address
              </h3>
              {[
                { label: "Full Name", value: "Petrov Sergey" },
                { label: "Phone", value: "+7 (999) 123-4567" },
                { label: "Email", value: "petrov@email.com" },
                { label: "Country", value: "" },
                { label: "City", value: "Saint Petersburg" },
                { label: "Address", value: "Nevsky Prospect 28" },
                { label: "ZIP Code", value: "190000" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    {field.label}
                  </label>
                  {field.label === "Country" ? (
                    <select className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option>Russia</option>
                      <option>Germany</option>
                      <option>UK</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      defaultValue={field.value}
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="pp-animate-slide-in mx-auto max-w-md text-center">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Payment Summary
              </h3>
              <div className="mb-8 rounded-2xl border border-border bg-secondary/50 p-6 text-left">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service:</span>
                    <span className="text-foreground">
                      {services[selectedService].name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="text-foreground">
                      {services[selectedService].time}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 font-semibold">
                    <span className="text-foreground">Total:</span>
                    <span className="text-primary">
                      EUR{services[selectedService].price}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSuccessOpen(true)}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90"
              >
                Confirm & Pay
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-6">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className={cn(
              "rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary",
              step === 1 && "invisible",
            )}
          >
            Back
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {successOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-foreground/80 backdrop-blur-sm" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confetti.map((p) => (
              <div
                key={p.i}
                className="pp-confetti-piece"
                style={
                  {
                    ["--pp-left" as any]: `${p.left}%`,
                    ["--pp-top" as any]: "100%",
                    ["--pp-size" as any]: `${p.size}px`,
                    ["--pp-delay" as any]: `${p.delay}s`,
                    ["--pp-duration" as any]: `${p.duration}s`,
                    ["--pp-color" as any]: p.color,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="pp-animate-scale-in relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-success/20 blur-3xl" />

              <div className="relative z-10">
                <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-success to-success/70 text-success-foreground shadow-lg">
                  <PackageCheck className="h-9 w-9" />
                </div>

                <h2 className="text-2xl font-bold text-foreground">
                  Payment Succeeded!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your shipment has been created and paid successfully.
                </p>

                <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-4 text-left text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-foreground">
                      #SHP-2026-78432
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Total paid</span>
                    <span className="font-semibold text-success">
                      EUR{services[selectedService].price}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Next</span>
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Sparkles className="h-4 w-4" />
                      Track your shipment
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setSuccessOpen(false);
                      onClose();
                    }}
                    className="rounded-xl border border-border py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSuccessOpen(false);
                      onClose();
                    }}
                    className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                  >
                    View tracking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
