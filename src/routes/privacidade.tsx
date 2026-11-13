import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Miniaibit" },
      { name: "description", content: "Como o Miniaibit coleta, usa e protege suas informações." },
      { property: "og:title", content: "Política de Privacidade — Miniaibit" },
      { property: "og:description", content: "Como o Miniaibit coleta, usa e protege suas informações." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function H({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-6 border-b border-border pb-1.5 text-lg font-bold text-primary">{children}</h2>;
}

function Privacy() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 font-mono">
      <article className="mx-auto max-w-2xl border-2 border-border bg-card p-6 text-sm leading-relaxed text-card-foreground">
        <h1 className="text-2xl font-bold text-primary">Privacy Policy</h1>
        <p className="mb-5 text-xs text-muted-foreground">Last updated: November 05, 2026</p>
        <p className="mb-3">
          <strong>Miniaibit</strong>. We respect your privacy and are committed to protecting your personal data. This
          privacy policy explains how we collect, use, and safeguard your information when you use our mobile application.
        </p>
        <H>1. Information We Collect</H>
        <p className="mb-3">
          Miniaibit may collect certain information to provide you with the best possible experience. The types of
          information we may collect include:
        </p>
        <ul className="mb-4 ml-5 list-disc space-y-1.5">
          <li><strong>Device Information:</strong> Device type, operating system version, and unique device identifiers</li>
          <li><strong>Usage Data:</strong> App usage statistics and interaction patterns</li>
        </ul>
        <H>2. Permissions</H>
        <p className="mb-3">Our app may request the following permissions to provide its features:</p>
        <p className="mb-3">This app requests minimal permissions necessary for basic functionality.</p>
        <H>3. How We Use Your Information</H>
        <p className="mb-3">We use the information we collect to:</p>
        <ul className="mb-4 ml-5 list-disc space-y-1.5">
          <li>Provide and maintain our service</li>
          <li>Improve user experience and app functionality</li>
          <li>Display relevant advertisements (if applicable)</li>
          <li>Send push notifications (if enabled)</li>
          <li>Respond to customer support requests</li>
        </ul>
        <H>4. Third-Party Services</H>
        <p className="mb-3">Our app may use third-party services that collect information used to identify you. These may include:</p>
        <ul className="mb-4 ml-5 list-disc"><li><strong>Google Play Services</strong></li></ul>
        <H>5. Data Security</H>
        <p className="mb-3">
          We value your trust in providing us your personal information, thus we strive to use commercially acceptable
          means of protecting it. However, no method of transmission over the internet or electronic storage is 100%
          secure, and we cannot guarantee its absolute security.
        </p>
        <H>6. Children's Privacy</H>
        <p className="mb-3">
          Our app does not address anyone under the age of 13. We do not knowingly collect personally identifiable
          information from children under 13. If we discover that a child under 13 has provided us with personal
          information, we immediately delete this from our servers.
        </p>
        <H>7. Your Rights</H>
        <p className="mb-3">
          Depending on your location, you may have certain rights regarding your personal data, including the right to
          access, correct, or request deletion of your data.
        </p>
        <H>8. Changes to This Privacy Policy</H>
        <p className="mb-3">
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy
          Policy on this page.
        </p>
        <H>9. Contact Us</H>
        <div className="mt-4 border border-border bg-secondary p-4">
          <p className="mb-2">If you have any questions about this Privacy Policy, please contact us:</p>
          <p>Through the app's contact feature.</p>
        </div>
        <div className="mt-5 border-l-4 border-primary bg-secondary p-4">
          <strong>By using Miniaibit, you agree to this Privacy Policy.</strong>
        </div>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">← Voltar ao jogo</Link>
      </article>
    </div>
  );
}
