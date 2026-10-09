export type ProjectItem = {
  type: "project";
  title: string;
  description: string;
  image: string;
  tags: { label: string; color: string }[];
  category: string;
  link: string;
  size?: "normal" | "wide" | "tall" | "large";
};

export type StatItem = { type: "stat"; number: string; label: string };
export type InfoItem = {
  type: "about" | "links" | "specs" | "skills" | "status" | "quote" | "brand" | "empty";
};

export type GridItem = ProjectItem | StatItem | InfoItem;
