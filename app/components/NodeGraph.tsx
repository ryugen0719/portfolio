"use client";

import { useState, useEffect, useRef } from "react";
import Node, { NodeRow, InputSocket, OutputSocket } from "./Node";
import Image from "next/image";

// Types
type Position = { x: number; y: number; z: number };
type NodeState = Record<string, Position>;

export default function NodeGraph() {
  const [nodes, setNodes] = useState<NodeState>({
    main: { x: 900, y: 350, z: 10 },
    profile: { x: 500, y: 300, z: 20 },
    works: { x: 80, y: 100, z: 30 },
    specs: { x: 80, y: 480, z: 40 },
    links: { x: 80, y: 780, z: 50 },
  });

  // Dragging state
  const dragInfo = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
  }>({
    id: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
  });

  const [maxZ, setMaxZ] = useState(100);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    // Set as top
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setNodes((prev) => ({
      ...prev,
      [id]: { ...prev[id], z: newZ },
    }));

    // Start drag
    dragInfo.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: nodes[id].x,
      nodeStartY: nodes[id].y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { id, startX, startY, nodeStartX, nodeStartY } = dragInfo.current;
    if (!id) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    setNodes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        x: nodeStartX + dx,
        y: nodeStartY + dy,
      },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragInfo.current.id) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragInfo.current.id = null;
    }
  };

  // --- Cable Math ---
  // Node width is 320px. 
  // Header is ~35px. Padding top is 12px.
  // Rows are ~24px tall, plus gap 8px.
  // We'll calculate approximate Y offsets for sockets.
  const NODE_W = 320;
  const HEADER_H = 34;
  const PAD_T = 12;
  const ROW_H = 24;
  const GAP = 8;

  const getOutputPos = (nodeId: string, rowIdx: number) => {
    const node = nodes[nodeId];
    // x is at the right edge
    const x = node.x + NODE_W;
    // y is header + padding + rows + half row
    const y = node.y + HEADER_H + PAD_T + rowIdx * (ROW_H + GAP) + ROW_H / 2;
    return { x, y };
  };

  const getInputPos = (nodeId: string, rowIdx: number) => {
    const node = nodes[nodeId];
    // x is at the left edge
    const x = node.x;
    const y = node.y + HEADER_H + PAD_T + rowIdx * (ROW_H + GAP) + ROW_H / 2;
    return { x, y };
  };

  // Cable Drawing
  const drawCable = (outPos: { x: number; y: number }, inPos: { x: number; y: number }) => {
    // Bezier curve magic
    const dx = Math.abs(inPos.x - outPos.x) * 0.5;
    const cp1x = outPos.x + dx;
    const cp1y = outPos.y;
    const cp2x = inPos.x - dx;
    const cp2y = inPos.y;
    return `M ${outPos.x} ${outPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inPos.x} ${inPos.y}`;
  };

  // Define cables: [fromNode, fromRowIdx, toNode, toRowIdx]
  const cables = [
    { from: "works", fromRow: 0, to: "profile", toRow: 0 },
    { from: "specs", fromRow: 0, to: "profile", toRow: 1 },
    { from: "links", fromRow: 0, to: "profile", toRow: 2 },
    { from: "profile", fromRow: 3, to: "main", toRow: 0 },
  ];

  return (
    <div
      className="node-editor-canvas"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* SVG Cables Layer */}
      <svg className="cables-layer" width="100%" height="100%">
        {cables.map((c, i) => {
          const outPos = getOutputPos(c.from, c.fromRow);
          const inPos = getInputPos(c.to, c.toRow);
          return (
            <path
              key={i}
              className="cable-path"
              d={drawCable(outPos, inPos)}
            />
          );
        })}
      </svg>

      {/* Nodes Layer */}

      {/* 1. Main Output */}
      <Node
        id="main"
        title="Portfolio Output"
        color="red"
        icon="🖥️"
        x={nodes.main.x}
        y={nodes.main.y}
        z={nodes.main.z}
        onPointerDown={handlePointerDown}
      >
        <NodeRow>
          <InputSocket color="green" label="Surface" />
        </NodeRow>
        <NodeRow>
          <InputSocket color="purple" label="Volume" />
        </NodeRow>
        <NodeRow>
          <InputSocket color="gray" label="Displacement" />
        </NodeRow>
      </Node>

      {/* 2. Profile */}
      <Node
        id="profile"
        title="Ryugen (Main Node)"
        color="blue"
        icon="👤"
        x={nodes.profile.x}
        y={nodes.profile.y}
        z={nodes.profile.z}
        onPointerDown={handlePointerDown}
      >
        <NodeRow>
          <InputSocket color="yellow" label="Works Data" />
        </NodeRow>
        <NodeRow>
          <InputSocket color="purple" label="System Specs" />
        </NodeRow>
        <NodeRow>
          <InputSocket color="yellow" label="Social Links" />
        </NodeRow>
        
        <div className="node-content-block" style={{ marginTop: "16px" }}>
          <div className="profile-img-container">
            <Image src="/avatar.png" alt="Ryugen" width={120} height={120} />
          </div>
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "18px" }}>RYUGEN</div>
          <div style={{ textAlign: "center", color: "var(--node-text-muted)", fontSize: "12px", marginTop: "4px" }}>Creative Developer / 3D Artist</div>
        </div>

        <NodeRow>
          <OutputSocket color="green" label="Render" />
        </NodeRow>
      </Node>

      {/* 3. Works */}
      <Node
        id="works"
        title="Works Collection"
        color="green"
        icon="🖼️"
        x={nodes.works.x}
        y={nodes.works.y}
        z={nodes.works.z}
        onPointerDown={handlePointerDown}
      >
        <NodeRow>
          <OutputSocket color="yellow" label="Works Array" />
        </NodeRow>
        <div className="works-grid" style={{ marginTop: "12px" }}>
          <div className="work-item" title="Blender Model">🧑‍🎨</div>
          <div className="work-item" title="Game Dev">🎮</div>
          <div className="work-item" title="Web Dev">💻</div>
          <div className="work-item" title="Scratch">🐱</div>
        </div>
      </Node>

      {/* 4. Specs */}
      <Node
        id="specs"
        title="System Info"
        color="purple"
        icon="⚙️"
        x={nodes.specs.x}
        y={nodes.specs.y}
        z={nodes.specs.z}
        onPointerDown={handlePointerDown}
      >
        <NodeRow>
          <OutputSocket color="purple" label="Hardware Data" />
        </NodeRow>
        <div className="node-content-block" style={{ marginTop: "12px" }}>
          <div className="spec-box">
            <div><span className="spec-key">OS</span>: <span className="spec-val">Windows 11</span></div>
            <div><span className="spec-key">CPU</span>: <span className="spec-val">Core i7 14700F</span></div>
            <div><span className="spec-key">RAM</span>: <span className="spec-val">DDR4 32GB</span></div>
            <div><span className="spec-key">GPU</span>: <span className="spec-val">RTX 4060 Ti</span></div>
            <div><span className="spec-key">Disk</span>: <span className="spec-val">1TB NVMe</span></div>
          </div>
        </div>
      </Node>

      {/* 5. Links */}
      <Node
        id="links"
        title="Social Links"
        color="yellow"
        icon="🔗"
        x={nodes.links.x}
        y={nodes.links.y}
        z={nodes.links.z}
        onPointerDown={handlePointerDown}
      >
        <NodeRow>
          <OutputSocket color="yellow" label="URL Array" />
        </NodeRow>
        <div className="node-content-block" style={{ marginTop: "12px" }}>
          <a href="https://www.youtube.com/@ryugen0719" target="_blank" rel="noreferrer" className="link-btn">▶ YouTube</a>
          <a href="https://scratch.mit.edu/users/ryugen0719/" target="_blank" rel="noreferrer" className="link-btn">🐱 Scratch</a>
          <a href="https://www.instagram.com/ryugen0719/" target="_blank" rel="noreferrer" className="link-btn">📷 Instagram</a>
          <a href="https://ryugen0719.itch.io/" target="_blank" rel="noreferrer" className="link-btn">🎮 itch.io</a>
          <a href="https://github.com/ryugen0719" target="_blank" rel="noreferrer" className="link-btn">🐙 GitHub</a>
        </div>
      </Node>
    </div>
  );
}
