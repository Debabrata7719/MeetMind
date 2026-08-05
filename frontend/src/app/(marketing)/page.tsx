import Link from "next/link";

export default function Home() {
  return (
    <main className="relative pt-16">
      {/* Hero Section */}
      <section className="relative min-h-[921px] flex flex-col items-center justify-center pt-20 pb-40 px-gutter overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-primary/5 blur-[120px] rounded-full opacity-100 translate-y-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[70%] bg-tertiary/5 blur-[120px] rounded-full opacity-100 translate-y-0"></div>
        <div className="max-w-[800px] text-center z-10 opacity-100 translate-y-0">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now powered by MeetMind GPT-4o
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6 leading-tight tracking-tighter">
            Turn every meeting into a{" "}
            <span className="text-primary italic">competitive advantage.</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-[640px] mx-auto">
            Experience clarity like never before. Our AI captures, transcribes,
            and distills your conversations into high-impact highlights, tasks,
            and searchable intelligence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto primary-gradient text-white px-8 py-4 rounded-xl font-label-md text-label-md font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Start for Free
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link
              href="/solutions"
              className="w-full sm:w-auto bg-white border border-outline-variant text-on-surface px-8 py-4 rounded-xl font-label-md text-label-md font-bold hover:bg-surface-container-low transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_circle</span>
              See it in action
            </Link>
          </div>
        </div>
        {/* Product Mockup */}
        <div className="mt-20 w-full max-w-container-max-width mx-auto px-4 z-10 relative opacity-100 translate-y-0">
          <div className="relative rounded-[32px] p-2 bg-gradient-to-br from-white via-surface-variant/30 to-white shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="rounded-[24px] overflow-hidden bg-white border border-outline-variant/30 relative">
              {/* Simulated Top Bar */}
              <div className="h-10 border-b border-outline-variant/20 flex items-center px-6 gap-2 bg-surface-container-lowest">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/20"></div>
                </div>
              </div>
              <img
                className="w-full h-auto block aspect-[16/10] object-cover"
                src="/luminova-dashboard.png"
                alt="MeetMind Dashboard Mockup"
              />
              {/* Floating Highlight Card */}
              <div className="absolute bottom-12 right-12 glass-panel p-6 rounded-2xl max-w-[280px] ambient-shadow border-l-4 border-primary animate-bounce-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    auto_awesome
                  </span>
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider">
                    AI Highlight
                  </span>
                </div>
                <p className="font-label-md text-label-md text-on-surface leading-snug">
                  "The engineering team agreed to prioritize the latency issue in
                  the next sprint, targeting a 20% improvement."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-section-gap px-gutter bg-surface-container-low/50 relative">
        <div className="max-w-container-max-width mx-auto opacity-100 translate-y-0">
          <div className="text-center mb-16">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
              Precision-engineered for high-output teams.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[600px] mx-auto">
              Stop taking notes and start leading the conversation. MeetMind
              captures every nuance so you don't have to.
            </p>
          </div>
          {/* Bento Grid / 3-Column Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-[24px] ambient-shadow hover:translate-y-[-4px] transition-all duration-300 border border-transparent hover:border-primary/10">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">
                  transcribe
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                Instant Transcription
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Stop taking notes and start leading the conversation. MeetMind
                captures every nuance so you don't have to.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    check_circle
                  </span>
                  99.9% accuracy rate
                </li>
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    check_circle
                  </span>
                  Real-time speaker labels
                </li>
              </ul>
            </div>
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-[24px] ambient-shadow hover:translate-y-[-4px] transition-all duration-300 border border-transparent hover:border-primary/10">
              <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-6">
                <span className="material-symbols-outlined text-2xl">
                  insights
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                AI-Powered Insights
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Stop taking notes and start leading the conversation. MeetMind
                captures every nuance so you don't have to.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    check_circle
                  </span>
                  Action item extraction
                </li>
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    check_circle
                  </span>
                  Sentiment analysis
                </li>
              </ul>
            </div>
            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-[24px] ambient-shadow hover:translate-y-[-4px] transition-all duration-300 border border-transparent hover:border-primary/10">
              <div className="w-12 h-12 rounded-xl bg-on-surface/5 flex items-center justify-center text-on-surface mb-6">
                <span className="material-symbols-outlined text-2xl">
                  forum
                </span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                Interactive Chat
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Stop taking notes and start leading the conversation. MeetMind
                captures every nuance so you don't have to.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    check_circle
                  </span>
                  Contextual awareness
                </li>
                <li className="flex items-center gap-3 text-label-md font-label-md text-on-surface">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    check_circle
                  </span>
                  Slack & Teams integration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-section-gap px-gutter">
        <div className="max-w-container-max-width mx-auto rounded-[40px] primary-gradient p-12 md:p-20 text-center relative overflow-hidden opacity-100 translate-y-0">
          <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px]"></div>
          <h2 className="font-display-lg-mobile md:font-headline-md text-white mb-6 relative z-10">
            Ready to lead smarter meetings?
          </h2>
          <p className="font-body-lg text-white/80 max-w-[600px] mx-auto mb-10 relative z-10">
            Join over 5,000 teams using MeetMind Intelligence to reclaim their
            time and drive better results.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link
              href="/register"
              className="bg-white text-primary px-8 py-4 rounded-xl font-label-md text-label-md font-bold hover:bg-surface-container-low transition-all shadow-xl inline-block"
            >
              Start for Free
            </Link>
            <Link
              href="/solutions"
              className="bg-transparent border border-white/30 text-white px-8 py-4 rounded-xl font-label-md text-label-md font-bold hover:bg-white/10 transition-all inline-block"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
