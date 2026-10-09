import { GridItem, ProjectItem } from "./types";

export const projects: ProjectItem[] = [
  {
    type: "project",
    title: "Candy 3D",
    description: "Blenderで制作したポップなキャンディの3Dアート。",
    image: "/works/blender/CANDY.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "3D Art", color: "pink" }],
    category: "3D",
    link: "#",
    size: "large", // 2x2
  },
  {
    type: "project",
    title: "Umbrella",
    description: "和傘をモチーフにした3Dモデリングとライティングの習作。",
    image: "/works/blender/傘.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Abstract Cube",
    description: "幾何学的なキューブの抽象的な表現。",
    image: "/works/blender/cube2.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Abstract", color: "green" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0001",
    description: "室内風景の3Dモデリング。光と影の演出。",
    image: "/works/blender/0001.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Interior", color: "" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #1",
    description: "日常の風景を切り取った一枚。",
    image: "/works/photo/_IMG0083.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #2",
    description: "光と構図を意識した写真作品。",
    image: "/works/photo/_IMG0144.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #3",
    description: "風景のスナップショット。",
    image: "/works/photo/_IMG0174.jpg",
    tags: [{ label: "Photo", color: "pink" }, { label: "Landscape", color: "green" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Neon Cube",
    description: "ネオンカラーを基調としたキューブのレンダリング。",
    image: "/works/blender/36.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Neon", color: "cyan" }],
    category: "3D",
    link: "#",
    size: "wide", // 2x1
  },
  {
    type: "project",
    title: "Color Adjust",
    description: "3Dレンダリング後の合成と色調整のテスト。",
    image: "/works/blender/合成色調整.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Compositing", color: "pink" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #4",
    description: "自然の風景写真。",
    image: "/works/photo/IMG20260405132205.jpg",
    tags: [{ label: "Photo", color: "pink" }, { label: "Nature", color: "green" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Lighting Test",
    description: "3D空間におけるライティングの実験。",
    image: "/works/blender/Light.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Lighting", color: "cyan" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0420",
    description: "3Dで構築されたインテリアデザイン。",
    image: "/works/blender/0420.png",
    tags: [{ label: "Blender", color: "orange" }, { label: "Design", color: "" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Testing 45",
    description: "モデリングのテストショット。",
    image: "/works/blender/45.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
  {
    type: "project",
    title: "Photography #5",
    description: "被写界深度を活かした写真。",
    image: "/works/photo/_IMG0184.jpg",
    tags: [{ label: "Photo", color: "pink" }],
    category: "Photography",
    link: "#",
  },
  {
    type: "project",
    title: "Room 0006",
    description: "別アングルからの室内レンダリング。",
    image: "/works/blender/0006.png",
    tags: [{ label: "Blender", color: "orange" }],
    category: "3D",
    link: "#",
  },
];

const IconYT = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
const IconIG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
const IconGH = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;
const IconSc = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm2.5 14.5c-1.5.5-3.5.5-5 0-1.2-.4-2-1.3-2-2.5 0-1.7 1.3-3 3-3 .3 0 .7.1 1 .2.3-.1.7-.2 1-.2 1.7 0 3 1.3 3 3 0 1.2-.8 2.1-2 2.5zm-5-3.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-2.5-1.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>;
const IconItch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4.5l-1.5 2.75v11.5c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-11.5l-1.5-2.75h-19zm8.5 2h2v2h-2v-2zm-5.5 0h2v2h-2v-2zm11 0h2v2h-2v-2zM4 11.5h16v6h-16v-6zm3 1.5v3h2v-3H7zm6 0v3h2v-3h-2z"/></svg>;

export const socialLinks = [
  { name: "YouTube", handle: "@ryugen0719", url: "https://www.youtube.com/@ryugen0719", icon: <IconYT />, cls: "yt" },
  { name: "Scratch", handle: "ryugen0719", url: "https://scratch.mit.edu/users/ryugen0719/", icon: <IconSc />, cls: "sc" },
  { name: "Instagram", handle: "@ryugen0719", url: "https://www.instagram.com/ryugen0719/", icon: <IconIG />, cls: "ig" },
  { name: "itch.io", handle: "ryugen0719", url: "https://ryugen0719.itch.io/", icon: <IconItch />, cls: "it" },
  { name: "GitHub", handle: "ryugen0719", url: "https://github.com/ryugen0719", icon: <IconGH />, cls: "gh" },
];

export const pcSpecs = [
  { label: "CPU", value: "i7-14700F" },
  { label: "RAM", value: "DDR4 32GB" },
  { label: "GPU", value: "RTX 4060 Ti" },
  { label: "SSD", value: "1TB" },
  { label: "OS", value: "Win 11" },
];

export const skills = [
  "JavaScript", "TypeScript", "React", "Next.js",
  "Scratch", "Unity", "C#", "HTML/CSS",
  "Python", "Blender", "Git", "Node.js",
];

/* ── Layout Registry ── */
export const itemsRegistry: Record<string, GridItem> = {
  p0: projects[0], p1: projects[1], p2: projects[2], p3: projects[3], p4: projects[4],
  p5: projects[5], p6: projects[6], p7: projects[7], p8: projects[8], p9: projects[9],
  p10: projects[10], p11: projects[11], p12: projects[12], p13: projects[13], p14: projects[14],
  about: { type: "about" },
  brand: { type: "brand" },
  skills: { type: "skills" },
  specs: { type: "specs" },
  quote: { type: "quote" },
  links: { type: "links" },
  status: { type: "status" },
  empty: { type: "empty" },
};

/* ── Visual Grid Layout ──
   ここでグリッドの配置を視覚的に編集できます。
   同じIDを複数マスに配置すると、そのマスをまたぐ大きな要素になります。
   (例: p0 は 2x2マス、brand と p7 は 2x1マス)
*/
export const gridLayout = [
  ["p0",     "p0",     "about", "p1",    "p2"],
  ["p0",     "p0",     "p3",    "p4",    "p5"],
  ["p6",     "brand",  "brand", "p7",    "p7"],
  ["skills", "p8",     "p9",    "specs", "p10"],
  ["p11",    "p12",    "quote", "p13",   "p14"],
  ["links",  "status", "empty", "empty", "empty"],
];
