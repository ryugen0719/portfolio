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
};

export type GridPlacement = {
  id: string;
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
};

export type StatItem = { type: "stat"; number: string; label: string };
export type InfoItem = {
  type: "about" | "specs" | "skills" | "status" | "quote" | "brand" | "empty";
};

export type GridItem = ProjectItem | SocialLinkItem | StatItem | InfoItem;
