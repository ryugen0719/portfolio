"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { GridItem, ProjectItem, SocialLinkItem } from "../types";
import { pcSpecs, skills } from "../data";

/* ════════════════════════════════════════════
   Cell Content Router
   ════════════════════════════════════════════ */
export function CellContent({
  item,
  imageSizes,
  onProjectSelect,
}: {
  item: GridItem;
  imageSizes: string;
  onProjectSelect: (project: ProjectItem, trigger: HTMLButtonElement) => void;
}) {
  switch (item.type) {
    case "project":
      return <ProjectCell item={item} imageSizes={imageSizes} onSelect={onProjectSelect} />;
    case "about":
      return <AboutCell />;
    case "socialLink":
      return <SocialLinkCell item={item} />;
    case "specs":
      return <SpecsCell />;
    case "skills":
      return <SkillsCell />;
    case "status":
      return <StatusCell />;
    case "quote":
      return <QuoteCell />;
    case "brand":
      return <BrandCell />;
    case "stat":
      return <StatCell number={item.number} label={item.label} />;
    default:
      return null;
  }
}

/* ════════════════════════════════════════════
   Cell Components
   ════════════════════════════════════════════ */

/* ── Project ── */
function ProjectCell({
  item,
  imageSizes,
  onSelect,
}: {
  item: ProjectItem;
  imageSizes: string;
  onSelect: (project: ProjectItem, trigger: HTMLButtonElement) => void;
}) {
  return (
    <button
      type="button"
      className="cell-project"
      onClick={(event) => onSelect(item, event.currentTarget)}
    >
      <div className="cell-project__img">
        <Image
          src={item.image}
          alt={item.title}
          fill
          quality={100}
          sizes={imageSizes}
          style={{ objectFit: "cover" }}
          draggable={false}
        />
        <div className="cell-project__overlay">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="cell-project__tags">
            {item.tags.map((tag) => (
              <span
                key={tag.label}
                className={`cell-tag${tag.color ? ` cell-tag--${tag.color}` : ""}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ProjectLightbox({
  item,
  onClose,
}: {
  item: ProjectItem;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div className="project-lightbox" onClick={onClose}>
      <section
        className="project-lightbox__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-lightbox-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="project-lightbox__close"
          aria-label="作品の詳細を閉じる"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="project-lightbox__media">
          <Image
            src={item.image}
            alt={item.title}
            fill
            quality={100}
            sizes="(max-width: 760px) 94vw, 1100px"
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="project-lightbox__content">
          <div className="project-lightbox__heading">
            <span className="cell-eyebrow">{item.category} / SELECTED WORK</span>
            <h2 id="project-lightbox-title">{item.title}</h2>
            <p>{item.description}</p>
          </div>
          <div className="cell-project__tags">
            {item.tags.map((tag) => (
              <span key={tag.label} className="cell-tag">{tag.label}</span>
            ))}
          </div>
          {item.link !== "#" && (
            <a className="project-lightbox__external" href={item.link} target="_blank" rel="noopener noreferrer">
              Open project <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── About ── */
function AboutCell() {
  return (
    <div className="cell-info cell-about">
      <span className="cell-eyebrow">01 / PROFILE</span>
      <h2>About Me</h2>
      <p>
        ゲーム開発、クリエイティブコーディング、Webアプリ制作を行っています。
        テクノロジーとアートの交差点で新しい体験を創ることが好きです。
      </p>
    </div>
  );
}

/* ── Social Link ── */
function SocialLinkCell({ item }: { item: SocialLinkItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="cell-social-link"
      aria-label={`${item.name} ${item.handle} を開く`}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="cell-social-link__eyebrow">SOCIAL / NETWORK</span>
      <span className="cell-social-link__icon" aria-hidden="true">{item.icon}</span>
      <span className="cell-social-link__name">{item.name}</span>
      <span className="cell-social-link__handle">{item.handle}</span>
      <span className="cell-social-link__arrow" aria-hidden="true">↗</span>
    </a>
  );
}

/* ── Specs ── */
function SpecsCell() {
  return (
    <div className="cell-info cell-specs">
      <span className="cell-eyebrow">02 / WORKSTATION</span>
      <h2>PC Specs</h2>
      <ul className="spec-list">
        {pcSpecs.map((s) => (
          <li key={s.label} className="spec-row">
            <span className="spec-row__label">{s.label}</span>
            <span className="spec-row__value">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Skills ── */
function SkillsCell() {
  return (
    <div className="cell-info cell-skills">
      <span className="cell-eyebrow">03 / TOOLKIT</span>
      <h2>Skills</h2>
      <div className="skills-wrap">
        {skills.map((s) => (
          <span key={s} className="skill-chip">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Status ── */
function StatusCell() {
  return (
    <div className="cell-info cell-status">
      <div className="status-dot" />
      <h3>Available</h3>
      <p>作品制作中・コラボ歓迎</p>
    </div>
  );
}

/* ── Quote ── */
function QuoteCell() {
  return (
    <div className="cell-info cell-quote">
      <blockquote>
        コードは詩であり、
        <br />
        プログラミングは芸術である。
      </blockquote>
      <cite>— My Philosophy</cite>
    </div>
  );
}

/* ── Brand ── */
function BrandCell() {
  return (
    <div className="brand-cell">
      <div className="brand-cell__logo">
        <Image src="/Logo.jpg" alt="Ryugen Logo" width={150} height={150} sizes="150px" style={{ objectFit: "cover" }} />
      </div>
      <div className="brand-cell__copy">
        <span className="cell-eyebrow">DESIGN / CODE / IMAGE</span>
        <h1>RYUGEN</h1>
        <p>Creative Developer</p>
      </div>
    </div>
  );
}

/* ── Stat ── */
function StatCell({ number, label }: { number: string; label: string }) {
  return (
    <div className="cell-info cell-stat">
      <div className="stat-number">{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
