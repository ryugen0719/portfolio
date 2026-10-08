"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface NodeProps {
  id: string;
  title: string;
  color: "red" | "blue" | "green" | "purple" | "yellow";
  icon?: string;
  x: number;
  y: number;
  z: number;
  width?: number;
  children: ReactNode;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
}

export default function Node({
  id,
  title,
  color,
  icon,
  x,
  y,
  z,
  width = 320,
  children,
  onPointerDown,
}: NodeProps) {
  return (
    <div
      id={id}
      className={`node`}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: `${width}px`,
        zIndex: z,
      }}
      onPointerDown={(e) => {
        // Prevent bringing to front if interacting with buttons/inputs
        const target = e.target as HTMLElement;
        if (target.tagName === "BUTTON" || target.tagName === "A") return;
        onPointerDown(id, e);
      }}
    >
      <div className={`node-header color-${color}`}>
        <div>
          {icon && <span className="node-icon">{icon}</span>}
          {title}
        </div>
      </div>
      <div className="node-body">{children}</div>
    </div>
  );
}

/* Helper Components for Node Body */

export function NodeRow({ children }: { children: ReactNode }) {
  return <div className="node-row">{children}</div>;
}

export function InputSocket({
  color = "yellow",
  label,
}: {
  color?: string;
  label?: string;
}) {
  return (
    <>
      <div className={`socket input ${color}`} />
      {label && <div className="row-label input">{label}</div>}
    </>
  );
}

export function OutputSocket({
  color = "yellow",
  label,
}: {
  color?: string;
  label?: string;
}) {
  return (
    <>
      {label && <div className="row-label output">{label}</div>}
      <div className={`socket output ${color}`} />
    </>
  );
}
