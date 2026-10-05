"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqItems } from "./site-data";
import { SectionHeading } from "./home-sections";

export function FaqList({ items = faqItems }: { items?: typeof faqItems }) {
  const [openIndex, setOpenIndex] = useState(-1);
  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div className="faq-item" key={item.question}>
            <button
              type="button"
              className="faq-trigger"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              {item.question}
              <ChevronDown />
            </button>
            <div className={`faq-content${open ? " open" : ""}`} aria-hidden={!open}>
              <div>
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FaqBand() {
  return (
    <section id="faq" className="section-band faq-band">
      <div className="site-shell faq-layout">
        <SectionHeading
          eyebrow="GOOD QUESTIONS"
          title="A little more clarity."
          body="Have another question? Get in touch with the team."
        />
        <FaqList />
      </div>
    </section>
  );
}
