import Link from "next/link";

export default function Solutions() {
  return (
    <main className="pt-24 pb-section-gap">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(at_40%_20%,hsla(228,100%,74%,1)_0px,transparent_50%),radial-gradient(at_80%_0%,hsla(189,100%,56%,1)_0px,transparent_50%),radial-gradient(at_0%_50%,hsla(355,100%,93%,1)_0px,transparent_50%),radial-gradient(at_80%_50%,hsla(340,100%,76%,1)_0px,transparent_50%),radial-gradient(at_0%_100%,hsla(22,100%,77%,1)_0px,transparent_50%),radial-gradient(at_80%_100%,hsla(242,100%,70%,1)_0px,transparent_50%),radial-gradient(at_0%_0%,hsla(343,100%,76%,1)_0px,transparent_50%)] pointer-events-none"></div>
        <div className="max-w-container-max-width mx-auto px-margin-desktop relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm mb-8">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>Tailored Intelligence for High-Output Teams</span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6 max-w-4xl mx-auto">
            Built for the rigorous demands of modern{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
              Enterprise
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
            MeetMind adapts to your specific organizational workflows. From
            accelerating sales cycles to scaling institutional knowledge, deploy
            AI that actually understands your business context.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="font-label-md text-label-md text-white primary-gradient px-8 py-3.5 rounded-lg hover:brightness-110 hover:scale-[1.02] transition-all duration-200 shadow-ambient flex items-center justify-center gap-2"
            >
              Contact Sales
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
            <button className="font-label-md text-label-md text-primary bg-white border border-outline-variant/30 px-8 py-3.5 rounded-lg hover:bg-surface-container-low transition-all duration-200 shadow-sm">
              View Customer Stories
            </button>
          </div>
        </div>
      </section>

      {/* Enterprise Solutions */}
      <section className="py-section-gap bg-white relative">
        <div className="max-w-container-max-width mx-auto px-margin-desktop">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  corporate_fare
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Enterprise
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
                Scale organizational knowledge effortlessly. MeetMind securely
                processes thousands of hours of executive and operational
                meetings, creating a searchable, secure central brain for your
                entire company.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      security
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-[18px] font-semibold text-on-surface mb-1">
                      Bank-Grade Security
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      SOC2 Type II certified infrastructure with granular RBAC
                      and data residency options.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      lan
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-[18px] font-semibold text-on-surface mb-1">
                      Cross-Functional Sync
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Automatically route insights from leadership syncs to
                      relevant department heads securely.
                    </p>
                  </div>
                </div>
              </div>
              <button className="mt-10 font-label-md text-label-md text-primary border-b-2 border-primary pb-1 hover:text-on-primary-fixed-variant transition-colors duration-200 flex items-center gap-2">
                Contact Enterprise Sales{" "}
                <span className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
              </button>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="bg-surface rounded-2xl p-8 shadow-ambient border border-outline-variant/10 relative overflow-hidden group">
                <div className="absolute inset-0 primary-gradient opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                {/* Intelligence Highlight Card */}
                <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-primary relative z-10 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                      auto_awesome
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Q3 Board Strategy Extraction
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    "The executive team aligned on pausing the EMEA expansion to
                    focus capital on the AI product suite launch in Q4."
                  </p>
                  <div className="flex items-center justify-between text-label-sm font-label-sm text-outline">
                    <span>Source: Q3 Planning Offsite</span>
                    <span>Shared with: Dir+ Level</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      integration_instructions
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">
                      SSO Ready
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-outline-variant/10 flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      history_edu
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">
                      Audit Logs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sales Teams */}
      <section className="py-section-gap bg-surface-container-low relative">
        <div className="max-w-container-max-width mx-auto px-margin-desktop">
          <div className="flex flex-col lg:flex-row-reverse gap-16 items-center">
            <div className="lg:w-1/2">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  trending_up
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Sales Teams
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
                Shorten sales cycles by focusing on the conversation, not the
                CRM. MeetMind automatically captures MEDDIC criteria, identifies
                objections, and syncs directly to Salesforce or HubSpot.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      psychology
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-[18px] font-semibold text-on-surface mb-1">
                      Objection Analysis
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      AI detects hesitations and competitive mentions, providing
                      managers with actionable coaching moments.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      sync
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline-sm text-[18px] font-semibold text-on-surface mb-1">
                      Zero-Click CRM Sync
                    </h4>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Next steps, stakeholders, and pain points are extracted
                      and structured directly into your CRM fields.
                    </p>
                  </div>
                </div>
              </div>
              <button className="mt-10 font-label-md text-label-md text-primary border-b-2 border-primary pb-1 hover:text-on-primary-fixed-variant transition-colors duration-200 flex items-center gap-2">
                Contact Sales{" "}
                <span className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
              </button>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="glass-panel rounded-2xl p-8 shadow-ambient relative">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-sm text-[18px] text-on-surface">
                    Recent Discovery Call
                  </h3>
                  <span className="px-3 py-1 bg-surface-container rounded-full text-primary font-label-sm text-label-sm">
                    High Intent
                  </span>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant/10">
                    <div className="font-label-sm text-label-sm text-outline mb-1">
                      Identified Pain Point
                    </div>
                    <div className="font-body-md text-body-md text-on-surface font-medium">
                      "Current workflow takes 3 weeks to compile reports, losing
                      us critical momentum."
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-outline-variant/10">
                    <div className="font-label-sm text-label-sm text-outline mb-1">
                      Competitor Mentioned
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-[16px] text-error">
                        warning
                      </span>
                      <span className="font-body-md text-body-md text-on-surface">
                        LegacyCorp (Evaluating currently)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      cloud_sync
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">
                      Synced to Salesforce
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary">
                    Just now
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-section-gap px-margin-desktop max-w-container-max-width mx-auto">
        <div className="bg-primary rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden shadow-ambient">
          <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay bg-[radial-gradient(at_40%_20%,hsla(228,100%,74%,1)_0px,transparent_50%),radial-gradient(at_80%_0%,hsla(189,100%,56%,1)_0px,transparent_50%),radial-gradient(at_0%_50%,hsla(355,100%,93%,1)_0px,transparent_50%),radial-gradient(at_80%_50%,hsla(340,100%,76%,1)_0px,transparent_50%),radial-gradient(at_0%_100%,hsla(22,100%,77%,1)_0px,transparent_50%),radial-gradient(at_80%_100%,hsla(242,100%,70%,1)_0px,transparent_50%),radial-gradient(at_0%_0%,hsla(343,100%,76%,1)_0px,transparent_50%)]"></div>
          <div className="relative z-10">
            <h2 className="font-display-lg-mobile md:font-display-lg text-white mb-6">
              Ready to transform your meetings?
            </h2>
            <p className="font-body-lg text-white/80 max-w-2xl mx-auto mb-10">
              Join hundreds of high-performing teams using MeetMind to drive
              clarity, action, and revenue.
            </p>
            <Link
              href="/register"
              className="font-label-md text-label-md text-primary bg-white px-8 py-4 rounded-xl hover:scale-[1.02] transition-transform duration-200 shadow-ambient font-bold inline-block"
            >
              Contact Sales Today
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
