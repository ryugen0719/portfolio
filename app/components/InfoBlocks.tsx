"use client";

import Image from "next/image";
import { GridItem, ProjectItem } from "../types";
import { socialLinks, pcSpecs, skills } from "../data";

/* ════════════════════════════════════════════
   Cell Content Router
   ════════════════════════════════════════════ */
export function CellContent({ item }: { item: GridItem }) {
  switch (item.type) {
    case "project":
      return <ProjectCell item={item} />;
    case "about":
      return <AboutCell />;
    case "links":
      return <LinksCell />;
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
function ProjectCell({ item }: { item: ProjectItem }) {
  const isDummy = item.link === "#";
  return (
    <a
      href={item.link}
      target={isDummy ? undefined : "_blank"}
      rel={isDummy ? undefined : "noopener noreferrer"}
      className="cell-project"
      onClick={(e) => {
        // Prevent navigation if it was a drag or if it's a dummy link
        const wasDrag = document
          .querySelector(".infinite-canvas")
          ?.classList.contains("is-dragging");
        if (wasDrag || isDummy) e.preventDefault();
      }}
    >
      <div className="cell-project__img">
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="310px"
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
    </a>
  );
}

/* ── About ── */
function AboutCell() {
  return (
    <div className="cell-info cell-about">
      <h2>
        <span className="cell-info__icon">👋</span>
        About Me
      </h2>
      <p>
        ゲーム開発、クリエイティブコーディング、Webアプリ制作を行っています。
        テクノロジーとアートの交差点で新しい体験を創ることが好きです。
      </p>
    </div>
  );
}

/* ── Links ── */
function LinksCell() {
  return (
    <div className="cell-links-cluster">
      {socialLinks.map((l, i) => (
        <a
          key={l.name}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`cell-link-box ${i === 4 ? "span-2" : ""}`}
          onClick={(e) => {
            const wasDrag = document
              .querySelector(".infinite-canvas")
              ?.classList.contains("is-dragging");
            if (wasDrag) {
              e.preventDefault();
            } else {
              e.stopPropagation();
            }
          }}
        >
          <div className={`cell-link-icon cell-link-icon--${l.cls}`}>
            {l.icon}
          </div>
          <span className="cell-link-name">{l.name}</span>
        </a>
      ))}
    </div>
  );
}

/* ── Specs ── */
function SpecsCell() {
  return (
    <div className="cell-info cell-specs">
      <h2>
        <span className="cell-info__icon">🖥</span>
        PC Specs
      </h2>
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
    <div className="cell-info">
      <h2>
        <span className="cell-info__icon">🛠</span>
        Skills
      </h2>
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
    <div className="cell-info" style={{ background: "transparent", border: "none", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32 }}>
      <div className="center-brand__logo" style={{ width: 150, height: 150, margin: 0, flexShrink: 0 }}>
        <Image src="/Logo.jpg" alt="Ryugen Logo" width={150} height={150} style={{ objectFit: "cover" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <h1 style={{ fontSize: "3.4rem", fontWeight: 900, background: "linear-gradient(135deg, var(--text-primary), var(--text-muted))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, textShadow: "0 8px 30px rgba(0,0,0,0.7)", letterSpacing: "0.02em" }}>RYUGEN</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>Creative Developer</p>
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
