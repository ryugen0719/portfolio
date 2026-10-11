"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
import { GridItem, ProjectItem, SocialLinkItem } from "../types";
import { favoriteApps, pcSpecs, skills } from "../data";

/* ════════════════════════════════════════════
   Cell Content Router
   ════════════════════════════════════════════ */
export const CellContent = memo(function CellContent({
  item,
  imageSizes,
  onProjectSelect,
  audioAnalyser,
  soundEnabled,
  brandVariant,
  presentation = "canvas",
  spotlightOn = false,
  onSpotlightToggle,
}: {
  item: GridItem;
  imageSizes: string;
  onProjectSelect: (project: ProjectItem, trigger: HTMLButtonElement) => void;
  audioAnalyser: AnalyserNode | null;
  soundEnabled: boolean;
  brandVariant?: string;
  presentation?: "canvas" | "list";
  spotlightOn?: boolean;
  onSpotlightToggle?: () => void;
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
      return <SpacerCell />;
    case "status":
      return <StatusCell isOn={spotlightOn} onToggle={onSpotlightToggle} presentation={presentation} />;
    case "countdown":
      return <CountdownCell />;
    case "iss":
      return <ISSPositionCell />;
    case "quote":
      return <QuoteCell />;
    case "brand":
      return <BrandCell variant={brandVariant ?? "all"} />;
    case "stat":
      return <StatCell number={item.number} label={item.label} />;
    default:
      return null;
  }
});

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
      {item.photoSettings && <p className="cell-project__photo-settings">{item.photoSettings}</p>}
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
      aria-label={presentation === "list"
        ? `${item.title}: ${item.description}${item.photoSettings ? ` ${item.photoSettings}` : ""}`
        : undefined}
      onClick={(event) => onSelect(item, event.currentTarget)}
    >
      <div className="cell-project__img">
        <Image
          src={item.image}
          alt={item.title}
          fill
          quality={presentation === "canvas" ? 90 : 75}
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
  const currentImageRef = useRef(item.image);
  currentImageRef.current = item.image;
  const [imageState, setImageState] = useState<{ src: string; status: "loaded" | "error" } | null>(null);
  const imageLoaded = imageState?.src === item.image && imageState.status === "loaded";
  const imageFailed = imageState?.src === item.image && imageState.status === "error";

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
          {!imageLoaded && (
            <div className="project-lightbox__loader" role="status" aria-live="polite">
              {imageFailed ? (
                <span className="project-lightbox__loader-error">画像を読み込めませんでした</span>
              ) : (
                <>
                  <span className="project-lightbox__loader-orbit" aria-hidden="true" />
                  <span className="project-lightbox__loader-label">読み込み中</span>
                </>
              )}
            </div>
          )}
          <Image
            key={item.image}
            src={item.image}
            alt={item.title}
            fill
            quality={100}
            sizes="(max-width: 760px) 94vw, 1100px"
            className={`project-lightbox__image${imageLoaded ? " is-loaded" : ""}`}
            style={{ objectFit: "contain" }}
            onLoad={() => {
              if (currentImageRef.current === item.image) setImageState({ src: item.image, status: "loaded" });
            }}
            onError={() => {
              if (currentImageRef.current === item.image) setImageState({ src: item.image, status: "error" });
            }}
          />
        </div>
        <div className="project-lightbox__content">
          <div className="project-lightbox__heading">
            <span className="cell-eyebrow">{item.category} / SELECTED WORK</span>
            <h2 id="project-lightbox-title">{item.title}</h2>
            <p>{item.description}</p>
            {item.photoSettings && <p className="cell-project__photo-settings">{item.photoSettings}</p>}
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
          draggable={false}
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
  const groups = [
    { label: "PROGRAMMING", items: skills.filter((skill) => ["Python", "Scratch"].includes(skill)) },
    { label: "3D", items: skills.filter((skill) => skill === "Blender") },
    { label: "WEB", items: skills.filter((skill) => skill === "HTML/CSS") },
  ];

  return (
    <div className="cell-info cell-skills">
      <span className="cell-eyebrow">03 / TOOLKIT</span>
      <h2>Skills</h2>
      <div className="skills-groups">
        {groups.map((group) => (
          <div key={group.label} className="skills-group">
            <span className="skills-group__label">{group.label}</span>
            <div className="skills-group__items">
              {group.items.map((skill) => (
                <span key={skill} className="skill-chip">{skill === "Python" ? "Python · AtCoder" : skill}</span>
              ))}
            </div>
          </div>
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
      <div className="favorite-apps-wrap">
        {favoriteApps.map((app, index) => (
          <span key={app} className="favorite-app-chip">
            <span className="favorite-app-chip__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="favorite-app-chip__name">{app}</span>
          </span>
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

/* ── Negative space ── */
function SpacerCell() {
  return <div className="spacer-card" aria-hidden="true" />;
}

/* ── Status ── */
function StatusCell({
  isOn,
  onToggle,
  presentation,
}: {
  isOn: boolean;
  onToggle?: () => void;
  presentation: "canvas" | "list";
}) {
  if (presentation === "list") return null;

  return (
    <button
      type="button"
      className={`cell-info cell-status cell-switch${isOn ? " is-on" : ""}`}
      aria-pressed={isOn}
      aria-label={isOn ? "ライトを消す" : "ライトを点ける"}
      onClick={onToggle}
    >
      <span className="cell-switch__heading">
        <span>DARKROOM / 01</span>
        <span className="cell-switch__state"><i aria-hidden="true" />{isOn ? "ON" : "OFF"}</span>
      </span>
      <span className="cell-switch__plate" aria-hidden="true">
        <span className="cell-switch__screw cell-switch__screw--top" />
        <span className="cell-switch__screw cell-switch__screw--bottom" />
        <span className={`cell-switch__rocker${isOn ? " is-on" : ""}`}>
          <span className="cell-switch__rocker-mark">I</span>
          <span className="cell-switch__rocker-indicator" />
          <span className="cell-switch__rocker-mark">O</span>
        </span>
      </span>
      <span className="cell-switch__label">{isOn ? "LIGHT ON" : "LIGHT OFF"}</span>
      <span className="cell-switch__hint">{isOn ? "PRESS TO RESTORE · ESC" : "PRESS TO EXPLORE"}</span>
    </button>
  );
}

function ISSPositionCell() {
  const [iss, setIss] = useState<{
    position: { latitude: number; longitude: number; altitude: number; velocity: number; timestamp: number } | null;
    status: "loading" | "live" | "offline";
  }>({ position: null, status: "loading" });

  useEffect(() => {
    let active = true;
    let timer = 0;

    const refreshPosition = async () => {
      try {
        const response = await fetch("/api/iss", { cache: "no-store" });
        if (!response.ok) throw new Error("ISS position unavailable");
        const data: { latitude: number; longitude: number; altitude: number; velocity: number; timestamp: number } = await response.json();
        if (
          !Number.isFinite(data.latitude) || data.latitude < -90 || data.latitude > 90 ||
          !Number.isFinite(data.longitude) || data.longitude < -180 || data.longitude > 180 ||
          !Number.isFinite(data.altitude) || data.altitude <= 0 ||
          !Number.isFinite(data.velocity) || data.velocity <= 0 ||
          !Number.isFinite(data.timestamp) || data.timestamp <= 0
        ) {
          throw new Error("Invalid ISS position");
        }
        if (active) setIss({ position: data, status: "live" });
      } catch {
        if (active) setIss((current) => ({ ...current, status: "offline" }));
      } finally {
        if (active) timer = window.setTimeout(refreshPosition, 5000);
      }
    };

    void refreshPosition();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const latitude = iss.position?.latitude;
  const longitude = iss.position?.longitude;
  const formatCoordinate = (value: number | undefined, positive: string, negative: string) =>
    value === undefined ? "—" : `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;

  return (
    <section className="cell-info cell-iss" aria-label="International Space Station position">
      <div className="cell-iss__eyebrow">
        <span>ISS / LIVE POSITION</span>
        <span className={`cell-iss__state${iss.status === "live" ? " is-live" : ""}`}>
          <i aria-hidden="true" />{iss.status === "live" ? "LIVE" : iss.status === "loading" ? "SEARCHING" : "NO SIGNAL"}
        </span>
      </div>
      <div className="cell-iss__map" role="img" aria-label="緯度と経度に基づくISSのおおよその位置">
        <div className="cell-iss__map-land" aria-hidden="true" />
        {latitude !== undefined && longitude !== undefined && (
          <span
            className="cell-iss__marker"
            style={{
              left: `${((longitude + 180) / 360) * 100}%`,
              top: `${((90 - latitude) / 180) * 100}%`,
            }}
          />
        )}
      </div>
      <div className="cell-iss__coordinates">
        <span><small>LAT</small>{formatCoordinate(latitude, "N", "S")}</span>
        <span><small>LON</small>{formatCoordinate(longitude, "E", "W")}</span>
      </div>
      {iss.position && (
        <div className="cell-iss__telemetry">
          <span><small>ALTITUDE</small>{iss.position.altitude.toFixed(1)} km</span>
          <span><small>VELOCITY</small>{Math.round(iss.position.velocity).toLocaleString("en-US")} km/h</span>
        </div>
      )}
      <div className="cell-iss__footnote">
        {iss.position ? (
          <time dateTime={new Date(iss.position.timestamp * 1000).toISOString()}>
            UPDATED {new Date(iss.position.timestamp * 1000).toISOString().slice(11, 19)} UTC · 5 SEC
          </time>
        ) : (
          "EARTH ORBIT · REFRESHES EVERY 5 SEC"
        )}
      </div>
    </section>
  );
}

function CountdownCell() {
  const [remaining, setRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    progress: 0,
    yearPercent: 0,
    currentYear: 0,
    nextYear: 0,
  });

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const currentYear = new Date(now).getFullYear();
      const nextYear = currentYear + 1;
      const startOfYear = new Date(currentYear, 0, 1).getTime();
      const startOfNextYear = new Date(nextYear, 0, 1).getTime();
      const milliseconds = Math.max(0, startOfNextYear - now);
      const totalSeconds = Math.floor(milliseconds / 1000);
      const progress = Math.min(100, Math.max(0, ((now - startOfYear) / (startOfNextYear - startOfYear)) * 100));
      setRemaining({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
        progress,
        yearPercent: Math.round(progress),
        currentYear,
        nextYear,
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="cell-info cell-countdown"
      aria-label={remaining.nextYear ? `${remaining.days} days until ${remaining.nextYear}` : "Countdown to New Year"}
    >
      <span className="cell-countdown__eyebrow">UNTIL {remaining.nextYear || "NEW YEAR"}</span>
      <strong className="cell-countdown__days"><span>{remaining.days}</span><small>DAYS</small></strong>
      <span className="cell-countdown__time">
        {String(remaining.hours).padStart(2, "0")}:{String(remaining.minutes).padStart(2, "0")}:{String(remaining.seconds).padStart(2, "0")}
      </span>
      <div className="cell-countdown__progress-label">
        <span>YEAR ELAPSED</span>
        <span>{remaining.yearPercent}%</span>
      </div>
      <div
        className="cell-countdown__progress"
        role="progressbar"
        aria-label={`${remaining.yearPercent}% of ${remaining.currentYear || "the current year"} elapsed`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={remaining.yearPercent}
      >
        <span style={{ width: `${remaining.progress}%` }} />
      </div>
      <div className="cell-countdown__years" aria-hidden="true">
        <span>{remaining.currentYear || "—"}</span>
        <span>{remaining.nextYear || "—"}</span>
      </div>
    </div>
  );
}

/* ── Quote ── */
function QuoteCell() {
  return <div className="cell-info cell-quote" aria-hidden="true" />;
}

/* ── Brand ── */
function BrandCell({ variant }: { variant: string }) {
  return (
    <div className={`brand-cell brand-cell--${variant}`}>
      <div className="brand-cell__logo">
        <Image src="/Logo.jpg" alt="Ryugen Logo" width={150} height={150} sizes="150px" style={{ objectFit: "cover" }} draggable={false} />
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
