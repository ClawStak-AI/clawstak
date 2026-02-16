# Write SEO landing page copy for ClawStak.ai

*Source: worker-2 fleet*

---

Implementation plan:


# Implementation Plan: SEO Landing Page for ClawStak.ai

## 1. Files to Create or Modify

```
src/
├── pages/
│   └── landing/
│       ├── LandingPage.tsx                 # Page-level orchestrator component
│       ├── LandingPage.test.tsx            # Integration tests for full page
│       └── index.ts                        # Barrel export
├── components/
│   └── landing/
│       ├── HeroSection.tsx                 # Hero headline + primary CTA
│       ├── HeroSection.test.tsx
│       ├── FeatureSection.tsx              # Reusable feature block (marketplace, A2A, trust)
│       ├── FeatureSection.test.tsx
│       ├── SocialProofSection.tsx          # Logos, testimonials, metrics
│       ├── SocialProofSection.test.tsx
│       ├── PricingSection.tsx              # Free / Pro / Enterprise tiers
│       ├── PricingSection.test.tsx
│       ├── PricingTierCard.tsx             # Individual pricing card
│       ├── PricingTierCard.test.tsx
│       ├── FAQSection.tsx                  # Accordion FAQ
│       ├── FAQSection.test.tsx
│       ├── CTASection.tsx                  # Bottom-of-page call to action
│       ├── CTASection.test.tsx
│       └── index.ts                        # Barrel exports
├── data/
│   └── landing/
│       ├── features.ts                     # Feature content data
│       ├── pricing.ts                      # Pricing tiers data
│       ├── faq.ts                          # FAQ Q&A pairs
│       ├── socialProof.ts                  # Testimonials, logos, metrics
│       └── seo.ts                          # Meta tags, structured data (JSON-LD)
├── types/
│   └── landing.ts                          # TypeScript interfaces
├── hooks/
│   └── useFAQSchema.ts                     # Generates FAQPage JSON-LD
├── utils/
│   └── structuredData.ts                   # JSON-LD builder utilities
│   └── structuredData.test.ts
├── styles/
│   └── landing/
│       └── landing.module.css              # Page-specific styles (CSS Modules)
└── e2e/
    └── landing.spec.ts                     # Playwright E2E tests
```

---

## 2. Key Design Decisions

### 2.1 Architecture: Content/Presentation Separation

All copy lives in `src/data/landing/*.ts` — **never hardcoded in components**. This is the single most important decision. It enables:

- Non-engineer copy edits without touching component logic
- Future CMS integration (swap static imports for API calls)
- A/B testing at the data layer
- i18n readiness

```typescript
// src/types/landing.ts

export interface Feature {
  id: string;
  slug: string;                    // URL-friendly ID for anchor links
  headline: string;
  subheadline: string;
  description: string;
  bulletPoints: string[];
  icon: string;                    // Icon identifier (e.g., "marketplace", "a2a", "trust")
  ctaText: string;
  ctaHref: string;
}

export interface PricingTier {
  id: string;
  name: 'Free' | 'Pro' | 'Enterprise';
  price: string;                   // "$0" | "$49/mo" | "Custom"
  priceSubtext?: string;           // "forever" | "per seat/month" | "contact sales"
  description: string;
  features: string[];
  highlighted: boolean;            // Visual emphasis (Pro tier)
  ctaText: string;
  ctaHref: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;                  // Supports markdown-light (bold, links)
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}

export interface SocialProofMetric {
  value: string;                   // "10,000+" 
  label: string;                   // "Agents Deployed"
}

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  keywords: string[];
}
```

### 2.2 SEO Strategy: Server-Side Rendering + Structured Data

- **SSR/SSG via Next.js `generateMetadata`** — all meta tags rendered server-side.
- **JSON-LD structured data** — `FAQPage` schema for FAQ section, `Product` schema for pricing, `Organization` schema for social proof.
- **Semantic HTML** — `<main>`, `<section>`, `<article>`, `<h1>`→`<h3>` hierarchy. Exactly ONE `<h1>` on the page.
- **Anchor links** for each section (`#marketplace`, `#a2a`, `#trust-scoring`, `#pricing`, `#faq`).
- **`loading="lazy"`** on below-fold images; critical images use `priority` prop.

```typescript
// src/data/landing/seo.ts

import type { SEOMetadata } from '@/types/landing';

export const seoMetadata: SEOMetadata = {
  title: 'ClawStak.ai — The Agent Marketplace with Built-In Trust',
  description:
    'Discover, deploy, and orchestrate AI agents with ClawStak.ai. ' +
    'Agent-to-agent protocols, trust scoring, and a marketplace built for developers.',
  canonicalUrl: 'https://clawstak.ai',
  ogImage: 'https://clawstak.ai/og-landing.png',
  keywords: [
    'AI agent marketplace',
    'agent-to-agent protocol',
    'A2A',
    'trust scoring',
    'AI orchestration',
    'developer tools',
    'ClawStak',
  ],
};
```

### 2.3 Component API Design

Components are **stateless and data-driven**. Each section receives its content as props.

```typescript
// Component signatures

// HeroSection — single h1, tagline, dual CTAs
interface HeroSectionProps {
  headline: string;          // "Ship Trusted AI Agents. Together."
  subheadline: string;       // The value prop paragraph
  primaryCTA: { text: string; href: string };
  secondaryCTA: { text: string; href: string };
}

// FeatureSection — renders a single feature with alternating layout
interface FeatureSectionProps {
  feature: Feature;
  index: number;             // Used for alternating left/right layout
}

// SocialProofSection
interface SocialProofSectionProps {
  metrics: SocialProofMetric[];
  testimonials: Testimonial[];
  logoUrls: string[];
}

// PricingSection — orchestrates tier cards
interface PricingSectionProps {
  headline: string;
  tiers: PricingTier[];
}

// PricingTierCard — individual card
interface PricingTierCardProps {
  tier: PricingTier;
}

// FAQSection — accessible accordion
interface FAQSectionProps {
  headline: string;
  items: FAQItem[];
}

// CTASection — final conversion block
interface CTASectionProps {
  headline: string;
  subtext: string;
  primaryCTA: { text: string; href: string };
}
```

### 2.4 Styling Approach

- **CSS Modules** for scoped styles — no runtime CSS-in-JS overhead (critical for LCP).
- **CSS custom properties** for theming (dark developer-friendly palette).
- **No Tailwind** — explicit class names are more readable for a content-heavy page and produce smaller CSS bundles for a single page.
- **Container queries** for responsive feature sections.

### 2.5 Accessibility

- FAQ uses `<details>`/`<summary>` native HTML (progressive enhancement, no JS required for core functionality).
- All interactive elements have visible focus indicators.
- Color contrast ≥ 4.5:1 (WCAG AA).
- Pricing comparison is a semantic `<ul>` per tier, not a table (better screen reader experience for card layouts).

---

## 3. Implementation Approach

### Phase 1: Data Layer + Types (1-2 hours)

Create `types/landing.ts` and all files under `data/landing/`. This is the content authoring pass.

```typescript
// src/data/landing/features.ts

import type { Feature } from '@/types/landing';

export const features: Feature[] = [
  {
    id: 'marketplace',
    slug: 'marketplace',
    headline: 'A Marketplace Built for Agents',
    subheadline: 'Discover and deploy production-ready AI agents in minutes.',
    description:
      'Browse a curated registry of AI agents built by the community. ' +
      'Filter by capability, runtime, and trust score. One-click deploy to your stack.',
    bulletPoints: [
      'Curated agent registry with semantic search',
      'One-click deployment to any cloud provider',
      'Version pinning and rollback support',
      'Usage analytics and cost tracking per agent',
    ],
    icon: 'marketplace',
    ctaText: 'Explore the Marketplace',
    ctaHref: '/marketplace',
  },
  {
    id: 'a2a',
    slug: 'a2a',
    headline: 'Native Agent-to-Agent Protocols',
    subheadline: 'Your agents talk to each other — securely and natively.',
    description:
      'ClawStak implements the A2A protocol so agents negotiate, delegate, ' +
      'and collaborate without custom integration code. Define capabilities, ' +
      'discover peers, and orchestrate multi-agent workflows declaratively.',
    bulletPoints: [
      'First-class A2A protocol implementation',
      'Declarative multi-agent workflow orchestration',
      'Capability-based agent discovery',
      'End-to-end encrypted agent communication',
    ],
    icon: 'a2a',
    ctaText: 'Read the A2A Docs',
    ctaHref: '/docs/a2a',
  },
  {
    id: 'trust-scoring',
    slug: 'trust-scoring',
    headline: 'Trust Scoring You Can Verify',
    subheadline: 'Every agent earns its reputation. Transparent. Auditable. On-chain optional.',
    description:
      'ClawStak computes a composite trust score from runtime behavior, ' +
      'community reviews, security audits, and uptime history. ' +
      'Scores are transparent and queryable via API.',
    bulletPoints: [
      'Composite score from behavior, reviews, audits, uptime',
      'Fully queryable via REST and GraphQL APIs',
      'Optional on-chain attestation for compliance',
      'Threshold-based deployment gates for enterprise',
    ],
    icon: 'trust',
    ctaText: 'See How Scoring Works',
    ctaHref: '/docs/trust-scoring',
  },
];
```

```typescript
// src/data/landing/pricing.ts

import type { PricingTier } from '@/types/landing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceSubtext: 'forever',
    description: 'For individual developers exploring agent orchestration.',
    features: [
      'Up to 3 deployed agents',
      'Community marketplace access',
      'Basic A2A protocol support',
      'Public trust scores',
      'Community support',
    ],
    highlighted: false,
    ctaText: 'Get Started Free',
    ctaHref: '/signup?plan=free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    priceSubtext: 'per seat / month',
    description: 'For teams building production agent workflows.',
    features: [
      'Unlimited deployed agents',
      'Private marketplace listings',
      'Full A2A orchestration engine',
      'Advanced trust scoring + custom thresholds',
      'Priority support (< 4hr SLA)',
      'Team roles and audit logs',
      'CI/CD integration',
    ],
    highlighted: true,
    ctaText: 'Start Pro Trial',
    ctaHref: '/signup?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceSubtext: 'contact sales',
    description: 'For organizations requiring compliance, SLAs, and dedicated infrastructure.',
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'On-chain trust attestation',
      'SSO / SAML / SCIM',
      'Custom SLA (up to 99.99%)',
      'Dedicated solutions engineer',
      'SOC 2 Type II compliance',
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
    ctaHref: '/contact?plan=enterprise',
  },
];
```

```typescript
// src/data/landing/faq.ts

import type { FAQItem } from '@/types/landing';

export const faqItems: FAQItem[] = [
  {
    id: 'what-is-clawstak',
    question: 'What is ClawStak.ai?',
    answer:
      'ClawStak.ai is a developer platform for discovering, deploying, and orchestrating ' +
      'AI agents. It combines a curated marketplace, native agent-to-agent (A2A) protocols, ' +
      'and a transparent trust scoring system.',
  },
  {
    id: 'what-is-a2a',
    question: 'What is the A2A protocol?',
    answer:
      'A2A (Agent-to-Agent) is a communication protocol that lets AI agents discover each other\'s ' +
      'capabilities, negotiate tasks, and collaborate — without requiring custom integration code. ' +
      'ClawStak provides a first-class implementation.',
  },
  {
    id: 'how-trust-scoring-works',
    question: 'How does trust scoring work?',
    answer:
      'Each agent receives a composite trust score derived from runtime behavior analysis, ' +
      'community reviews, third-party security audits, and historical uptime. Scores are ' +
      'fully transparent and queryable via our API.',
  },
  {
    id: 'free-tier-limits',
    question: 'What are the limits on the Free tier?',
    answer:
      'The Free tier supports up to 3 deployed agents, community marketplace access, ' +
      'basic A2A support, and public trust scores. No credit card required.',
  },
  {
    id: 'enterprise-compliance',
    question: 'Do you support SOC 2 and other compliance frameworks?',
    answer:
      'Yes. Our Enterprise tier includes SOC 2 Type II compliance, SSO/SAML/SCIM, ' +
      'and optional on-chain trust attestation for auditability.',
  },
  {
    id: 'self-host',
    question: 'Can I self-host ClawStak?',
    answer:
      'Enterprise customers can deploy ClawStak on dedicated infrastructure within their ' +
      'own cloud environment. Contact sales for details.',
  },
];
```

### Phase 2: Structured Data Utilities (1 hour)

```typescript
// src/utils/structuredData.ts

import type { FAQItem, PricingTier } from '@/types/landing';

/**
 * Generates a JSON-LD FAQPage schema from FAQ items.
 * @see https://schema.org/FAQPage
 */
export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generates a JSON-LD SoftwareApplication schema for the product.
 */
export function buildProductSchema(tiers: PricingTier[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawStak.ai',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.price === 'Custom' ? undefined : tier.price.replace('$', ''),
      priceCurrency: 'USD',
      description: tier.description,
    })),
  };
}

/**
 * Generates a JSON-LD Organization schema.
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawStak',
    url: 'https://clawstak.ai',
    logo: 'https://clawstak.ai/logo.png',
    sameAs: [
      'https://github.com/clawstak',
      'https://twitter.com/clawstak',
    ],
  };
}
```

### Phase 3: Components (3-4 hours)

Build bottom-up: `PricingTierCard` → `PricingSection` → `FeatureSection` → etc. → `LandingPage`.

```tsx
// src/components/landing/HeroSection.tsx

import styles from '@/styles/landing/landing.module.css';

interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: { text: string; href: string };
  secondaryCTA: { text: string; href: string };
}

export function HeroSection({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
}: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.heroInner}>
        <h1 id="hero-headline" className={styles.heroHeadline}>
          {headline}
        </h1>
        <p className={styles.heroSubheadline}>{subheadline}</p>
        <div className={styles.heroCTAs}>
          <a href={primaryCTA.href} className={styles.btnPrimary}>
            {primaryCTA.text}
          </a>
          <a href={secondaryCTA.href} className={styles.btnSecondary}>
            {secondaryCTA.text}
          </a>
        </div>
      </div>
    </section>
  );
}
```

```tsx
// src/components/landing/FeatureSection.tsx

import type { Feature } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface FeatureSectionProps {
  feature: Feature;
  index: number;
}

export function FeatureSection({ feature, index }: FeatureSectionProps) {
  const isReversed = index % 2 !== 0;

  return (
    <section
      id={feature.slug}
      className={`${styles.feature} ${isReversed ? styles.featureReversed : ''}`}
      aria-labelledby={`feature-${feature.id}-headline`}
    >
      <div className={styles.featureContent}>
        <h2 id={`feature-${feature.id}-headline`} className={styles.featureHeadline}>
          {feature.headline}
        </h2>
        <p className={styles.featureSubheadline}>{feature.subheadline}</p>
        <p className={styles.featureDescription}>{feature.description}</p>
        <ul className={styles.featureBullets}>
          {feature.bulletPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <a href={feature.ctaHref} className={styles.btnSecondary}>
          {feature.ctaText}
        </a>
      </div>
      <div className={styles.featureVisual} aria-hidden="true">
        {/* Icon/illustration placeholder — keyed by feature.icon */}
      </div>
    </section>
  );
}
```

```tsx
// src/components/landing/PricingTierCard.tsx

import type { PricingTier } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface PricingTierCardProps {
  tier: PricingTier;
}

export function PricingTierCard({ tier }: PricingTierCardProps) {
  return (
    <article
      className={`${styles.pricingCard} ${tier.highlighted ? styles.pricingCardHighlighted : ''}`}
      aria-labelledby={`pricing-${tier.id}`}
    >
      {tier.highlighted && <span className={styles.pricingBadge}>Most Popular</span>}
      <h3 id={`pricing-${tier.id}`} className={styles.pricingName}>
        {tier.name}
      </h3>
      <div className={styles.pricingPrice}>
        <span className={styles.priceValue}>{tier.price}</span>
        {tier.priceSubtext && (
          <span className={styles.priceSubtext}>{tier.priceSubtext}</span>
        )}
      </div>
      <p className={styles.pricingDescription}>{tier.description}</p>
      <ul className={styles.pricingFeatures}>
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <a href={tier.ctaHref} className={tier.highlighted ? styles.btnPrimary : styles.btnSecondary}>
        {tier.ctaText}
      </a>
    </article>
  );
}
```

```tsx
// src/components/landing/FAQSection.tsx

import type { FAQItem } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface FAQSectionProps {
  headline: string;
  items: FAQItem[];
}

export function FAQSection({ headline, items }: FAQSectionProps) {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="faq-headline">
      <h2 id="faq-headline" className={styles.sectionHeadline}>
        {headline}
      </h2>
      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.id} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>{item.question}</summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// src/pages/landing/LandingPage.tsx

import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { features } from '@/data/landing/features';
import { pricingTiers } from '@/data/landing/pricing';
import { faqItems } from '@/data/landing/faq';
import { socialProof } from '@/data/landing/socialProof';
import { seoMetadata } from '@/data/landing/seo';
import { buildFAQSchema, buildProductSchema, buildOrganizationSchema } from '@/utils/structuredData';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: seoMetadata.title,
  description: seoMetadata.description,
  keywords: seoMetadata.keywords,
  alternates: { canonical: seoMetadata.canonicalUrl },
  openGraph: {
    title: seoMetadata.title,
    description: seoMetadata.description,
    url: seoMetadata.canonicalUrl,
    images: [seoMetadata.ogImage],
    type: 'website',
  },
};

export default function LandingPage() {
  const faqSchema = buildFAQSchema(faqItems);
  const productSchema = buildProductSchema(pricingTiers);
  const orgSchema = buildOrganizationSchema();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <main>
        <HeroSection
          headline="Ship Trusted AI Agents. Together."
          subheadline="The developer platform for discovering, deploying, and orchestrating AI agents — with native A2A protocols and transparent trust scoring."
          primaryCTA={{ text: 'Get Started Free', href: '/signup' }}
          secondaryCTA={{ text: 'Read the Docs', href: '/docs' }}
        />

        {features.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        <SocialProofSection
          metrics={socialProof.metrics}
          testimonials={socialProof.testimonials}
          logoUrls={socialProof.logoUrls}
        />

        <PricingSection headline="Simple, Developer-Friendly Pricing" tiers={pricingTiers} />

        <FAQSection headline="Frequently Asked Questions" items={faqItems} />

        <CTASection
          headline="Start building with trusted agents today."
          subtext="Free tier. No credit card. Deploy your first agent in under 5 minutes."
          primaryCTA={{ text: 'Get Started Free', href: '/signup' }}
        />
      </main>
    </>
  );
}
```

---

## 4. Test Strategy

### Layer 1: Unit Tests (Vitest + React Testing Library)

Test each component in isolation. Focus on **content rendering** and **accessibility**.

```typescript
// src/components/landing/HeroSection.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroSection } from './HeroSection';

const defaultProps = {
  headline: 'Test Headline',
  subheadline: 'Test subheadline text',
  primaryCTA: { text: 'Primary', href: '/primary' },
  secondaryCTA: { text: 'Secondary', href: '/secondary' },
};

describe('HeroSection', () => {
  it('renders the headline as an h1 element', () => {
    render(<HeroSection {...defaultProps} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Test Headline');
  });

  it('renders the subheadline', () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByText('Test subheadline text')).toBeInTheDocument();
  });

  it('renders both CTA links with correct hrefs', () => {
    render(<HeroSection {...defaultProps} />);
    const primary = screen.getByRole('link', { name: 'Primary' });
    const secondary = screen.getByRole('link', { name: 'Secondary' });
    expect(primary).toHaveAttribute('href', '/primary');
    expect(secondary).toHaveAttribute('href', '/secondary');
  });

  it('has exactly one h1 on the page', () => {
    const { container } = render(<HeroSection {...defaultProps} />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
  });

  it('section has appropriate aria-labelledby', () => {
    render(<HeroSection {...defaultProps} />);
    const section = screen.getByRole('region', { name: 'Test Headline' });
    expect(section).toBeInTheDocument();
  });
});
```

```typescript
// src/components/landing/PricingTierCard.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingTierCard } from './PricingTierCard';
import type { PricingTier } from '@/types/landing';

const baseTier: PricingTier = {
  id: 'test',
  name: 'Pro',
  price: '$49',
  priceSubtext: 'per seat / month',
  description: 'For teams',
  features: ['Feature A', 'Feature B'],
  highlighted: false,
  ctaText: 'Start Trial',
  ctaHref: '/signup?plan=pro',
};

describe('PricingTierCard', () => {
  it('renders the tier name, price, and subtext', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
    expect(screen.getByText('per seat / month')).toBeInTheDocument();
  });

  it('renders all feature items', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });

  it('renders CTA link with correct href', () => {
    render(<PricingTierCard tier={baseTier} />);
    const cta = screen.getByRole('link', { name: 'Start Trial' });
    expect(cta).toHaveAttribute('href', '/signup?plan=pro');
  });

  it('applies highlighted styles when tier.highlighted is true', () => {
    render(<PricingTierCard tier={{ ...baseTier, highlighted: true }} />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('does not show badge when not highlighted', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
  });
});
```

```typescript
// src/components/landing/FAQSection.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { FAQSection } from './FAQSection';

const items = [
  { id: '1', question: 'Question 1?', answer: 'Answer 1.' },
  { id: '2', question: 'Question 2?', answer: 'Answer 2.' },
];

describe('FAQSection', () => {
  it('renders all questions', () => {
    render(<FAQSection headline="FAQ" items={items} />);
    expect(screen.getByText('Question 1?')).toBeInTheDocument

---

## Artifact: implementation-plan.md (plan)



# Implementation Plan: SEO Landing Page for ClawStak.ai

## 1. Files to Create or Modify

```
src/
├── pages/
│   └── landing/
│       ├── LandingPage.tsx                 # Page-level orchestrator component
│       ├── LandingPage.test.tsx            # Integration tests for full page
│       └── index.ts                        # Barrel export
├── components/
│   └── landing/
│       ├── HeroSection.tsx                 # Hero headline + primary CTA
│       ├── HeroSection.test.tsx
│       ├── FeatureSection.tsx              # Reusable feature block (marketplace, A2A, trust)
│       ├── FeatureSection.test.tsx
│       ├── SocialProofSection.tsx          # Logos, testimonials, metrics
│       ├── SocialProofSection.test.tsx
│       ├── PricingSection.tsx              # Free / Pro / Enterprise tiers
│       ├── PricingSection.test.tsx
│       ├── PricingTierCard.tsx             # Individual pricing card
│       ├── PricingTierCard.test.tsx
│       ├── FAQSection.tsx                  # Accordion FAQ
│       ├── FAQSection.test.tsx
│       ├── CTASection.tsx                  # Bottom-of-page call to action
│       ├── CTASection.test.tsx
│       └── index.ts                        # Barrel exports
├── data/
│   └── landing/
│       ├── features.ts                     # Feature content data
│       ├── pricing.ts                      # Pricing tiers data
│       ├── faq.ts                          # FAQ Q&A pairs
│       ├── socialProof.ts                  # Testimonials, logos, metrics
│       └── seo.ts                          # Meta tags, structured data (JSON-LD)
├── types/
│   └── landing.ts                          # TypeScript interfaces
├── hooks/
│   └── useFAQSchema.ts                     # Generates FAQPage JSON-LD
├── utils/
│   └── structuredData.ts                   # JSON-LD builder utilities
│   └── structuredData.test.ts
├── styles/
│   └── landing/
│       └── landing.module.css              # Page-specific styles (CSS Modules)
└── e2e/
    └── landing.spec.ts                     # Playwright E2E tests
```

---

## 2. Key Design Decisions

### 2.1 Architecture: Content/Presentation Separation

All copy lives in `src/data/landing/*.ts` — **never hardcoded in components**. This is the single most important decision. It enables:

- Non-engineer copy edits without touching component logic
- Future CMS integration (swap static imports for API calls)
- A/B testing at the data layer
- i18n readiness

```typescript
// src/types/landing.ts

export interface Feature {
  id: string;
  slug: string;                    // URL-friendly ID for anchor links
  headline: string;
  subheadline: string;
  description: string;
  bulletPoints: string[];
  icon: string;                    // Icon identifier (e.g., "marketplace", "a2a", "trust")
  ctaText: string;
  ctaHref: string;
}

export interface PricingTier {
  id: string;
  name: 'Free' | 'Pro' | 'Enterprise';
  price: string;                   // "$0" | "$49/mo" | "Custom"
  priceSubtext?: string;           // "forever" | "per seat/month" | "contact sales"
  description: string;
  features: string[];
  highlighted: boolean;            // Visual emphasis (Pro tier)
  ctaText: string;
  ctaHref: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;                  // Supports markdown-light (bold, links)
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}

export interface SocialProofMetric {
  value: string;                   // "10,000+" 
  label: string;                   // "Agents Deployed"
}

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  keywords: string[];
}
```

### 2.2 SEO Strategy: Server-Side Rendering + Structured Data

- **SSR/SSG via Next.js `generateMetadata`** — all meta tags rendered server-side.
- **JSON-LD structured data** — `FAQPage` schema for FAQ section, `Product` schema for pricing, `Organization` schema for social proof.
- **Semantic HTML** — `<main>`, `<section>`, `<article>`, `<h1>`→`<h3>` hierarchy. Exactly ONE `<h1>` on the page.
- **Anchor links** for each section (`#marketplace`, `#a2a`, `#trust-scoring`, `#pricing`, `#faq`).
- **`loading="lazy"`** on below-fold images; critical images use `priority` prop.

```typescript
// src/data/landing/seo.ts

import type { SEOMetadata } from '@/types/landing';

export const seoMetadata: SEOMetadata = {
  title: 'ClawStak.ai — The Agent Marketplace with Built-In Trust',
  description:
    'Discover, deploy, and orchestrate AI agents with ClawStak.ai. ' +
    'Agent-to-agent protocols, trust scoring, and a marketplace built for developers.',
  canonicalUrl: 'https://clawstak.ai',
  ogImage: 'https://clawstak.ai/og-landing.png',
  keywords: [
    'AI agent marketplace',
    'agent-to-agent protocol',
    'A2A',
    'trust scoring',
    'AI orchestration',
    'developer tools',
    'ClawStak',
  ],
};
```

### 2.3 Component API Design

Components are **stateless and data-driven**. Each section receives its content as props.

```typescript
// Component signatures

// HeroSection — single h1, tagline, dual CTAs
interface HeroSectionProps {
  headline: string;          // "Ship Trusted AI Agents. Together."
  subheadline: string;       // The value prop paragraph
  primaryCTA: { text: string; href: string };
  secondaryCTA: { text: string; href: string };
}

// FeatureSection — renders a single feature with alternating layout
interface FeatureSectionProps {
  feature: Feature;
  index: number;             // Used for alternating left/right layout
}

// SocialProofSection
interface SocialProofSectionProps {
  metrics: SocialProofMetric[];
  testimonials: Testimonial[];
  logoUrls: string[];
}

// PricingSection — orchestrates tier cards
interface PricingSectionProps {
  headline: string;
  tiers: PricingTier[];
}

// PricingTierCard — individual card
interface PricingTierCardProps {
  tier: PricingTier;
}

// FAQSection — accessible accordion
interface FAQSectionProps {
  headline: string;
  items: FAQItem[];
}

// CTASection — final conversion block
interface CTASectionProps {
  headline: string;
  subtext: string;
  primaryCTA: { text: string; href: string };
}
```

### 2.4 Styling Approach

- **CSS Modules** for scoped styles — no runtime CSS-in-JS overhead (critical for LCP).
- **CSS custom properties** for theming (dark developer-friendly palette).
- **No Tailwind** — explicit class names are more readable for a content-heavy page and produce smaller CSS bundles for a single page.
- **Container queries** for responsive feature sections.

### 2.5 Accessibility

- FAQ uses `<details>`/`<summary>` native HTML (progressive enhancement, no JS required for core functionality).
- All interactive elements have visible focus indicators.
- Color contrast ≥ 4.5:1 (WCAG AA).
- Pricing comparison is a semantic `<ul>` per tier, not a table (better screen reader experience for card layouts).

---

## 3. Implementation Approach

### Phase 1: Data Layer + Types (1-2 hours)

Create `types/landing.ts` and all files under `data/landing/`. This is the content authoring pass.

```typescript
// src/data/landing/features.ts

import type { Feature } from '@/types/landing';

export const features: Feature[] = [
  {
    id: 'marketplace',
    slug: 'marketplace',
    headline: 'A Marketplace Built for Agents',
    subheadline: 'Discover and deploy production-ready AI agents in minutes.',
    description:
      'Browse a curated registry of AI agents built by the community. ' +
      'Filter by capability, runtime, and trust score. One-click deploy to your stack.',
    bulletPoints: [
      'Curated agent registry with semantic search',
      'One-click deployment to any cloud provider',
      'Version pinning and rollback support',
      'Usage analytics and cost tracking per agent',
    ],
    icon: 'marketplace',
    ctaText: 'Explore the Marketplace',
    ctaHref: '/marketplace',
  },
  {
    id: 'a2a',
    slug: 'a2a',
    headline: 'Native Agent-to-Agent Protocols',
    subheadline: 'Your agents talk to each other — securely and natively.',
    description:
      'ClawStak implements the A2A protocol so agents negotiate, delegate, ' +
      'and collaborate without custom integration code. Define capabilities, ' +
      'discover peers, and orchestrate multi-agent workflows declaratively.',
    bulletPoints: [
      'First-class A2A protocol implementation',
      'Declarative multi-agent workflow orchestration',
      'Capability-based agent discovery',
      'End-to-end encrypted agent communication',
    ],
    icon: 'a2a',
    ctaText: 'Read the A2A Docs',
    ctaHref: '/docs/a2a',
  },
  {
    id: 'trust-scoring',
    slug: 'trust-scoring',
    headline: 'Trust Scoring You Can Verify',
    subheadline: 'Every agent earns its reputation. Transparent. Auditable. On-chain optional.',
    description:
      'ClawStak computes a composite trust score from runtime behavior, ' +
      'community reviews, security audits, and uptime history. ' +
      'Scores are transparent and queryable via API.',
    bulletPoints: [
      'Composite score from behavior, reviews, audits, uptime',
      'Fully queryable via REST and GraphQL APIs',
      'Optional on-chain attestation for compliance',
      'Threshold-based deployment gates for enterprise',
    ],
    icon: 'trust',
    ctaText: 'See How Scoring Works',
    ctaHref: '/docs/trust-scoring',
  },
];
```

```typescript
// src/data/landing/pricing.ts

import type { PricingTier } from '@/types/landing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceSubtext: 'forever',
    description: 'For individual developers exploring agent orchestration.',
    features: [
      'Up to 3 deployed agents',
      'Community marketplace access',
      'Basic A2A protocol support',
      'Public trust scores',
      'Community support',
    ],
    highlighted: false,
    ctaText: 'Get Started Free',
    ctaHref: '/signup?plan=free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    priceSubtext: 'per seat / month',
    description: 'For teams building production agent workflows.',
    features: [
      'Unlimited deployed agents',
      'Private marketplace listings',
      'Full A2A orchestration engine',
      'Advanced trust scoring + custom thresholds',
      'Priority support (< 4hr SLA)',
      'Team roles and audit logs',
      'CI/CD integration',
    ],
    highlighted: true,
    ctaText: 'Start Pro Trial',
    ctaHref: '/signup?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceSubtext: 'contact sales',
    description: 'For organizations requiring compliance, SLAs, and dedicated infrastructure.',
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'On-chain trust attestation',
      'SSO / SAML / SCIM',
      'Custom SLA (up to 99.99%)',
      'Dedicated solutions engineer',
      'SOC 2 Type II compliance',
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
    ctaHref: '/contact?plan=enterprise',
  },
];
```

```typescript
// src/data/landing/faq.ts

import type { FAQItem } from '@/types/landing';

export const faqItems: FAQItem[] = [
  {
    id: 'what-is-clawstak',
    question: 'What is ClawStak.ai?',
    answer:
      'ClawStak.ai is a developer platform for discovering, deploying, and orchestrating ' +
      'AI agents. It combines a curated marketplace, native agent-to-agent (A2A) protocols, ' +
      'and a transparent trust scoring system.',
  },
  {
    id: 'what-is-a2a',
    question: 'What is the A2A protocol?',
    answer:
      'A2A (Agent-to-Agent) is a communication protocol that lets AI agents discover each other\'s ' +
      'capabilities, negotiate tasks, and collaborate — without requiring custom integration code. ' +
      'ClawStak provides a first-class implementation.',
  },
  {
    id: 'how-trust-scoring-works',
    question: 'How does trust scoring work?',
    answer:
      'Each agent receives a composite trust score derived from runtime behavior analysis, ' +
      'community reviews, third-party security audits, and historical uptime. Scores are ' +
      'fully transparent and queryable via our API.',
  },
  {
    id: 'free-tier-limits',
    question: 'What are the limits on the Free tier?',
    answer:
      'The Free tier supports up to 3 deployed agents, community marketplace access, ' +
      'basic A2A support, and public trust scores. No credit card required.',
  },
  {
    id: 'enterprise-compliance',
    question: 'Do you support SOC 2 and other compliance frameworks?',
    answer:
      'Yes. Our Enterprise tier includes SOC 2 Type II compliance, SSO/SAML/SCIM, ' +
      'and optional on-chain trust attestation for auditability.',
  },
  {
    id: 'self-host',
    question: 'Can I self-host ClawStak?',
    answer:
      'Enterprise customers can deploy ClawStak on dedicated infrastructure within their ' +
      'own cloud environment. Contact sales for details.',
  },
];
```

### Phase 2: Structured Data Utilities (1 hour)

```typescript
// src/utils/structuredData.ts

import type { FAQItem, PricingTier } from '@/types/landing';

/**
 * Generates a JSON-LD FAQPage schema from FAQ items.
 * @see https://schema.org/FAQPage
 */
export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generates a JSON-LD SoftwareApplication schema for the product.
 */
export function buildProductSchema(tiers: PricingTier[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawStak.ai',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: tiers.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      price: tier.price === 'Custom' ? undefined : tier.price.replace('$', ''),
      priceCurrency: 'USD',
      description: tier.description,
    })),
  };
}

/**
 * Generates a JSON-LD Organization schema.
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawStak',
    url: 'https://clawstak.ai',
    logo: 'https://clawstak.ai/logo.png',
    sameAs: [
      'https://github.com/clawstak',
      'https://twitter.com/clawstak',
    ],
  };
}
```

### Phase 3: Components (3-4 hours)

Build bottom-up: `PricingTierCard` → `PricingSection` → `FeatureSection` → etc. → `LandingPage`.

```tsx
// src/components/landing/HeroSection.tsx

import styles from '@/styles/landing/landing.module.css';

interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: { text: string; href: string };
  secondaryCTA: { text: string; href: string };
}

export function HeroSection({
  headline,
  subheadline,
  primaryCTA,
  secondaryCTA,
}: HeroSectionProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.heroInner}>
        <h1 id="hero-headline" className={styles.heroHeadline}>
          {headline}
        </h1>
        <p className={styles.heroSubheadline}>{subheadline}</p>
        <div className={styles.heroCTAs}>
          <a href={primaryCTA.href} className={styles.btnPrimary}>
            {primaryCTA.text}
          </a>
          <a href={secondaryCTA.href} className={styles.btnSecondary}>
            {secondaryCTA.text}
          </a>
        </div>
      </div>
    </section>
  );
}
```

```tsx
// src/components/landing/FeatureSection.tsx

import type { Feature } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface FeatureSectionProps {
  feature: Feature;
  index: number;
}

export function FeatureSection({ feature, index }: FeatureSectionProps) {
  const isReversed = index % 2 !== 0;

  return (
    <section
      id={feature.slug}
      className={`${styles.feature} ${isReversed ? styles.featureReversed : ''}`}
      aria-labelledby={`feature-${feature.id}-headline`}
    >
      <div className={styles.featureContent}>
        <h2 id={`feature-${feature.id}-headline`} className={styles.featureHeadline}>
          {feature.headline}
        </h2>
        <p className={styles.featureSubheadline}>{feature.subheadline}</p>
        <p className={styles.featureDescription}>{feature.description}</p>
        <ul className={styles.featureBullets}>
          {feature.bulletPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <a href={feature.ctaHref} className={styles.btnSecondary}>
          {feature.ctaText}
        </a>
      </div>
      <div className={styles.featureVisual} aria-hidden="true">
        {/* Icon/illustration placeholder — keyed by feature.icon */}
      </div>
    </section>
  );
}
```

```tsx
// src/components/landing/PricingTierCard.tsx

import type { PricingTier } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface PricingTierCardProps {
  tier: PricingTier;
}

export function PricingTierCard({ tier }: PricingTierCardProps) {
  return (
    <article
      className={`${styles.pricingCard} ${tier.highlighted ? styles.pricingCardHighlighted : ''}`}
      aria-labelledby={`pricing-${tier.id}`}
    >
      {tier.highlighted && <span className={styles.pricingBadge}>Most Popular</span>}
      <h3 id={`pricing-${tier.id}`} className={styles.pricingName}>
        {tier.name}
      </h3>
      <div className={styles.pricingPrice}>
        <span className={styles.priceValue}>{tier.price}</span>
        {tier.priceSubtext && (
          <span className={styles.priceSubtext}>{tier.priceSubtext}</span>
        )}
      </div>
      <p className={styles.pricingDescription}>{tier.description}</p>
      <ul className={styles.pricingFeatures}>
        {tier.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <a href={tier.ctaHref} className={tier.highlighted ? styles.btnPrimary : styles.btnSecondary}>
        {tier.ctaText}
      </a>
    </article>
  );
}
```

```tsx
// src/components/landing/FAQSection.tsx

import type { FAQItem } from '@/types/landing';
import styles from '@/styles/landing/landing.module.css';

interface FAQSectionProps {
  headline: string;
  items: FAQItem[];
}

export function FAQSection({ headline, items }: FAQSectionProps) {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="faq-headline">
      <h2 id="faq-headline" className={styles.sectionHeadline}>
        {headline}
      </h2>
      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.id} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>{item.question}</summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

```tsx
// src/pages/landing/LandingPage.tsx

import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureSection } from '@/components/landing/FeatureSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { features } from '@/data/landing/features';
import { pricingTiers } from '@/data/landing/pricing';
import { faqItems } from '@/data/landing/faq';
import { socialProof } from '@/data/landing/socialProof';
import { seoMetadata } from '@/data/landing/seo';
import { buildFAQSchema, buildProductSchema, buildOrganizationSchema } from '@/utils/structuredData';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: seoMetadata.title,
  description: seoMetadata.description,
  keywords: seoMetadata.keywords,
  alternates: { canonical: seoMetadata.canonicalUrl },
  openGraph: {
    title: seoMetadata.title,
    description: seoMetadata.description,
    url: seoMetadata.canonicalUrl,
    images: [seoMetadata.ogImage],
    type: 'website',
  },
};

export default function LandingPage() {
  const faqSchema = buildFAQSchema(faqItems);
  const productSchema = buildProductSchema(pricingTiers);
  const orgSchema = buildOrganizationSchema();

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <main>
        <HeroSection
          headline="Ship Trusted AI Agents. Together."
          subheadline="The developer platform for discovering, deploying, and orchestrating AI agents — with native A2A protocols and transparent trust scoring."
          primaryCTA={{ text: 'Get Started Free', href: '/signup' }}
          secondaryCTA={{ text: 'Read the Docs', href: '/docs' }}
        />

        {features.map((feature, index) => (
          <FeatureSection key={feature.id} feature={feature} index={index} />
        ))}

        <SocialProofSection
          metrics={socialProof.metrics}
          testimonials={socialProof.testimonials}
          logoUrls={socialProof.logoUrls}
        />

        <PricingSection headline="Simple, Developer-Friendly Pricing" tiers={pricingTiers} />

        <FAQSection headline="Frequently Asked Questions" items={faqItems} />

        <CTASection
          headline="Start building with trusted agents today."
          subtext="Free tier. No credit card. Deploy your first agent in under 5 minutes."
          primaryCTA={{ text: 'Get Started Free', href: '/signup' }}
        />
      </main>
    </>
  );
}
```

---

## 4. Test Strategy

### Layer 1: Unit Tests (Vitest + React Testing Library)

Test each component in isolation. Focus on **content rendering** and **accessibility**.

```typescript
// src/components/landing/HeroSection.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroSection } from './HeroSection';

const defaultProps = {
  headline: 'Test Headline',
  subheadline: 'Test subheadline text',
  primaryCTA: { text: 'Primary', href: '/primary' },
  secondaryCTA: { text: 'Secondary', href: '/secondary' },
};

describe('HeroSection', () => {
  it('renders the headline as an h1 element', () => {
    render(<HeroSection {...defaultProps} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Test Headline');
  });

  it('renders the subheadline', () => {
    render(<HeroSection {...defaultProps} />);
    expect(screen.getByText('Test subheadline text')).toBeInTheDocument();
  });

  it('renders both CTA links with correct hrefs', () => {
    render(<HeroSection {...defaultProps} />);
    const primary = screen.getByRole('link', { name: 'Primary' });
    const secondary = screen.getByRole('link', { name: 'Secondary' });
    expect(primary).toHaveAttribute('href', '/primary');
    expect(secondary).toHaveAttribute('href', '/secondary');
  });

  it('has exactly one h1 on the page', () => {
    const { container } = render(<HeroSection {...defaultProps} />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
  });

  it('section has appropriate aria-labelledby', () => {
    render(<HeroSection {...defaultProps} />);
    const section = screen.getByRole('region', { name: 'Test Headline' });
    expect(section).toBeInTheDocument();
  });
});
```

```typescript
// src/components/landing/PricingTierCard.test.tsx

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingTierCard } from './PricingTierCard';
import type { PricingTier } from '@/types/landing';

const baseTier: PricingTier = {
  id: 'test',
  name: 'Pro',
  price: '$49',
  priceSubtext: 'per seat / month',
  description: 'For teams',
  features: ['Feature A', 'Feature B'],
  highlighted: false,
  ctaText: 'Start Trial',
  ctaHref: '/signup?plan=pro',
};

describe('PricingTierCard', () => {
  it('renders the tier name, price, and subtext', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.getByRole('heading', { name: 'Pro' })).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
    expect(screen.getByText('per seat / month')).toBeInTheDocument();
  });

  it('renders all feature items', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });

  it('renders CTA link with correct href', () => {
    render(<PricingTierCard tier={baseTier} />);
    const cta = screen.getByRole('link', { name: 'Start Trial' });
    expect(cta).toHaveAttribute('href', '/signup?plan=pro');
  });

  it('applies highlighted styles when tier.highlighted is true', () => {
    render(<PricingTierCard tier={{ ...baseTier, highlighted: true }} />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('does not show badge when not highlighted', () => {
    render(<PricingTierCard tier={baseTier} />);
    expect(screen.queryByText('Most Popular')).not.toBeInTheDocument();
  });
});
```

```typescript
// src/components/landing/FAQSection.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { FAQSection } from './FAQSection';

const items = [
  { id: '1', question: 'Question 1?', answer: 'Answer 1.' },
  { id: '2', question: 'Question 2?', answer: 'Answer 2.' },
];

describe('FAQSection', () => {
  it('renders all questions', () => {
    render(<FAQSection headline="FAQ" items={items} />);
    expect(screen.getByText('Question 1?')).toBeInTheDocument

---

## Artifact: implementation.md (code)



### FILE: src/types/landing.ts
```typescript
export interface Feature {
  id: string;
  slug: string;
  headline: string;
  subheadline: string;
  description: string;
  bulletPoints: string[];
  icon: string;
  ctaText: string;
  ctaHref: string;
}

export interface PricingTier {
  id: string;
  name: 'Free' | 'Pro' | 'Enterprise';
  price: string;
  priceSubtext?: string;
  description: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  ctaHref: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}

export interface SocialProofMetric {
  value: string;
  label: string;
}

export interface SocialProofData {
  metrics: SocialProofMetric[];
  testimonials: Testimonial[];
  logoUrls: string[];
}

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  keywords: string[];
}

export interface CTALink {
  text: string;
  href: string;
}
```

### FILE: src/data/landing/seo.ts
```typescript
import type { SEOMetadata } from '@/types/landing';

export const seoMetadata: SEOMetadata = {
  title: 'ClawStak.ai — The Agent Marketplace with Built-In Trust',
  description:
    'Discover, deploy, and orchestrate AI agents with ClawStak.ai. ' +
    'Agent-to-agent protocols, trust scoring, and a marketplace built for developers.',
  canonicalUrl: 'https://clawstak.ai',
  ogImage: 'https://clawstak.ai/og-landing.png',
  keywords: [
    'AI agent marketplace',
    'agent-to-agent protocol',
    'A2A',
    'trust scoring',
    'AI orchestration',
    'developer tools',
    'ClawStak',
  ],
};
```

### FILE: src/data/landing/features.ts
```typescript
import type { Feature } from '@/types/landing';

export const features: Feature[] = [
  {
    id: 'marketplace',
    slug: 'marketplace',
    headline: 'A Marketplace Built for Agents',
    subheadline: 'Discover and deploy production-ready AI agents in minutes.',
    description:
      'Browse a curated registry of AI agents built by the community. ' +
      'Filter by capability, runtime, and trust score. One-click deploy to your stack.',
    bulletPoints: [
      'Curated agent registry with semantic search',
      'One-click deployment to any cloud provider',
      'Version pinning and rollback support',
      'Usage analytics and cost tracking per agent',
    ],
    icon: 'marketplace',
    ctaText: 'Explore the Marketplace',
    ctaHref: '/marketplace',
  },
  {
    id: 'a2a',
    slug: 'a2a',
    headline: 'Native Agent-to-Agent Protocols',
    subheadline: 'Your agents talk to each other — securely and natively.',
    description:
      'ClawStak implements the A2A protocol so agents negotiate, delegate, ' +
      'and collaborate without custom integration code. Define capabilities, ' +
      'discover peers, and orchestrate multi-agent workflows declaratively.',
    bulletPoints: [
      'First-class A2A protocol implementation',
      'Declarative multi-agent workflow orchestration',
      'Capability-based agent discovery',
      'End-to-end encrypted agent communication',
    ],
    icon: 'a2a',
    ctaText: 'Read the A2A Docs',
    ctaHref: '/docs/a2a',
  },
  {
    id: 'trust-scoring',
    slug: 'trust-scoring',
    headline: 'Trust Scoring You Can Verify',
    subheadline: 'Every agent earns its reputation. Transparent. Auditable. On-chain optional.',
    description:
      'ClawStak computes a composite trust score from runtime behavior, ' +
      'community reviews, security audits, and uptime history. ' +
      'Scores are transparent and queryable via API.',
    bulletPoints: [
      'Composite score from behavior, reviews, audits, uptime',
      'Fully queryable via REST and GraphQL APIs',
      'Optional on-chain attestation for compliance',
      'Threshold-based deployment gates for enterprise',
    ],
    icon: 'trust',
    ctaText: 'See How Scoring Works',
    ctaHref: '/docs/trust-scoring',
  },
];
```

### FILE: src/data/landing/pricing.ts
```typescript
import type { PricingTier } from '@/types/landing';

export const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceSubtext: 'forever',
    description: 'For individual developers exploring agent orchestration.',
    features: [
      'Up to 3 deployed agents',
      'Community marketplace access',
      'Basic A2A protocol support',
      'Public trust scores',
      'Community support',
    ],
    highlighted: false,
    ctaText: 'Get Started Free',
    ctaHref: '/signup?plan=free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    priceSubtext: 'per seat / month',
    description: 'For teams building production agent workflows.',
    features: [
      'Unlimited deployed agents',
      'Private marketplace listings',
      'Full A2A orchestration engine',
      'Advanced trust scoring + custom thresholds',
      'Priority support (< 4hr SLA)',
      'Team roles and audit logs',
      'CI/CD integration',
    ],
    highlighted: true,
    ctaText: 'Start Pro Trial',
    ctaHref: '/signup?plan=pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceSubtext: 'contact sales',
    description: 'For organizations requiring compliance, SLAs, and dedicated infrastructure.',
    features: [
      'Everything in Pro',
      'Dedicated infrastructure',
      'On-chain trust attestation',
      'SSO / SAML / SCIM',
      'Custom SLA (up to 99.99%)',
      'Dedicated solutions engineer',
      'SOC 2 Type II compliance',
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
    ctaHref: '/contact?plan=enterprise',
  },
];
```

### FILE: src/data/landing/faq.ts
```typescript
import type { FAQItem } from '@/types/landing';

export const faqItems: FAQItem[] = [
  {
    id: 'what-is-clawstak',
    question: 'What is ClawStak.ai?',
    answer:
      'ClawStak.ai is a developer platform for discovering, deploying, and orchestrating ' +
      'AI agents. It combines a curated marketplace, native agent-to-agent (A2A) protocols, ' +
      'and a transparent trust scoring system.',
  },
  {
    id: 'what-is-a2a',
    question: 'What is the A2A protocol?',
    answer:
      "A2A (Agent-to-Agent) is a communication protocol that lets AI agents discover each other's " +
      'capabilities, negotiate tasks, and collaborate — without requiring custom integration code. ' +
      'ClawStak provides a first-class implementation.',
  },
  {
    id: 'how-trust-scoring-works',
    question: 'How does trust scoring work?',
    answer:
      'Each agent receives a composite trust score derived from runtime behavior analysis, ' +
      'community reviews, third-party security audits, and historical uptime. Scores are ' +
      'fully transparent and queryable via our API.',
  },
  {
    id: 'free-tier-limits',
    question: 'What are the limits on the Free tier?',
    answer:
      'The Free tier supports up to 3 deployed agents, community marketplace access, ' +
      'basic A2A support, and public trust scores. No credit card required.',
  },
  {
    id: 'enterprise-compliance',
    question: 'Do you support SOC 2 and other compliance frameworks?',
    answer:
      'Yes. Our Enterprise tier includes SOC 2 Type II compliance, SSO/SAML/SCIM, ' +
      'and optional on-chain trust attestation for auditability.',
  },
  {
    id: 'self-host',
    question: 'Can I self-host ClawStak?',
    answer:
      'Enterprise customers can deploy ClawStak on dedicated infrastructure within their ' +
      'own cloud environment. Contact sales for details.',
  },
];
```

### FILE: src/data/landing/socialProof.ts
```typescript
import type { SocialProofData } from '@/types/landing';

export const socialProof: SocialProofData = {
  metrics: [
    { value: '10,000+', label: 'Agents Deployed' },
    { value: '2,500+', label: 'Development Teams' },
    { value: '99.97%', label: 'Platform Uptime' },
    { value: '<200ms', label: 'Median A2A Latency' },
  ],
  testimonials: [
    {
      id: 'testimonial-1',
      quote:
        'ClawStak replaced three internal services and gave us a trust layer we never could have built ourselves. Our agent deployment time dropped from days to minutes.',
      author: 'Sarah Chen',
      role: 'Head of AI Infrastructure',
      company: 'Meridian Systems',
      avatarUrl: '/avatars/sarah-chen.webp',
    },
    {
      id: 'testimonial-2',
      quote:
        'The A2A protocol is what sold us. We had five agent teams that couldn\'t talk to each other. ClawStak made inter-agent orchestration a config file, not an engineering project.',
      author: 'Marcus Rodriguez',
      role: 'CTO',
      company: 'Agentic Labs',
      avatarUrl: '/avatars/marcus-rodriguez.webp',
    },
    {
      id: 'testimonial-3',
      quote:
        'Trust scoring gave our compliance team the auditability they needed. We went from "no AI agents in production" to 40 deployed agents in one quarter.',
      author: 'Priya Kapoor',
      role: 'VP of Engineering',
      company: 'FinSecure',
      avatarUrl: '/avatars/priya-kapoor.webp',
    },
  ],
  logoUrls: [
    '/logos/meridian-systems.svg',
    '/logos/agentic-labs.svg',
    '/logos/finsecure.svg',
    '/logos/dataflow-io.svg',
    '/logos/synthcore.svg',
    '/logos/vertex-ai-solutions.svg',
  ],
};
```

### FILE: src/utils/structuredData.ts
```typescript
import type { FAQItem, PricingTier } from '@/types/landing';

/**
 * Generates a JSON-LD FAQPage schema from FAQ items.
 * Used by search engines to display FAQ rich results in SERPs.
 * @see https://schema.org/FAQPage
 * @see [risa-source.github.io](https://risa-source.github.io/BasicSEOImprovement/)
 */
export function buildFAQSchema(items: FAQItem[]): Record<string, unknown> {
  if (!items.length) {
    return {};
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * Generates a JSON-LD SoftwareApplication schema with pricing offers.
 * Enables product rich results and pricing display in search.
 * @see https://schema.org/SoftwareApplication
 * @see [linkgraph.com](https://www.linkgraph.com/blog/seo-for-react-applications/)
 */
export function buildProductSchema(tiers: PricingTier[]): Record<string, unknown> {
  if (!tiers.length) {
    return {};
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ClawStak.ai',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: tiers
      .filter((tier) => tier.price !== 'Custom')
      .map((tier) => ({
        '@type': 'Offer',
        name: tier.name,
        price: tier.price.replace('$', ''),
        priceCurrency: 'USD',
        description: tier.description,
      })),
  };
}

/**
 * Generates a JSON-LD Organization schema for brand identity in search.
 * @see https://schema.org/Organization
 */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ClawStak',
    url: 'https://clawstak.ai',
    logo: 'https://clawstak.ai/logo.png',
    sameAs: [
      'https://github.com/clawstak',
      'https://twitter.com/clawstak',
    ],
  };
}

/**
 * Generates a JSON-LD WebSite schema with SearchAction for sitelinks searchbox.
 * @see [aiappbuilder.com](https://aiappbuilder.com/insights/nextjs-seo-performance-checklist-to-rank-and-convert)
 */
export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ClawStak.ai',
    url: 'https://clawstak.ai',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://clawstak.ai/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

### FILE: src/utils/structuredData.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import {
  buildFAQSchema,
  buildProductSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from './structuredData';
import type { FAQItem, PricingTier } from '@/types/landing';

describe('buildFAQSchema', () => {
  it('returns empty object for empty array', () => {
    expect(buildFAQSchema([])).toEqual({});
  });

  it('generates valid FAQPage schema', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'What is this?', answer: 'A test.' },
      { id: '2', question: 'How does it work?', answer: 'Like magic.' },
    ];

    const schema = buildFAQSchema(items);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(2);

    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities[0]).toEqual({
      '@type': 'Question',
      name: 'What is this?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A test.',
      },
    });
    expect(entities[1]).toEqual({
      '@type': 'Question',
      name: 'How does it work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Like magic.',
      },
    });
  });

  it('preserves special characters in questions and answers', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'Does it support "A2A"?', answer: "Yes, it's built-in." },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities[0]).toEqual(
      expect.objectContaining({ name: 'Does it support "A2A"?' }),
    );
  });
});

describe('buildProductSchema', () => {
  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceSubtext: 'forever',
      description: 'Free tier',
      features: ['Feature A'],
      highlighted: false,
      ctaText: 'Get Started',
      ctaHref: '/signup',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      priceSubtext: 'per month',
      description: 'Pro tier',
      features: ['Feature B'],
      highlighted: true,
      ctaText: 'Start Trial',
      ctaHref: '/signup?plan=pro',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      priceSubtext: 'contact sales',
      description: 'Enterprise tier',
      features: ['Feature C'],
      highlighted: false,
      ctaText: 'Contact Sales',
      ctaHref: '/contact',
    },
  ];

  it('returns empty object for empty array', () => {
    expect(buildProductSchema([])).toEqual({});
  });

  it('generates valid SoftwareApplication schema', () => {
    const schema = buildProductSchema(tiers);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.name).toBe('ClawStak.ai');
    expect(schema.applicationCategory).toBe('DeveloperApplication');
  });

  it('excludes Custom-priced tiers from offers', () => {
    const schema = buildProductSchema(tiers);
    const offers = schema.offers as Array<Record<string, unknown>>;

    expect(offers).toHaveLength(2);
    expect(offers.map((o) => o.name)).toEqual(['Free', 'Pro']);
  });

  it('strips dollar sign from price values', () => {
    const schema = buildProductSchema(tiers);
    const offers = schema.offers as Array<Record<string, unknown>>;

    expect(offers[0].price).toBe('0');
    expect(offers[1].price).toBe('49');
  });

  it('sets priceCurrency to USD for all offers', () => {
    const schema = buildProductSchema(tiers);
    const offers = schema.offers as Array<Record<string, unknown>>;

    offers.forEach((offer) => {
      expect(offer.priceCurrency).toBe('USD');
    });
  });
});

describe('buildOrganizationSchema', () => {
  it('generates valid Organization schema', () => {
    const schema = buildOrganizationSchema();

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Organization');
    expect(schema.name).toBe('ClawStak');
    expect(schema.url).toBe('https://clawstak.ai');
    expect(schema.logo).toBe('https://clawstak.ai/logo.png');
    expect(schema.sameAs).toEqual(
      expect.arrayContaining([
        'https://github.com/clawstak',
        'https://twitter.com/clawstak',
      ]),
    );
  });
});

describe('buildWebSiteSchema', () => {
  it('generates valid WebSite schema with SearchAction', () => {
    const schema = buildWebSiteSchema();

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebSite');
    expect(schema.name).toBe('ClawStak.ai');

    const action = schema.potentialAction as Record<string, unknown>;
    expect(action['@type']).toBe('SearchAction');
  });
});
```

### FILE: src/hooks/useFAQSchema.ts
```typescript
import { useMemo } from 'react';
import type { FAQItem } from '@/types/landing';
import { buildFAQSchema } from '@/utils/structuredData';

/**
 * React hook that memoizes FAQPage JSON-LD schema generation.
 * Use in components that need to inject FAQ structured data.
 *
 * @see [searcle.ai](https://www.searcle.ai/insights/seo-web-developer)
 */
export function useFAQSchema(items: FAQItem[]): string {
  return useMemo(() => {
    const schema = buildFAQSchema(items);
    return JSON.stringify(schema);
  }, [items]);
}
```

### FILE: src/styles/landing/landing.module.css
```css
/* ============================================================
   ClawStak.ai Landing Page Styles
   Dark developer-friendly palette with CSS custom properties.
   
   Performance: CSS Modules produce scoped class names with zero
   runtime overhead — critical for LCP optimization.
   @see https://aiappbuilder.com/insights/nextjs-seo-performance-checklist-to-rank-and-convert
   ============================================================ */

:root {
  --color-bg: #0a0a0f;
  --color-bg-elevated: #12121a;
  --color-bg-card: #1a1a2e;
  --color-bg-card-highlighted: #1e1e3a;
  --color-surface: #222240;
  --color-border: #2a2a4a;
  --color-border-highlighted: #6c63ff;

  --color-text-primary: #f0f0f5;
  --color-text-secondary: #a0a0b8;
  --color-text-muted: #6a6a85;

  --color-accent: #6c63ff;
  --color-accent-hover: #7b73ff;
  --color-accent-subtle: rgba(108, 99, 255, 0.12);

  --color-success: #34d399;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;
  --space-4xl: 6rem;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --max-width: 1200px;
  --max-width-narrow: 800px;

  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}

/* ============================================================
   GLOBAL LAYOUT
   ============================================================ */

.landingMain {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  line-height: 1.6;
  overflow-x: hidden;
}

.sectionContainer {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.sectionHeadline {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin-bottom: var(--space-3xl);
  letter-spacing: -0.02em;
}

/* ============================================================
   HERO SECTION
   ============================================================ */

.hero {
  padding: var(--space-4xl) 0;
  text-align: center;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at 50% 0%,
    var(--color-accent-subtle) 0%,
    transparent 70%
  );
}

.heroInner {
  max-width: var(--max-width-narrow);
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.heroHeadline {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-lg);
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.heroSubheadline {
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin-bottom: var(--space-2xl);
  max-width: 640px;
  margin-left: auto;
  margin-right: auto;
}

.heroCTAs {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

/* ============================================================
   BUTTONS
   ============================================================ */

.btnPrimary,
.btnSecondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-xl);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  line-height: 1.4;
}

.btnPrimary {
  background-color: var(--color-accent);
  color: #ffffff;
}

.btnPrimary:hover {
  background-color: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(108, 99, 255, 0.35);
}

.btnPrimary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.btnSecondary {
  background-color: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btnSecondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  transform: translateY(-1px);
}

.btnSecondary:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* ============================================================
   FEATURE SECTIONS
   ============================================================ */

.feature {
  padding: var(--space-4xl) 0;
  border-bottom: 1px solid var(--color-border);
}

.feature:last-of-type {
  border-bottom: none;
}

.featureInner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-lg);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3xl);
  align-items: center;
}

.featureReversed .featureInner {
  direction: rtl;
}

.featureReversed .featureContent {
  direction: ltr;
}

.featureReversed .featureVisual {
  direction: ltr;
}

.featureContent {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.featureHeadline {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.featureSubheadline {
  font-size: 1.1rem;
  color: var(--color-accent);
  font-weight: 500;
}

.featureDescription {
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.featureBullets {
  list-style: none;
  padding: 0;
  margin: var(--space-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.featureBullets li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.featureBullets li::before {
  content: '✓';
  color: var(--color-success);
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.featureVisual {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  min-height: 320px;
  padding: var(--space-xl);
}

.featureVisualPlaceholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-accent-subtle);
  border: 2px solid var(--color-border);
}

/* ============================================================
   SOCIAL PROOF
   ============================================================ */

.socialProof {
  padding: var(--space-4xl) 0;
  background-color: var(--color-bg-elevated);
}

.socialProofInner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.metricsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px

---

## Artifact: tests.md (code)



### FILE: tests/types/landing.test-d.ts
```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type {
  Feature,
  PricingTier,
  FAQItem,
  Testimonial,
  SocialProofMetric,
  SocialProofData,
  SEOMetadata,
  CTALink,
} from '@/types/landing';

describe('Landing page types', () => {
  describe('Feature', () => {
    it('has the correct shape', () => {
      expectTypeOf<Feature>().toMatchObjectType<{
        id: string;
        slug: string;
        headline: string;
        subheadline: string;
        description: string;
        bulletPoints: string[];
        icon: string;
        ctaText: string;
        ctaHref: string;
      }>();
    });

    it('does not allow extra properties implicitly via assignment', () => {
      const feature: Feature = {
        id: '1',
        slug: 'test',
        headline: 'h',
        subheadline: 'sh',
        description: 'd',
        bulletPoints: [],
        icon: 'i',
        ctaText: 'cta',
        ctaHref: '/cta',
      };
      expectTypeOf(feature).toEqualTypeOf<Feature>();
    });
  });

  describe('PricingTier', () => {
    it('restricts name to specific union', () => {
      expectTypeOf<PricingTier['name']>().toEqualTypeOf<'Free' | 'Pro' | 'Enterprise'>();
    });

    it('makes priceSubtext optional', () => {
      expectTypeOf<PricingTier['priceSubtext']>().toEqualTypeOf<string | undefined>();
    });

    it('has highlighted as boolean', () => {
      expectTypeOf<PricingTier['highlighted']>().toEqualTypeOf<boolean>();
    });

    it('has features as string array', () => {
      expectTypeOf<PricingTier['features']>().toEqualTypeOf<string[]>();
    });
  });

  describe('FAQItem', () => {
    it('has the correct shape', () => {
      expectTypeOf<FAQItem>().toMatchObjectType<{
        id: string;
        question: string;
        answer: string;
      }>();
    });
  });

  describe('Testimonial', () => {
    it('makes avatarUrl optional', () => {
      expectTypeOf<Testimonial['avatarUrl']>().toEqualTypeOf<string | undefined>();
    });

    it('requires author, role, and company', () => {
      expectTypeOf<Testimonial>().toMatchObjectType<{
        id: string;
        quote: string;
        author: string;
        role: string;
        company: string;
      }>();
    });
  });

  describe('SocialProofMetric', () => {
    it('has value and label as strings', () => {
      expectTypeOf<SocialProofMetric>().toEqualTypeOf<{
        value: string;
        label: string;
      }>();
    });
  });

  describe('SocialProofData', () => {
    it('has the correct composite shape', () => {
      expectTypeOf<SocialProofData>().toMatchObjectType<{
        metrics: SocialProofMetric[];
        testimonials: Testimonial[];
        logoUrls: string[];
      }>();
    });
  });

  describe('SEOMetadata', () => {
    it('has keywords as string array', () => {
      expectTypeOf<SEOMetadata['keywords']>().toEqualTypeOf<string[]>();
    });

    it('has the correct shape', () => {
      expectTypeOf<SEOMetadata>().toMatchObjectType<{
        title: string;
        description: string;
        canonicalUrl: string;
        ogImage: string;
        keywords: string[];
      }>();
    });
  });

  describe('CTALink', () => {
    it('has text and href as strings', () => {
      expectTypeOf<CTALink>().toEqualTypeOf<{
        text: string;
        href: string;
      }>();
    });
  });
});
```

### FILE: tests/data/landing/seo.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { seoMetadata } from '@/data/landing/seo';
import type { SEOMetadata } from '@/types/landing';

describe('seoMetadata', () => {
  it('conforms to the SEOMetadata interface', () => {
    const metadata: SEOMetadata = seoMetadata;
    expect(metadata).toBeDefined();
  });

  it('has a non-empty title', () => {
    expect(seoMetadata.title).toBeTruthy();
    expect(seoMetadata.title.length).toBeGreaterThan(0);
  });

  it('title contains the brand name', () => {
    expect(seoMetadata.title).toContain('ClawStak');
  });

  it('has a non-empty description', () => {
    expect(seoMetadata.description).toBeTruthy();
    expect(seoMetadata.description.length).toBeGreaterThan(0);
  });

  it('description is within reasonable SEO length (under 300 chars)', () => {
    expect(seoMetadata.description.length).toBeLessThanOrEqual(300);
  });

  it('has a valid canonical URL', () => {
    expect(seoMetadata.canonicalUrl).toMatch(/^https:\/\//);
  });

  it('has a valid ogImage URL', () => {
    expect(seoMetadata.ogImage).toMatch(/^https:\/\//);
    expect(seoMetadata.ogImage).toMatch(/\.(png|jpg|jpeg|webp)$/);
  });

  it('has at least one keyword', () => {
    expect(seoMetadata.keywords.length).toBeGreaterThan(0);
  });

  it('keywords are all non-empty strings', () => {
    seoMetadata.keywords.forEach((keyword) => {
      expect(typeof keyword).toBe('string');
      expect(keyword.trim().length).toBeGreaterThan(0);
    });
  });

  it('keywords contain relevant terms', () => {
    const allKeywords = seoMetadata.keywords.join(' ').toLowerCase();
    expect(allKeywords).toContain('ai');
    expect(allKeywords).toContain('agent');
  });

  it('has no duplicate keywords', () => {
    const lowercased = seoMetadata.keywords.map((k) => k.toLowerCase());
    const unique = new Set(lowercased);
    expect(unique.size).toBe(lowercased.length);
  });
});
```

### FILE: tests/data/landing/features.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { features } from '@/data/landing/features';
import type { Feature } from '@/types/landing';

describe('features', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
  });

  it('all items conform to the Feature interface', () => {
    features.forEach((feature: Feature) => {
      expect(feature).toHaveProperty('id');
      expect(feature).toHaveProperty('slug');
      expect(feature).toHaveProperty('headline');
      expect(feature).toHaveProperty('subheadline');
      expect(feature).toHaveProperty('description');
      expect(feature).toHaveProperty('bulletPoints');
      expect(feature).toHaveProperty('icon');
      expect(feature).toHaveProperty('ctaText');
      expect(feature).toHaveProperty('ctaHref');
    });
  });

  it('all features have unique ids', () => {
    const ids = features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all features have unique slugs', () => {
    const slugs = features.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('all ctaHref values start with /', () => {
    features.forEach((feature) => {
      expect(feature.ctaHref).toMatch(/^\//);
    });
  });

  it('all features have at least one bullet point', () => {
    features.forEach((feature) => {
      expect(feature.bulletPoints.length).toBeGreaterThan(0);
    });
  });

  it('all bullet points are non-empty strings', () => {
    features.forEach((feature) => {
      feature.bulletPoints.forEach((bp) => {
        expect(typeof bp).toBe('string');
        expect(bp.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('contains the marketplace feature', () => {
    const marketplace = features.find((f) => f.id === 'marketplace');
    expect(marketplace).toBeDefined();
    expect(marketplace!.headline).toContain('Marketplace');
  });

  it('contains the a2a feature', () => {
    const a2a = features.find((f) => f.id === 'a2a');
    expect(a2a).toBeDefined();
    expect(a2a!.headline).toContain('Agent-to-Agent');
  });

  it('contains the trust-scoring feature', () => {
    const trust = features.find((f) => f.id === 'trust-scoring');
    expect(trust).toBeDefined();
    expect(trust!.headline).toContain('Trust');
  });

  it('headlines are non-empty and reasonably short', () => {
    features.forEach((feature) => {
      expect(feature.headline.length).toBeGreaterThan(0);
      expect(feature.headline.length).toBeLessThanOrEqual(100);
    });
  });

  it('descriptions are non-empty', () => {
    features.forEach((feature) => {
      expect(feature.description.trim().length).toBeGreaterThan(0);
    });
  });

  it('ctaText values are non-empty', () => {
    features.forEach((feature) => {
      expect(feature.ctaText.trim().length).toBeGreaterThan(0);
    });
  });

  it('icon values are non-empty strings', () => {
    features.forEach((feature) => {
      expect(typeof feature.icon).toBe('string');
      expect(feature.icon.trim().length).toBeGreaterThan(0);
    });
  });
});
```

### FILE: tests/data/landing/pricing.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { pricingTiers } from '@/data/landing/pricing';
import type { PricingTier } from '@/types/landing';

describe('pricingTiers', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(pricingTiers)).toBe(true);
    expect(pricingTiers.length).toBeGreaterThan(0);
  });

  it('contains exactly three tiers', () => {
    expect(pricingTiers).toHaveLength(3);
  });

  it('all items conform to the PricingTier interface', () => {
    pricingTiers.forEach((tier: PricingTier) => {
      expect(tier).toHaveProperty('id');
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('price');
      expect(tier).toHaveProperty('description');
      expect(tier).toHaveProperty('features');
      expect(tier).toHaveProperty('highlighted');
      expect(tier).toHaveProperty('ctaText');
      expect(tier).toHaveProperty('ctaHref');
    });
  });

  it('all tiers have unique ids', () => {
    const ids = pricingTiers.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tier names are Free, Pro, and Enterprise in order', () => {
    expect(pricingTiers.map((t) => t.name)).toEqual(['Free', 'Pro', 'Enterprise']);
  });

  it('exactly one tier is highlighted', () => {
    const highlighted = pricingTiers.filter((t) => t.highlighted);
    expect(highlighted).toHaveLength(1);
  });

  it('Pro tier is the highlighted tier', () => {
    const pro = pricingTiers.find((t) => t.name === 'Pro');
    expect(pro).toBeDefined();
    expect(pro!.highlighted).toBe(true);
  });

  it('Free tier has price $0', () => {
    const free = pricingTiers.find((t) => t.name === 'Free');
    expect(free).toBeDefined();
    expect(free!.price).toBe('$0');
  });

  it('Enterprise tier has Custom pricing', () => {
    const enterprise = pricingTiers.find((t) => t.name === 'Enterprise');
    expect(enterprise).toBeDefined();
    expect(enterprise!.price).toBe('Custom');
  });

  it('all tiers have at least one feature', () => {
    pricingTiers.forEach((tier) => {
      expect(tier.features.length).toBeGreaterThan(0);
    });
  });

  it('all features are non-empty strings', () => {
    pricingTiers.forEach((tier) => {
      tier.features.forEach((feature) => {
        expect(typeof feature).toBe('string');
        expect(feature.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it('Pro tier has more features than Free tier', () => {
    const free = pricingTiers.find((t) => t.name === 'Free')!;
    const pro = pricingTiers.find((t) => t.name === 'Pro')!;
    expect(pro.features.length).toBeGreaterThan(free.features.length);
  });

  it('all ctaHref values start with /', () => {
    pricingTiers.forEach((tier) => {
      expect(tier.ctaHref).toMatch(/^\//);
    });
  });

  it('ctaHref contains plan parameter for non-contact tiers', () => {
    const free = pricingTiers.find((t) => t.name === 'Free')!;
    const pro = pricingTiers.find((t) => t.name === 'Pro')!;
    expect(free.ctaHref).toContain('plan=free');
    expect(pro.ctaHref).toContain('plan=pro');
  });

  it('Enterprise ctaHref points to contact page', () => {
    const enterprise = pricingTiers.find((t) => t.name === 'Enterprise')!;
    expect(enterprise.ctaHref).toContain('/contact');
  });

  it('all tiers have non-empty descriptions', () => {
    pricingTiers.forEach((tier) => {
      expect(tier.description.trim().length).toBeGreaterThan(0);
    });
  });

  it('priceSubtext is defined for all tiers', () => {
    pricingTiers.forEach((tier) => {
      expect(tier.priceSubtext).toBeDefined();
      expect(typeof tier.priceSubtext).toBe('string');
    });
  });
});
```

### FILE: tests/data/landing/faq.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { faqItems } from '@/data/landing/faq';
import type { FAQItem } from '@/types/landing';

describe('faqItems', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(faqItems)).toBe(true);
    expect(faqItems.length).toBeGreaterThan(0);
  });

  it('all items conform to the FAQItem interface', () => {
    faqItems.forEach((item: FAQItem) => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('question');
      expect(item).toHaveProperty('answer');
    });
  });

  it('all items have unique ids', () => {
    const ids = faqItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all questions end with a question mark', () => {
    faqItems.forEach((item) => {
      expect(item.question.trim()).toMatch(/\?$/);
    });
  });

  it('all questions are non-empty', () => {
    faqItems.forEach((item) => {
      expect(item.question.trim().length).toBeGreaterThan(0);
    });
  });

  it('all answers are non-empty', () => {
    faqItems.forEach((item) => {
      expect(item.answer.trim().length).toBeGreaterThan(0);
    });
  });

  it('answers are substantive (at least 20 characters)', () => {
    faqItems.forEach((item) => {
      expect(item.answer.length).toBeGreaterThanOrEqual(20);
    });
  });

  it('contains a "what is ClawStak" FAQ', () => {
    const found = faqItems.find((item) => item.id === 'what-is-clawstak');
    expect(found).toBeDefined();
    expect(found!.question.toLowerCase()).toContain('clawstak');
  });

  it('contains an A2A protocol FAQ', () => {
    const found = faqItems.find((item) => item.id === 'what-is-a2a');
    expect(found).toBeDefined();
    expect(found!.answer.toLowerCase()).toContain('a2a');
  });

  it('contains a trust scoring FAQ', () => {
    const found = faqItems.find((item) => item.id === 'how-trust-scoring-works');
    expect(found).toBeDefined();
  });

  it('contains a free tier limits FAQ', () => {
    const found = faqItems.find((item) => item.id === 'free-tier-limits');
    expect(found).toBeDefined();
    expect(found!.answer).toContain('3');
  });

  it('contains enterprise compliance FAQ', () => {
    const found = faqItems.find((item) => item.id === 'enterprise-compliance');
    expect(found).toBeDefined();
    expect(found!.answer.toLowerCase()).toContain('soc 2');
  });

  it('contains self-host FAQ', () => {
    const found = faqItems.find((item) => item.id === 'self-host');
    expect(found).toBeDefined();
  });

  it('ids use kebab-case', () => {
    faqItems.forEach((item) => {
      expect(item.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });
  });
});
```

### FILE: tests/data/landing/socialProof.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import { socialProof } from '@/data/landing/socialProof';
import type { SocialProofData, Testimonial, SocialProofMetric } from '@/types/landing';

describe('socialProof', () => {
  it('conforms to SocialProofData interface', () => {
    const data: SocialProofData = socialProof;
    expect(data).toBeDefined();
  });

  describe('metrics', () => {
    it('is a non-empty array', () => {
      expect(socialProof.metrics.length).toBeGreaterThan(0);
    });

    it('all metrics have value and label', () => {
      socialProof.metrics.forEach((metric: SocialProofMetric) => {
        expect(metric.value.trim().length).toBeGreaterThan(0);
        expect(metric.label.trim().length).toBeGreaterThan(0);
      });
    });

    it('contains agents deployed metric', () => {
      const found = socialProof.metrics.find((m) =>
        m.label.toLowerCase().includes('agents deployed'),
      );
      expect(found).toBeDefined();
    });

    it('contains uptime metric', () => {
      const found = socialProof.metrics.find((m) =>
        m.label.toLowerCase().includes('uptime'),
      );
      expect(found).toBeDefined();
      expect(found!.value).toContain('%');
    });

    it('contains latency metric', () => {
      const found = socialProof.metrics.find((m) =>
        m.label.toLowerCase().includes('latency'),
      );
      expect(found).toBeDefined();
      expect(found!.value).toContain('ms');
    });

    it('has exactly 4 metrics', () => {
      expect(socialProof.metrics).toHaveLength(4);
    });
  });

  describe('testimonials', () => {
    it('is a non-empty array', () => {
      expect(socialProof.testimonials.length).toBeGreaterThan(0);
    });

    it('all testimonials have required fields', () => {
      socialProof.testimonials.forEach((testimonial: Testimonial) => {
        expect(testimonial.id).toBeTruthy();
        expect(testimonial.quote.trim().length).toBeGreaterThan(0);
        expect(testimonial.author.trim().length).toBeGreaterThan(0);
        expect(testimonial.role.trim().length).toBeGreaterThan(0);
        expect(testimonial.company.trim().length).toBeGreaterThan(0);
      });
    });

    it('all testimonials have unique ids', () => {
      const ids = socialProof.testimonials.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all testimonials have avatarUrl set', () => {
      socialProof.testimonials.forEach((testimonial) => {
        expect(testimonial.avatarUrl).toBeDefined();
        expect(testimonial.avatarUrl).toMatch(/\.(webp|png|jpg|jpeg|svg)$/);
      });
    });

    it('quotes are substantive (at least 50 characters)', () => {
      socialProof.testimonials.forEach((testimonial) => {
        expect(testimonial.quote.length).toBeGreaterThanOrEqual(50);
      });
    });

    it('has exactly 3 testimonials', () => {
      expect(socialProof.testimonials).toHaveLength(3);
    });
  });

  describe('logoUrls', () => {
    it('is a non-empty array', () => {
      expect(socialProof.logoUrls.length).toBeGreaterThan(0);
    });

    it('all logos are SVG files', () => {
      socialProof.logoUrls.forEach((url) => {
        expect(url).toMatch(/\.svg$/);
      });
    });

    it('all logos are under /logos/ path', () => {
      socialProof.logoUrls.forEach((url) => {
        expect(url).toMatch(/^\/logos\//);
      });
    });

    it('has no duplicate logo URLs', () => {
      const unique = new Set(socialProof.logoUrls);
      expect(unique.size).toBe(socialProof.logoUrls.length);
    });

    it('has at least as many logos as testimonials', () => {
      expect(socialProof.logoUrls.length).toBeGreaterThanOrEqual(
        socialProof.testimonials.length,
      );
    });
  });
});
```

### FILE: tests/utils/structuredData.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import {
  buildFAQSchema,
  buildProductSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
} from '@/utils/structuredData';
import type { FAQItem, PricingTier } from '@/types/landing';

/* --------------------------------------------------------------------------
 * buildFAQSchema
 * -------------------------------------------------------------------------- */

describe('buildFAQSchema', () => {
  it('returns empty object for empty array', () => {
    expect(buildFAQSchema([])).toEqual({});
  });

  it('generates valid FAQPage schema for a single item', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'Q1?', answer: 'A1.' },
    ];
    const schema = buildFAQSchema(items);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');

    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
    expect(entities[0]).toEqual({
      '@type': 'Question',
      name: 'Q1?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A1.',
      },
    });
  });

  it('generates valid FAQPage schema for multiple items', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'What is this?', answer: 'A test.' },
      { id: '2', question: 'How does it work?', answer: 'Like magic.' },
      { id: '3', question: 'Why use it?', answer: 'Because.' },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;

    expect(entities).toHaveLength(3);
    expect(entities[0]).toMatchObject({ name: 'What is this?' });
    expect(entities[1]).toMatchObject({ name: 'How does it work?' });
    expect(entities[2]).toMatchObject({ name: 'Why use it?' });
  });

  it('preserves special characters in questions and answers', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'Does it support "A2A" & <HTML>?', answer: "Yes, it's built-in & ready." },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities[0]).toEqual(
      expect.objectContaining({ name: 'Does it support "A2A" & <HTML>?' }),
    );
    const answer = (entities[0].acceptedAnswer as Record<string, unknown>).text;
    expect(answer).toBe("Yes, it's built-in & ready.");
  });

  it('preserves very long answer text', () => {
    const longAnswer = 'A'.repeat(5000);
    const items: FAQItem[] = [
      { id: '1', question: 'Long?', answer: longAnswer },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    const answer = (entities[0].acceptedAnswer as Record<string, unknown>).text;
    expect(answer).toBe(longAnswer);
  });

  it('preserves unicode characters', () => {
    const items: FAQItem[] = [
      { id: '1', question: '你好吗？', answer: '很好 🚀' },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities[0]).toMatchObject({ name: '你好吗？' });
  });

  it('preserves item order', () => {
    const items: FAQItem[] = [
      { id: 'c', question: 'C?', answer: 'C.' },
      { id: 'a', question: 'A?', answer: 'A.' },
      { id: 'b', question: 'B?', answer: 'B.' },
    ];

    const schema = buildFAQSchema(items);
    const entities = schema.mainEntity as Array<Record<string, unknown>>;
    expect(entities.map((e) => e.name)).toEqual(['C?', 'A?', 'B?']);
  });

  it('does not include id in the output schema', () => {
    const items: FAQItem[] = [
      { id: 'test-id', question: 'Q?', answer: 'A.' },
    ];

    const schema = buildFAQSchema(items);
    const json = JSON.stringify(schema);
    expect(json).not.toContain('test-id');
  });

  it('output is valid JSON-serializable', () => {
    const items: FAQItem[] = [
      { id: '1', question: 'Q?', answer: 'A.' },
    ];

    const schema = buildFAQSchema(items);
    expect(() => JSON.stringify(schema)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(schema));
    expect(parsed).toEqual(schema);
  });
});

/* --------------------------------------------------------------------------
 * buildProductSchema
 * -------------------------------------------------------------------------- */

describe('buildProductSchema', () => {
  const baseTiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceSubtext: 'forever',
      description: 'Free tier',
      features: ['Feature A'],
      highlighted: false,
      ctaText: 'Get Started',
      ctaHref: '/signup',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$49',
      priceSubtext: 'per month',
      description: 'Pro tier',
      features: ['Feature B'],
      highlighted: true,
      ctaText: 'Start Trial',
      ctaHref: '/signup?plan=pro',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      priceSubtext: 'contact sales',
      description: 'Enterprise tier',
      features: ['Feature C'],
      highlighted: false,
      ctaText: 'Contact Sales',
      ctaHref: '/contact',
    },
  ];

  it('returns empty object for empty array', () => {
    expect(buildProductSchema([])).toEqual({});
  });

  it('generates valid SoftwareApplication schema', () => {
    const schema = buildProductSchema(baseTiers);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('SoftwareApplication');
    expect(schema.name).toBe('ClawStak.ai');
    expect(schema.applicationCategory).toBe('DeveloperApplication');
    expect(schema.operatingSystem).toBe('Web');
  });

  it('excludes Custom-priced tiers from offers', () => {
    const schema = buildProductSchema(baseTiers);
    const offers = schema.offers as Array<Record<string, unknown>>;

    expect(offers).toHaveLength(2);
    const names = offers.map((o) => o.name);
    expect(names).toContain('Free');
    expect(names).toContain('Pro');
    expect(names).not.toContain('Enterprise');
  });

  it('strips dollar sign from price values', () => {
    const schema = buildProductSchema(baseTiers);
    const offers = schema.offers as Array<Record<string, unknown>>;

    expect(offers[0].price).toBe('0');
    expect(offers[1].price).toBe

