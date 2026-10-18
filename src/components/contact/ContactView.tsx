"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { site } from "@/content/site";
import { PageHeader } from "../sections/PageHeader";
import { Arrow, Button } from "../ui/Button";
import { CopyEmail, LocalTime } from "../ui/bits";
import { Reveal } from "../ui/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;
const TYPES = ["Bubble.io web app", "Booking system", "API integration", "Automation", "Website", "UI/UX design"];
const BUDGETS = ["< $1k", "$1k – $3k", "$3k – $7k", "$7k+"];

type Status = "idle" | "sending" | "sent" | "error";

function Chip({ on, children, onClick }: { on: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`relative overflow-hidden rounded-full px-4 py-2.5 text-[15px] font-bold transition-all duration-300 active:scale-95 ${
        on ? "bg-violet text-white shadow-[0_10px_24px_-12px_rgba(108,62,252,0.9)]" : "bg-mist text-ink hover:bg-lilac"
      }`}
    >
      <span className="relative inline-flex items-center gap-2">
        <motion.span
          initial={false}
          animate={{ width: on ? 14 : 0, opacity: on ? 1 : 0 }}
          className="inline-block overflow-hidden"
          transition={{ duration: 0.3, ease: EASE }}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="m5 12 5 5 9-10" />
          </svg>
        </motion.span>
        {children}
      </span>
    </button>
  );
}

function Success({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] bg-ink px-6 py-16 text-center text-white"
      role="status"
    >
      <div className="relative">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
            style={{ background: i % 2 ? "#DAF50A" : "#6C3EFC" }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos((i / 12) * Math.PI * 2) * 110, y: Math.sin((i / 12) * Math.PI * 2) * 110, opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.35 }}
          />
        ))}
        <motion.div
          className="grid h-24 w-24 place-items-center rounded-full bg-lime text-ink"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <motion.path d="m5 12 5 5 9-10" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.4 }} />
          </svg>
        </motion.div>
      </div>
      <h2 className="mt-10 font-display text-[clamp(40px,5vw,64px)] leading-none">Message sent!</h2>
      <p className="mt-4 max-w-md text-lg text-white/70">Thanks for reaching out. I’ll get back to you within 24 hours, usually sooner.</p>
      <button type="button" onClick={onReset} className="link-underline mt-8 font-bold text-lime">
        Send another message
      </button>
    </motion.div>
  );
}

export function ContactView() {
  const [types, setTypes] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState({ name: "", email: "", company: "", message: "" });

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: "" }));
  };

  const mailto = () => {
    const body = `Hi George,\n\n${values.message}\n\nProject type: ${types.join(", ") || "-"}\nBudget: ${budget || "-"}\n\n${values.name}${
      values.company ? ` (${values.company})` : ""
    }\n${values.email}`;
    return `mailto:${site.email}?subject=${encodeURIComponent(`New project enquiry from ${values.name || "your website"}`)}&body=${encodeURIComponent(body)}`;
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("_honey")) return;
    const er: Record<string, string> = {};
    if (!values.name.trim()) er.name = "Please tell me your name";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) er.email = "Please enter a valid email";
    if (values.message.trim().length < 10) er.message = "A little more detail helps (10+ characters)";
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus("sending");
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${site.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New project enquiry from ${values.name}`,
          _template: "table",
          _captcha: "false",
          name: values.name,
          email: values.email,
          company: values.company,
          project_type: types.join(", "),
          budget,
          message: values.message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) !== "true") throw new Error("send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const reset = () => {
    setValues({ name: "", email: "", company: "", message: "" });
    setTypes([]);
    setBudget("");
    setStatus("idle");
  };

  const channels = [
    { label: "WhatsApp", value: site.whatsapp.replace(/(\+\d{3})(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4"), href: site.whatsappLink, note: "Fastest reply" },
    { label: "Upwork", value: "Hire me on Upwork", href: site.socials[0].href, note: "Secure contracts" },
    { label: "LinkedIn", value: "George Nnamdi", href: site.socials[1].href, note: "Let’s connect" },
    { label: "X (Twitter)", value: "@George_nocode", href: site.socials[2].href, note: "Build in public" },
  ];

  return (
    <>
      <PageHeader
        label="Contact"
        lines={["Let’s work", <span key="b" className="text-purple">together</span>]}
        intro="Tell me about your project: an app idea, a booking system, an integration or a workflow to automate. I reply within 24 hours."
      />

      <section className="container-x pb-24 md:pb-36">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* left: channels */}
          <div className="lg:col-span-5">
            <Reveal>
              <div className="rounded-[28px] bg-ink p-7 text-white md:p-9">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/50">Email me directly</p>
                <CopyEmail email={site.email} className="mt-3 block break-all text-left font-display text-[clamp(24px,2.4vw,36px)] leading-tight text-lime hover:text-white" />
                <p className="mt-2 text-sm text-white/50">Click to copy</p>
                <div className="mt-8 flex items-center justify-between border-t border-white/12 pt-6 text-sm">
                  <span className="inline-flex items-center gap-2 font-bold">
                    <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-green-500" />
                    Available for projects
                  </span>
                  <span className="text-white/60">
                    Lagos · <LocalTime timeZone={site.timezone} />
                  </span>
                </div>
              </div>
            </Reveal>

            <ul className="mt-4 grid gap-3">
              {channels.map((c, i) => (
                <Reveal key={c.label} delay={0.05 * i}>
                  <li>
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex items-center justify-between overflow-hidden rounded-[22px] bg-mist px-6 py-5 transition-colors duration-500 hover:text-white"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-violet transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
                      <span className="relative">
                        <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-purple transition-colors group-hover:text-lime">{c.label}</span>
                        <span className="mt-1 block text-lg font-bold">{c.value}</span>
                      </span>
                      <span className="relative flex items-center gap-3">
                        <span className="hidden text-sm font-semibold text-muted transition-colors group-hover:text-white/70 sm:inline">{c.note}</span>
                        <span className="grid h-11 w-11 -rotate-45 place-items-center rounded-full bg-white text-ink transition-transform duration-500 group-hover:rotate-0">
                          <Arrow className="h-4 w-4" />
                        </span>
                      </span>
                    </a>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* right: form */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {status === "sent" ? (
                <Success onReset={reset} />
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  noValidate
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-[28px] p-6 ring-1 ring-line md:p-10"
                >
                  <Reveal>
                    <fieldset>
                      <legend className="mb-4 text-sm font-extrabold uppercase tracking-[0.16em] text-muted">What do you need?</legend>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map((t) => (
                          <Chip key={t} on={types.includes(t)} onClick={() => setTypes((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]))}>
                            {t}
                          </Chip>
                        ))}
                      </div>
                    </fieldset>
                  </Reveal>

                  <div className="mt-8 grid gap-2 md:grid-cols-2 md:gap-x-8">
                    {(
                      [
                        ["name", "Your name", "text", "name"],
                        ["email", "Email address", "email", "email"],
                      ] as const
                    ).map(([k, label, type, ac]) => (
                      <Reveal key={k} delay={0.05}>
                        <div className={`field ${errors[k] ? "has-error" : ""}`}>
                          <input id={k} name={k} type={type} autoComplete={ac} placeholder=" " value={values[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} />
                          <label htmlFor={k}>{label} *</label>
                          <span className="bar" />
                        </div>
                        <AnimatePresence>
                          {errors[k] && (
                            <motion.p id={`${k}-err`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm font-semibold text-[#e5484d]">
                              {errors[k]}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </Reveal>
                    ))}
                  </div>

                  <Reveal delay={0.05} className="mt-2">
                    <div className="field">
                      <input id="company" name="company" type="text" autoComplete="organization" placeholder=" " value={values.company} onChange={set("company")} />
                      <label htmlFor="company">Company or project name</label>
                      <span className="bar" />
                    </div>
                  </Reveal>

                  <Reveal delay={0.05} className="mt-2">
                    <div className={`field ${errors.message ? "has-error" : ""}`}>
                      <textarea id="message" name="message" placeholder=" " value={values.message} onChange={set("message")} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
                      <label htmlFor="message">Tell me about your project *</label>
                      <span className="bar" />
                    </div>
                    <AnimatePresence>
                      {errors.message && (
                        <motion.p id="message-err" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm font-semibold text-[#e5484d]">
                          {errors.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </Reveal>

                  <Reveal delay={0.05} className="mt-8">
                    <fieldset>
                      <legend className="mb-4 text-sm font-extrabold uppercase tracking-[0.16em] text-muted">Budget (USD)</legend>
                      <div className="flex flex-wrap gap-2">
                        {BUDGETS.map((b) => (
                          <Chip key={b} on={budget === b} onClick={() => setBudget(budget === b ? "" : b)}>
                            {b}
                          </Chip>
                        ))}
                      </div>
                    </fieldset>
                  </Reveal>

                  <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="submit" variant="purple" size="lg" disabled={status === "sending"}>
                      {status === "sending" ? "Sending…" : "Send message"}
                    </Button>
                    <p className="text-sm text-muted">I reply within 24 hours.</p>
                  </div>

                  <AnimatePresence>
                    {status === "error" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                        role="alert"
                      >
                        <p className="mt-6 rounded-2xl bg-lilac p-5 text-[15px] font-semibold text-ink">
                          The form couldn’t send right now.{" "}
                          <a href={mailto()} className="link-underline font-extrabold text-purple">
                            Send it by email instead
                          </a>{" "}
                          or message me on{" "}
                          <a href={site.whatsappLink} target="_blank" rel="noopener noreferrer" className="link-underline font-extrabold text-purple">
                            WhatsApp
                          </a>
                          .
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
