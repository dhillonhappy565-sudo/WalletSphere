import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

import Navbar from "../components/layout/Navbar";

function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      {/* HERO */}
      <main>
        <section className="relative overflow-hidden pb-24 pt-32 sm:pb-28 sm:pt-36">

          {/* Hero background */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* Very soft base gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/70 via-white to-white" />

            <div className="hero-grid absolute inset-0 opacity-60" />

            {/* Left glow */}
            <div className="absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-[110px]" />

            {/* Right glow */}
            <div className="absolute -right-32 top-10 h-[460px] w-[460px] rounded-full bg-teal-200/35 blur-[120px]" />

            {/* Center glow */}
            <div className="absolute left-1/2 top-52 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-green-100/40 blur-[120px]" />

            {/* Decorative blurred circles */}
            <div className="absolute left-[10%] top-40 h-20 w-20 rounded-full border border-emerald-200/60 bg-white/30 backdrop-blur-sm" />

            <div className="absolute right-[12%] top-52 h-28 w-28 rounded-full border border-teal-200/50 bg-white/20 backdrop-blur-sm" />
          </div>

          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-4xl text-center">

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur-sm">
                <Sparkles size={16} className="animate-pulse" />
                Smarter personal finance starts here
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-6xl xl:text-7xl">
                Take control of your money,
                <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                  {" "}one decision at a time.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Track your spending, manage budgets and understand
                your finances with a simple dashboard built to help
                you make smarter financial decisions.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-emerald-600/20 sm:w-auto"
                >
                  Start for free
                  <ArrowRight size={17} />
                </Link>

                <a
                  href="#features"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-6 py-3.5 text-center text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white sm:w-auto"
                >
                  Explore features
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="features"
          className="relative overflow-hidden border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white py-20 sm:py-24"
        >
          <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-emerald-100/40 blur-[120px]" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">

            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                Everything in one place
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Managing money shouldn't feel complicated.
              </h2>

              <p className="mt-4 text-slate-600">
                WalletSphere gives you the tools you need without
                overwhelming you with unnecessary information.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={ReceiptText}
                title="Track Transactions"
                description="Keep your income and expenses organized in one simple place."
              />

              <FeatureCard
                icon={PiggyBank}
                title="Smart Budgets"
                description="Create monthly budgets and know exactly how much you have left to spend."
              />

              <FeatureCard
                icon={BarChart3}
                title="Visual Analytics"
                description="Turn your financial activity into simple charts that are easy to understand."
              />

              <FeatureCard
                icon={Target}
                title="Savings Goals"
                description="Set financial goals and follow your progress as your savings grow."
              />

              <FeatureCard
                icon={TrendingUp}
                title="Financial Insights"
                description="Understand spending patterns and make better financial decisions."
              />

              <FeatureCard
                icon={ShieldCheck}
                title="Secure by Design"
                description="Your account and financial information are protected with secure authentication."
              />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid items-center gap-14 lg:grid-cols-2">

              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                  Simple by design
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Your finances become clearer in three simple steps.
                </h2>

                <p className="mt-5 max-w-xl leading-7 text-slate-600">
                  WalletSphere focuses on showing you the information
                  that matters without turning personal finance into
                  another complicated task.
                </p>
              </div>

              <div className="space-y-4">
                <Step
                  number="01"
                  title="Add your transactions"
                  text="Record income and expenses or import transaction data."
                />

                <Step
                  number="02"
                  title="Organize your money"
                  text="Categorize spending and create budgets for the things that matter."
                />

                <Step
                  number="03"
                  title="Understand your finances"
                  text="Use visual insights and reports to make informed decisions."
                />
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center text-white sm:px-12 sm:py-16 shadow-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Make your money make sense.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Start organizing your finances and build better
              financial habits with WalletSphere.
            </p>

            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
            >
              Create your account
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer
        id="about"
        className="border-t border-slate-200 bg-white"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Wallet size={17} />
            </div>

            <span className="font-bold">
              WalletSphere
            </span>
          </div>

          <p className="text-sm text-slate-500">
            Personal Finance Management & Analytics Platform
          </p>

          <p className="text-sm text-slate-400">
            © 2026 WalletSphere
          </p>

        </div>
      </footer>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
        <Icon size={21} />
      </div>

      <h3 className="mt-5 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
        {number}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          {text}
        </p>
      </div>
    </div>
  );
}

export default Landing;
