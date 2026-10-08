"use client";

import Image from "next/image";

// 作品やカードのデータを定義（o24.worksのように、画像とテキストが混ざる配列）
const MASONRY_ITEMS = [
  {
    type: "work",
    id: "work-1",
    src: "/works/1.png",
    title: "Cyberpunk Portrait",
    year: "2026",
    tag: "3D Character",
    aspectRatio: "3/4", // 縦長
  },
  {
    type: "profile",
    id: "profile-card",
  },
  {
    type: "work",
    id: "work-2",
    src: "/works/2.png",
    title: "Abstract Geometry",
    year: "2025",
    tag: "Motion Graphics",
    aspectRatio: "1/1", // 正方形
  },
  {
    type: "specs",
    id: "specs-card",
  },
  {
    type: "work",
    id: "work-3",
    src: "/works/3.png",
    title: "Sci-Fi Vehicle",
    year: "2026",
    tag: "Concept Art",
    aspectRatio: "16/9", // 横長
  },
  {
    type: "work",
    id: "work-4",
    src: "/works/1.png",
    title: "Neon Alley",
    year: "2024",
    tag: "Environment",
    aspectRatio: "1/1.2",
  },
  {
    type: "work",
    id: "work-5",
    src: "/works/2.png",
    title: "Glass Simulation",
    year: "2024",
    tag: "Simulation",
    aspectRatio: "4/3",
  },
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <h1 className="site-logo">RYUGEN</h1>
      </header>

      <main className="masonry-grid">
        {MASONRY_ITEMS.map((item) => {
          if (item.type === "work") {
            return (
              <div key={item.id} className="masonry-item">
                <a className="work-card">
                  <div className="work-image-container">
                    <Image
                      src={item.src!}
                      alt={item.title!}
                      width={800}
                      height={
                        item.aspectRatio === "3/4" ? 1066 :
                        item.aspectRatio === "1/1" ? 800 :
                        item.aspectRatio === "16/9" ? 450 :
                        item.aspectRatio === "1/1.2" ? 960 :
                        item.aspectRatio === "4/3" ? 600 : 800
                      }
                      style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                      className="work-img"
                      unoptimized
                    />
                  </div>
                  <div className="work-meta">
                    <div className="work-title">{item.title}</div>
                    <div className="work-info">
                      {item.year} — {item.tag}
                    </div>
                  </div>
                </a>
              </div>
            );
          }

          if (item.type === "profile") {
            return (
              <div key={item.id} className="masonry-item text-card profile-card">
                <div className="profile-name">Ryugen</div>
                <div className="profile-title">Creative Developer / 3D Artist</div>
                <p className="profile-desc">
                  Exploring the intersection of code and 3D art. 
                  Specializing in Blender, real-time rendering, and interactive web experiences.
                </p>
                <ul className="links-list">
                  <li className="link-item">
                    <a href="https://www.youtube.com/@ryugen0719" target="_blank" rel="noreferrer">YouTube</a>
                  </li>
                  <li className="link-item">
                    <a href="https://scratch.mit.edu/users/ryugen0719/" target="_blank" rel="noreferrer">Scratch</a>
                  </li>
                  <li className="link-item">
                    <a href="https://www.instagram.com/ryugen0719/" target="_blank" rel="noreferrer">Instagram</a>
                  </li>
                  <li className="link-item">
                    <a href="https://github.com/ryugen0719" target="_blank" rel="noreferrer">GitHub</a>
                  </li>
                </ul>
              </div>
            );
          }

          if (item.type === "specs") {
            return (
              <div key={item.id} className="masonry-item text-card specs-card">
                <div className="specs-title">System Architecture</div>
                <div className="spec-row">
                  <span className="spec-key">OS</span>
                  <span className="spec-val">Windows 11</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">CPU</span>
                  <span className="spec-val">Intel Core i7 14700F</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">RAM</span>
                  <span className="spec-val">DDR4 32GB</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">GPU</span>
                  <span className="spec-val">NVIDIA RTX 4060 Ti</span>
                </div>
                <div className="spec-row">
                  <span className="spec-key">Storage</span>
                  <span className="spec-val">1TB NVMe SSD</span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </main>
    </>
  );
}
