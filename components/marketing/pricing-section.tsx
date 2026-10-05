"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { comparisonRows, pricingPlans } from "./site-data";
import { SectionHeading } from "./home-sections";

function PricingToggle({ yearly, setYearly }: { yearly: boolean; setYearly: (value: boolean) => void }) {
  return (
    <div className="billing-control" role="group" aria-label="Billing frequency">
      <button type="button" className={!yearly ? "selected" : ""} onClick={() => setYearly(false)}>
        Monthly
      </button>
      <button type="button" className={yearly ? "selected" : ""} onClick={() => setYearly(true)}>
        Yearly <span>Save 15%</span>
      </button>
    </div>
  );
}

function PricingCards({ yearly }: { yearly: boolean }) {
  return (
    <div className="pricing-grid">
      {pricingPlans.map((plan) => (
        <article className={`price-plan${plan.popular ? " price-plan-popular" : ""}`} key={plan.name}>
          {plan.popular && <div className="popular-label">MOST POPULAR</div>}
          <div className="plan-name">{plan.name}</div>
          <p className="plan-description">{plan.description}</p>
          <div className="plan-price">
            <span className="currency">$</span>
            {yearly ? plan.yearlyMonthly : plan.monthly}
            <span className="per-month">/ month</span>
          </div>
          <p className="billing-note">
            {yearly ? `Billed yearly · $${plan.yearlyAnnual.toLocaleString()} per year` : "Billed monthly"}
          </p>
          <Link
            href="/signup"
            className={`m-btn ${plan.popular ? "button-dark plan-cta" : "plan-cta plan-cta-light"}`}
          >
            Get early access <ArrowRight />
          </Link>
          <div className="plan-features-title">INCLUDED</div>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>
                <Check />
                {feature}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="comparison-wrap">
      <h3>Compare plans</h3>
      <div className="comparison-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Plan details</th>
              <th>Starter</th>
              <th>Growth</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row[0]}>
                <th scope="row">{row[0]}</th>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pricing-note">Prices in USD. Cancel anytime.</p>
    </div>
  );
}

export function PricingSection({ fullPage = false }: { fullPage?: boolean }) {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="section-band pricing-band">
      <div className="site-shell">
        <SectionHeading
          eyebrow="SIMPLE, TRANSPARENT PRICING"
          title={fullPage ? "Plans that scale with your team." : "Pricing that stays simple."}
          body="Choose the plan that fits the way your team works."
          centered
        />
        <PricingToggle yearly={yearly} setYearly={setYearly} />
        <PricingCards yearly={yearly} />
        <ComparisonTable />
      </div>
    </section>
  );
}
