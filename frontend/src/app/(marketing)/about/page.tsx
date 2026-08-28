import Link from "next/link";

export default function AboutUs() {
  return (
    <main className="pt-24 pb-section-gap w-full">
      {/* Hero Section */}
      <section className="max-w-container-max-width mx-auto px-margin-desktop py-section-gap">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-background">
            Reclaiming{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
              Human Connection
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            We believe meetings should be moments of genuine collaboration, not
            administrative burdens. MeetMind automates the overhead, allowing
            high-output teams to focus on what truly matters: clear thought and
            decisive action.
          </p>
        </div>
        <div className="mt-16 rounded-2xl overflow-hidden ambient-shadow h-[400px] md:h-[500px] w-full relative">
          <div
            className="bg-cover bg-center w-full h-full absolute inset-0"
            style={{
              backgroundImage: "url('/screen.png')",
            }}
            title="A modern, minimalist corporate meeting room bathed in soft, natural sunlight"
          ></div>
        </div>
      </section>

      {/* Our Mission Section */}
      <section className="bg-surface-container-low py-section-gap">
        <div className="max-w-container-max-width mx-auto px-margin-desktop">
          <div className="grid md:grid-cols-2 gap-gutter items-center">
            <div className="space-y-6">
              <h2 className="font-headline-md text-headline-md text-on-background">
                Our Mission
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                The modern workplace is drowning in unstructured data and
                administrative noise. Our mission is to distill complexity into
                actionable clarity. By leveraging advanced AI to silently handle
                transcription, summarization, and action-item tracking, we free
                professionals to think deeper, move faster, and collaborate
                better.
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                We are building the intelligence layer for team communication—a
                system that works elegantly in the background, surfacing
                insights only when you need them.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow space-y-4 hover:-translate-y-1 transition-transform duration-200">
                <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-background text-lg">
                  Velocity
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                  Accelerating decision-making by removing meeting friction.
                </p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-2xl ambient-shadow space-y-4 hover:-translate-y-1 transition-transform duration-200 translate-y-8">
                <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-primary">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    auto_awesome
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-background text-lg">
                  Clarity
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                  Distilling hours of conversation into precise, actionable
                  intelligence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section (Bento Grid) */}
      <section className="max-w-container-max-width mx-auto px-margin-desktop py-section-gap">
        <div className="text-center mb-12">
          <h2 className="font-headline-md text-headline-md text-on-background">
            Our Values
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-4 max-w-2xl mx-auto">
            The principles that guide our design, our engineering, and our team
            culture.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter auto-rows-[250px]">
          {/* Value 1 (Span 2) */}
          <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/20 flex flex-col justify-between hover:shadow-xl transition-shadow duration-200 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-primary/10 transition-colors duration-500"></div>
            <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center mb-4 z-10">
              <span className="material-symbols-outlined">design_services</span>
            </div>
            <div className="z-10">
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-2">
                Clarity Over Clutter
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                We design systems that reduce cognitive load. Every feature,
                pixel, and interaction must serve a functional purpose to
                maintain a calm, focused environment.
              </p>
            </div>
          </div>
          {/* Value 2 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/20 flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-2 text-xl">
                Absolute Privacy
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                Your meeting data is sacred. We employ end-to-end encryption and
                zero-retention policies.
              </p>
            </div>
          </div>
          {/* Value 3 */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border border-outline-variant/20 flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">speed</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-2 text-xl">
                Uncompromising Speed
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                Performance is a feature. We engineer for instantaneous feedback
                and zero latency.
              </p>
            </div>
          </div>
          {/* Value 4 (Span 2) */}
          <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl p-8 ambient-shadow border-l-4 border-l-primary flex flex-col justify-between hover:shadow-xl transition-shadow duration-200">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded flex items-center justify-center mb-4">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-2">
                MeetMind Intelligence
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Our AI doesn't just transcribe; it understands. We strive for
                state-of-the-art models that provide nuanced, contextual insights
                subtly integrated into your workflow.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
