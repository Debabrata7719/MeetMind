import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white pt-20 pb-10 border-t border-outline-variant/30">
      <div className="max-w-container-max-width mx-auto px-gutter grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">
                auto_awesome
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
              MeetMind
            </span>
          </div>
          <p className="text-on-surface-variant max-w-[240px]">
            Empowering executive teams with high-precision meeting intelligence
            and actionable insights.
          </p>
        </div>
        <div>
          <h4 className="font-label-md text-label-md text-on-surface font-bold mb-6">
            Product
          </h4>
          <ul className="space-y-4 text-on-surface-variant font-label-md">
            <li>
              <Link className="hover:text-primary" href="/solutions">
                Features
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Transcription
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Enterprise
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-md text-label-md text-on-surface font-bold mb-6">
            Company
          </h4>
          <ul className="space-y-4 text-on-surface-variant font-label-md">
            <li>
              <Link className="hover:text-primary" href="/about">
                About Us
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Careers
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-label-md text-label-md text-on-surface font-bold mb-6">
            Legal
          </h4>
          <ul className="space-y-4 text-on-surface-variant font-label-md">
            <li>
              <Link className="hover:text-primary" href="#">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Security
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="#">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-container-max-width mx-auto px-gutter pt-10 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          © 2024 MeetMind Intelligence AI. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link className="text-on-surface-variant hover:text-primary" href="#">
            <span className="material-symbols-outlined">public</span>
          </Link>
          <Link className="text-on-surface-variant hover:text-primary" href="#">
            <span className="material-symbols-outlined">alternate_email</span>
          </Link>
          <Link className="text-on-surface-variant hover:text-primary" href="#">
            <span className="material-symbols-outlined">share</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
