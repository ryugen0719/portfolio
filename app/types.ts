import type { ReactNode } from "react";

export type ProjectItem = {
  type: "project";
  id: string;
  title: string;
  description: string;
  image: string;
  tags: { label: string; color: string }[];
  category: string;
  link: string;
};

export type SocialLinkItem = {
  type: "socialLink";
  id: string;
  name: string;
  handle: string;
  url: string;
  icon: ReactNode;
  images?: string[];
};

export type GridPlacement = {
  /** Registry key for rendering when this placement is a duplicate instance. */
  itemId?: string;
  id: string;
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
};

export type StatItem = { type: "stat"; number: string; label: string };
export type SpacerItem = {
  type: "spacer";
  variant: "orbit" | "diamond" | "rings" | "grid" | "radial";
};
export type InfoItem = {
  type: "about" | "specs" | "skills" | "apps" | "visualizer" | "status" | "quote" | "brand" | "empty" | "countdown";
};

export type GridItem = ProjectItem | SocialLinkItem | StatItem | SpacerItem | InfoItem;
