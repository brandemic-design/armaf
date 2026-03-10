"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import gsap from "gsap";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const COUNTRIES = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "AE", label: "🇦🇪 United Arab Emirates" },
  { code: "SA", label: "🇸🇦 Saudi Arabia" },
  { code: "IN", label: "🇮🇳 India" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "MX", label: "🇲🇽 Mexico" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "NG", label: "🇳🇬 Nigeria" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "JP", label: "🇯🇵 Japan" },
  { code: "KR", label: "🇰🇷 South Korea" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "EG", label: "🇪🇬 Egypt" },
  { code: "PK", label: "🇵🇰 Pakistan" },
  { code: "ZA", label: "🇿🇦 South Africa" },
] as const;

const PLATFORMS = ["ig", "tiktok", "other"] as const;

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  country: z.string().min(1, "Select your country"),
  platform: z.enum(PLATFORMS, { message: "Select a platform" }),
  consentComms: z.boolean(),
  ageVerified: z.literal(true, { message: "You must be 18 or older to continue" }),
});

type RegisterForm = z.infer<typeof registerSchema>;
type FieldErrors = Partial<Record<keyof RegisterForm, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fieldsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "",
    platform: "" as string,
    consentComms: false,
    ageVerified: false,
    honeypot: "",
  });

  useEffect(() => {
    const els = fieldsRef.current.filter(Boolean) as HTMLDivElement[];
    gsap.set(els, { opacity: 0, x: -40 });
    gsap.to(els, {
      opacity: 1,
      x: 0,
      duration: 0.5,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.2,
    });
  }, []);

  function setFieldRef(index: number) {
    return (el: HTMLDivElement | null) => {
      fieldsRef.current[index] = el;
    };
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          country: form.country,
          platform: form.platform,
          consentComms: form.consentComms,
          ageVerified: form.ageVerified,
          honeypot: form.honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Registration failed. Try again.");
        setSubmitting(false);
        return;
      }

      router.push(data.redirect || "/briefing");
    } catch {
      setServerError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="w-full max-w-md flex flex-col gap-6"
        noValidate
      >
        <div ref={setFieldRef(0)}>
          <h1 className="text-2xl font-mono uppercase tracking-widest text-mission-white mb-1">
            Agent Registration
          </h1>
          <p className="text-xs font-mono text-mission-white/40">
            Clearance required before mission access.
          </p>
        </div>

        {serverError && (
          <div className="text-sm font-mono text-mission-red-light bg-mission-red/10 border border-mission-red-light px-4 py-3 error-glow">
            {serverError}
          </div>
        )}

        {/* Name */}
        <div ref={setFieldRef(1)}>
          <Input
            label="Name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div ref={setFieldRef(2)}>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="agent@email.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
          />
        </div>

        {/* Country */}
        <div ref={setFieldRef(3)} className="flex flex-col gap-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-mission-white/60">
            Country
          </label>
          <select
            name="country"
            value={form.country}
            onChange={handleChange}
            className={`bg-mission-grey border px-4 py-3 text-sm text-mission-white font-mono focus:outline-none focus:border-mission-red transition-colors appearance-none ${
              errors.country
                ? "border-mission-red-light error-glow"
                : "border-mission-grey-light"
            }`}
          >
            <option value="" disabled>
              Select your country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.country && (
            <span className="text-xs text-mission-red-light font-mono">
              {errors.country}
            </span>
          )}
        </div>

        {/* Platform */}
        <div ref={setFieldRef(4)} className="flex flex-col gap-2">
          <label className="text-xs font-mono uppercase tracking-widest text-mission-white/60">
            Platform
          </label>
          <div className="flex gap-4">
            {(
              [
                { value: "ig", label: "Instagram" },
                { value: "tiktok", label: "TikTok" },
                { value: "other", label: "Other" },
              ] as const
            ).map((p) => (
              <label
                key={p.value}
                className={`flex items-center gap-2 cursor-pointer font-mono text-sm px-4 py-2 border transition-colors ${
                  form.platform === p.value
                    ? "border-mission-red text-mission-red"
                    : "border-mission-grey-light text-mission-white/60 hover:border-mission-white/40"
                }`}
              >
                <input
                  type="radio"
                  name="platform"
                  value={p.value}
                  checked={form.platform === p.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                {p.label}
              </label>
            ))}
          </div>
          {errors.platform && (
            <span className="text-xs text-mission-red-light font-mono">
              {errors.platform}
            </span>
          )}
        </div>

        {/* Consent */}
        <div ref={setFieldRef(5)} className="flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="consentComms"
              checked={form.consentComms}
              onChange={handleChange}
              className="mt-1 accent-mission-red"
            />
            <span className="text-xs font-mono text-mission-white/60 leading-relaxed">
              I consent to receiving mission communications and product updates
              from ARMAF.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="ageVerified"
              checked={form.ageVerified}
              onChange={handleChange}
              className="mt-1 accent-mission-red"
            />
            <span className="text-xs font-mono text-mission-white/60 leading-relaxed">
              I confirm I am 18 years of age or older.
            </span>
          </label>
          {errors.ageVerified && (
            <span className="text-xs text-mission-red-light font-mono">
              {errors.ageVerified}
            </span>
          )}
        </div>

        {/* Honeypot - hidden from real users */}
        <input
          type="text"
          name="honeypot"
          value={form.honeypot}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          aria-hidden="true"
        />

        <div ref={setFieldRef(6)}>
          <Button
            type="submit"
            size="lg"
            pulse
            disabled={submitting}
            className="w-full"
          >
            {submitting ? "Processing..." : "Request Clearance"}
          </Button>
        </div>
      </form>
    </main>
  );
}
