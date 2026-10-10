"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GridItem, ProjectItem, SocialLinkItem } from "../types";
import { favoriteApps, pcSpecs, skills } from "../data";

/* ════════════════════════════════════════════
   Cell Content Router
   ════════════════════════════════════════════ */
export function CellContent({
  item,
  imageSizes,
  onProjectSelect,
  audioAnalyser,
  soundEnabled,
  brandVariant,
  presentation = "canvas",
}: {
  item: GridItem;
  imageSizes: string;
  onProjectSelect: (project: ProjectItem, trigger: HTMLButtonElement) => void;
  audioAnalyser: AnalyserNode | null;
  soundEnabled: boolean;
  brandVariant?: string;
  presentation?: "canvas" | "list";
}) {
  switch (item.type) {
    case "project":
      return <ProjectCell item={item} imageSizes={imageSizes} onSelect={onProjectSelect} presentation={presentation} />;
    case "about":
      return <AboutCell />;
    case "socialLink":
      return <SocialLinkCell item={item} />;
    case "specs":
      return <SpecsCell />;
    case "skills":
      return <SkillsCell />;
    case "apps":
      return <FavoriteAppsCell />;
    case "visualizer":
      return <AudioVisualizerCell analyser={audioAnalyser} isPlaying={soundEnabled} animate={presentation !== "list" || soundEnabled} />;
    case "spacer":
      return <SpacerCell variant={item.variant} />;
    case "status":
      return <StatusCell />;
    case "countdown":
      return <CountdownCell />;
    case "quote":
      return <QuoteCell />;
    case "brand":
      return <BrandCell variant={brandVariant ?? "all"} />;
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
  presentation,
}: {
  item: ProjectItem;
  imageSizes: string;
  onSelect: (project: ProjectItem, trigger: HTMLButtonElement) => void;
  presentation: "canvas" | "list";
}) {
  const overlay = (
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
  );

  return (
    <button
      type="button"
      className={`cell-project${presentation === "list" ? " cell-project--list" : ""}`}
      aria-label={presentation === "list" ? `${item.title}: ${item.description}` : undefined}
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
        {presentation === "canvas" && overlay}
      </div>
      {presentation === "list" && overlay}
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
        16歳。Scratchでゲームを作り、Blenderでさまざまな作品を制作しています。
        最近はAIを活用したWebアプリ開発にも取り組んでいます。
        このサイトもChatGPTとCodexを使って作成しました。
      </p>
    </div>
  );
}

/* ── Social Link ── */
function SocialLinkCell({ item }: { item: SocialLinkItem }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = item.images;

  useEffect(() => {
    if (!images || images.length < 2) return;

    const interval = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [images]);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="cell-social-link"
      aria-label={`${item.name} ${item.handle} を開く`}
      onClick={(event) => event.stopPropagation()}
    >
      {images?.map((image, index) => (
        <Image
          key={image}
          className={`cell-social-link__backdrop${index === activeImage ? " is-active" : ""}`}
          src={image}
          alt=""
          fill
          sizes="280px"
          aria-hidden="true"
        />
      ))}
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

/* ── Favorite Apps ── */
function FavoriteAppsCell() {
  return (
    <div className="cell-info cell-apps">
      <span className="cell-eyebrow">04 / FAVORITES</span>
      <h2>Favorite Apps</h2>
      <p className="favorite-apps-description">普段よく使っているアプリを紹介します。</p>
      <div className="favorite-apps-wrap">
        {favoriteApps.map((app) => (
          <span key={app} className="favorite-app-chip">{app}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Audio Visualizer ── */
function AudioVisualizerCell({ analyser, isPlaying, animate }: { analyser: AnalyserNode | null; isPlaying: boolean; animate: boolean }) {
  const barsRef = useRef<SVGGElement>(null);
  const barCount = 48;
  const innerRadius = 44;

  useEffect(() => {
    const frequencyData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let frame = 0;
    const draw = (time: number, shouldAnimate: boolean) => {
      if (analyser && frequencyData) analyser.getByteFrequencyData(frequencyData);
      const bars = barsRef.current?.children;
      if (bars) {
        for (let index = 0; index < bars.length; index++) {
          const bin = frequencyData
            ? Math.min(frequencyData.length - 1, Math.floor((index / bars.length) * frequencyData.length * 0.85))
            : 0;
          const fallback = shouldAnimate && isPlaying ? 0.12 + (Math.sin(time / 310 + index * 1.35) + 1) * 0.12 : 0.04;
          const level = shouldAnimate && frequencyData ? frequencyData[bin] / 255 : fallback;
          const angle = (index / bars.length) * Math.PI * 2;
          const endRadius = innerRadius + 5 + level * 27;
          const line = bars[index] as SVGLineElement;
          line.setAttribute("x1", `${Math.cos(angle) * innerRadius}`);
          line.setAttribute("y1", `${Math.sin(angle) * innerRadius}`);
          line.setAttribute("x2", `${Math.cos(angle) * endRadius}`);
          line.setAttribute("y2", `${Math.sin(angle) * endRadius}`);
          line.style.opacity = `${0.34 + level * 0.56}`;
        }
      }
      if (shouldAnimate) frame = requestAnimationFrame((nextTime) => draw(nextTime, true));
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate && !reducedMotion) frame = requestAnimationFrame((time) => draw(time, true));
    else draw(0, false);
    return () => cancelAnimationFrame(frame);
  }, [analyser, animate, isPlaying]);

  return (
    <div className="audio-visualizer" aria-hidden="true">
      <svg className="audio-visualizer__shape" viewBox="-90 -90 180 180" focusable="false">
        <circle className="audio-visualizer__guide" r={innerRadius - 2} />
        <circle className="audio-visualizer__guide audio-visualizer__guide--outer" r={innerRadius + 32} />
        <g ref={barsRef} className="audio-visualizer__spectrum">
          {Array.from({ length: barCount }, (_, index) => <line key={index} className="audio-visualizer__line" />)}
        </g>
        <circle className="audio-visualizer__core" r="2" />
      </svg>
    </div>
  );
}

/* ── Negative-space motifs ── */
function SpacerCell({ variant }: { variant: "orbit" | "diamond" | "rings" | "grid" | "radial" }) {
  return (
    <div className="spacer-card" aria-hidden="true">
      <svg className={`spacer-card__graphic spacer-card__graphic--${variant}`} viewBox="0 0 120 120" focusable="false">
        {variant === "orbit" && (
          <>
            <ellipse cx="60" cy="60" rx="38" ry="16" transform="rotate(-34 60 60)" />
            <ellipse cx="60" cy="60" rx="38" ry="16" transform="rotate(34 60 60)" />
            <circle className="spacer-card__accent" cx="60" cy="60" r="3" />
          </>
        )}
        {variant === "diamond" && (
          <>
            <path d="M60 24 96 60 60 96 24 60 60 24Z" />
            <path d="M60 39 81 60 60 81 39 60 60 39Z" />
            <circle className="spacer-card__accent" cx="60" cy="60" r="2.5" />
          </>
        )}
        {variant === "rings" && (
          <>
            <circle cx="52" cy="60" r="28" />
            <circle cx="68" cy="60" r="28" />
            <circle className="spacer-card__accent" cx="60" cy="60" r="2.5" />
          </>
        )}
        {variant === "grid" && Array.from({ length: 16 }, (_, index) => (
          <circle key={index} className="spacer-card__dot" cx={42 + (index % 4) * 12} cy={42 + Math.floor(index / 4) * 12} r="1.4" />
        ))}
        {variant === "radial" && (
          <>
            <circle cx="60" cy="60" r="30" />
            <path d="M60 20v80M20 60h80M32 32l56 56M88 32 32 88" />
            <circle className="spacer-card__accent" cx="60" cy="60" r="3" />
          </>
        )}
      </svg>
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

function CountdownCell() {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const milliseconds = Math.max(0, new Date(2027, 0, 1).getTime() - Date.now());
      const totalSeconds = Math.floor(milliseconds / 1000);
      setRemaining({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="cell-info cell-countdown" aria-label={`2027年まであと${remaining.days}日`}>
      <span className="cell-countdown__eyebrow">COUNTDOWN TO 2027</span>
      <strong className="cell-countdown__days"><span>{remaining.days}</span><small>日</small></strong>
      <span className="cell-countdown__time">
        {String(remaining.hours).padStart(2, "0")}:{String(remaining.minutes).padStart(2, "0")}:{String(remaining.seconds).padStart(2, "0")}
      </span>
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
function BrandCell({ variant }: { variant: string }) {
  return (
    <div className={`brand-cell brand-cell--${variant}`}>
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
