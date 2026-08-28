import Link from "next/link";

export default function Pricing() {
  return (
    <main className="w-full pt-16">
      {/* How it Works Section */}
      <section
        className="py-24 bg-surface-container-low overflow-hidden"
        id="how-it-works"
      >
        <div className="max-w-[1280px] mx-auto px-gutter">
          <div className="text-center mb-16">
            <span className="font-label-sm text-label-sm text-primary tracking-widest uppercase bg-primary/10 px-4 py-1.5 rounded-full">
              The Workflow
            </span>
            <h2 className="font-headline-md text-headline-md mt-6 text-on-surface">
              Intelligence in three simple steps
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mt-4">
              MeetMind works in the background, allowing you to focus on the
              conversation while we handle the cognitive heavy lifting.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1: Record */}
            <div className="group relative bg-surface-container-lowest p-10 rounded-[24px] shadow-ambient transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl primary-gradient flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/20">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  mic
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-4">
                1. Record
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Simply start your meeting. Our AI integrates seamlessly with
                Zoom, Teams, and Google Meet to capture every nuance without
                distraction.
              </p>
              <div className="mt-8 pt-8 border-t border-surface-variant/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-xs font-medium text-on-surface-variant/70 uppercase tracking-tighter">
                    Live Capture Active
                  </span>
                </div>
              </div>
            </div>
            {/* Step 2: Analyze */}
            <div className="group relative bg-surface-container-lowest p-10 rounded-[24px] shadow-ambient transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl primary-gradient flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/20">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  psychology
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-4">
                2. Analyze
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Our proprietary MeetMind engine parses unstructured dialogue,
                identifying key decisions, speakers, and emotional context in
                real-time.
              </p>
              <div className="mt-8 pt-8 border-t border-surface-variant/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                  <span className="text-xs font-medium text-on-surface-variant/70 uppercase tracking-tighter">
                    NLP Engines Engaged
                  </span>
                </div>
              </div>
            </div>
            {/* Step 3: Act */}
            <div className="group relative bg-surface-container-lowest p-10 rounded-[24px] shadow-ambient transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl primary-gradient flex items-center justify-center text-white mb-8 shadow-lg shadow-primary/20">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  bolt
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-4">3. Act</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Receive instant action items, automated summaries, and follow-up
                emails synced directly to your existing project management
                tools.
              </p>
              <div className="mt-8 pt-8 border-t border-surface-variant/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="text-xs font-medium text-on-surface-variant/70 uppercase tracking-tighter">
                    Output Generated
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-surface" id="pricing">
        <div className="max-w-[1280px] mx-auto px-gutter">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Precision Pricing
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-4">
              Choose the plan that fits your team's output.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-surface-container-lowest p-12 rounded-[24px] border border-outline-variant/30 flex flex-col items-start transition-all duration-300 hover:shadow-xl">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest mb-4">
                Free
              </span>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold font-display-lg">$0</span>
                <span className="text-on-surface-variant font-label-md">
                  /month
                </span>
              </div>
              <ul className="space-y-4 mb-10 w-full">
                <li className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  5 meetings per month
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  Basic transcript capture
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-body-md">
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                  Email summaries
                </li>
              </ul>
              <Link
                href="/register"
                className="w-full text-center py-4 px-6 rounded-xl border border-outline text-on-surface font-label-md hover:bg-surface-variant transition-colors mt-auto block"
              >
                Get Started
              </Link>
            </div>
            {/* Pro Tier */}
            <div className="primary-gradient p-12 rounded-[24px] flex flex-col items-start shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                <span className="material-symbols-outlined text-[120px]">
                  auto_awesome
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-widest mb-4">
                Pro
              </span>
              <div className="flex items-baseline gap-1 mb-8 text-white">
                <span className="text-5xl font-bold font-display-lg">$29</span>
                <span className="text-primary-fixed font-label-md">
                  /month
                </span>
              </div>
              <ul className="space-y-4 mb-10 w-full text-white">
                <li className="flex items-center gap-3 font-body-md">
                  <span className="material-symbols-outlined text-white text-xl">
                    check_circle
                  </span>
                  Unlimited meetings
                </li>
                <li className="flex items-center gap-3 font-body-md">
                  <span className="material-symbols-outlined text-white text-xl">
                    check_circle
                  </span>
                  Real-time AI highlights
                </li>
                <li className="flex items-center gap-3 font-body-md">
                  <span className="material-symbols-outlined text-white text-xl">
                    check_circle
                  </span>
                  CRM & Slack integrations
                </li>
                <li className="flex items-center gap-3 font-body-md">
                  <span className="material-symbols-outlined text-white text-xl">
                    check_circle
                  </span>
                  Dedicated support
                </li>
              </ul>
              <Link
                href="/register"
                className="w-full text-center py-4 px-6 rounded-xl bg-white text-primary font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 mt-auto block"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final High-Impact CTA */}
      <section className="py-24 px-gutter">
        <div className="max-w-[1280px] mx-auto">
          <div className="bg-inverse-surface rounded-[24px] p-16 text-center relative overflow-hidden flex flex-col items-center">
            <div className="relative z-10 max-w-3xl">
              <h2 className="font-display-lg text-display-lg text-white mb-6">
                Ready to upgrade your meetings?
              </h2>
              <p className="font-body-lg text-body-lg text-surface-variant/80 mb-10">
                Join 5,000+ high-performance teams using MeetMind
                to reclaim their focus and drive results.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="px-10 py-5 bg-white text-primary rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:-translate-y-1 block"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/solutions"
                  className="px-10 py-5 bg-transparent text-white border border-white/20 rounded-xl font-medium text-lg hover:bg-white/5 transition-colors block"
                >
                  Schedule Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
