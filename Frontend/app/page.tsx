import { MISHeroAnimated } from "@/components/ui/animated-landing-page";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

export const metadata = {
  title: "Meeting Intelligence System — Turn meetings into actionable intelligence",
  description:
    "Upload or record any meeting. Get instant AI transcription, smart highlights, and chat with your meeting data — powered by Whisper, Groq, and ChromaDB.",
};

export default function LandingPage() {
  return (
    <main>
      <MISHeroAnimated />
      <FeaturesSection />
    </main>
  );
}
