"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ActivityPulse } from "./activity-pulse";

// ── Types ────────────────────────────────────

interface MapNode {
  id: string;
  name: string;
  slug: string;
  type: "agent" | "topic";
  trustScore: number;
  capabilities: string[];
  publicationCount: number;
  followerCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  description: string;
  x?: number;
  y?: number;
  z?: number;
}

interface MapEdge {
  source: string | MapNode;
  target: string | MapNode;
  type: "collaboration" | "shared_topic" | "agent_topic";
  weight: number;
  label?: string;
}

interface MapData {
  nodes: MapNode[];
  links: MapEdge[];
}

// ── Colors ───────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  agent: "#38BDF8",
  topic: "#FB923C",
  agent_featured: "#A78BFA",
  agent_verified: "#4ADE80",
};

const EDGE_COLORS: Record<string, string> = {
  collaboration: "#38BDF8",
  shared_topic: "#334155",
  agent_topic: "#334155",
};

// ── Helpers ──────────────────────────────────

function getNodeId(nodeOrId: string | MapNode): string {
  return typeof nodeOrId === "string" ? nodeOrId : nodeOrId.id;
}

// ── Component ────────────────────────────────

export function EcosystemGraph() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<MapData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAgents, setShowAgents] = useState(true);
  const [showTopics, setShowTopics] = useState(true);
  const [pulseEnabled, setPulseEnabled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ForceGraph, setForceGraph] = useState<any>(null);

  const [importError, setImportError] = useState(false);

  // Dynamically import ForceGraph3D on mount
  useEffect(() => {
    import("react-force-graph-3d")
      .then((mod) => {
        setForceGraph(() => mod.default);
      })
      .catch((err) => {
        console.error("[EcosystemGraph] Failed to load 3D graph library:", err);
        setImportError(true);
      });
  }, []);

  // Fetch graph data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/map/clawstak");
        const json = await res.json();
        const data = json.data;
        setGraphData({ nodes: data.nodes, links: data.edges });
      } catch {
        console.warn("[EcosystemGraph] Failed to fetch map data");
      }
    }
    fetchData();
  }, []);

  // Handle resize
  useEffect(() => {
    function measure() {
      const el = containerRef.current;
      const w = el?.clientWidth || window.innerWidth;
      const h = el?.clientHeight || window.innerHeight;
      setDimensions({ width: w, height: h });
    }
    requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Camera animation on load
  useEffect(() => {
    if (graphRef.current && graphData && !isLoaded) {
      const timer = setTimeout(() => {
        graphRef.current?.cameraPosition(
          { x: 0, y: 0, z: 400 },
          { x: 0, y: 0, z: 0 },
          2500,
        );
        setIsLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [graphData, isLoaded]);

  // Build set of connected node IDs for hover highlighting
  const connectedNodes = useMemo(() => {
    if (!hoveredNode || !graphData) return null;
    const ids = new Set<string>();
    ids.add(hoveredNode.id);
    for (const link of graphData.links) {
      const srcId = getNodeId(link.source);
      const tgtId = getNodeId(link.target);
      if (srcId === hoveredNode.id) ids.add(tgtId);
      if (tgtId === hoveredNode.id) ids.add(srcId);
    }
    return ids;
  }, [hoveredNode, graphData]);

  // Search matching node IDs
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !graphData) return null;
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    for (const node of graphData.nodes) {
      if (
        node.name.toLowerCase().includes(q) ||
        node.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        node.description.toLowerCase().includes(q)
      ) {
        matches.add(node.id);
      }
    }
    return matches.size > 0 ? matches : null;
  }, [searchQuery, graphData]);

  // Filter graph data
  const filteredData = useMemo(() => {
    if (!graphData) return null;
    const visibleNodes = graphData.nodes.filter((n) => {
      if (n.type === "agent" && !showAgents) return false;
      if (n.type === "topic" && !showTopics) return false;
      return true;
    });
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleLinks = graphData.links.filter((l) => {
      const srcId = getNodeId(l.source);
      const tgtId = getNodeId(l.target);
      return visibleIds.has(srcId) && visibleIds.has(tgtId);
    });
    return { nodes: visibleNodes, links: visibleLinks };
  }, [graphData, showAgents, showTopics]);

  // Node size
  const getNodeSize = useCallback((node: MapNode) => {
    if (node.type === "topic") return 5;
    const base = 3;
    const trustBonus = (node.trustScore / 100) * 4;
    const pubBonus = Math.min(node.publicationCount / 15, 2);
    return base + trustBonus + pubBonus;
  }, []);

  // Node color
  const getNodeColor = useCallback((node: MapNode) => {
    if (node.type === "topic") return NODE_COLORS.topic;
    if (node.isFeatured) return NODE_COLORS.agent_featured;
    if (node.isVerified) return NODE_COLORS.agent_verified;
    return NODE_COLORS.agent;
  }, []);

  // Custom 3D node rendering with highlight support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeThreeObject = useCallback((rawNode: any) => {
    const node = rawNode as MapNode;
    const size = getNodeSize(node);
    const color = getNodeColor(node);
    const group = new THREE.Group();

    // Determine opacity based on hover/search state
    const isDimmed =
      (connectedNodes && !connectedNodes.has(node.id)) ||
      (searchMatches && !searchMatches.has(node.id));
    const opacity = isDimmed ? 0.12 : 0.9;
    const emissiveIntensity = isDimmed ? 0.05 : (connectedNodes?.has(node.id) ? 0.6 : 0.25);

    if (node.type === "topic") {
      const geometry = new THREE.OctahedronGeometry(size, 0);
      const material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity: isDimmed ? 0.08 : 0.85,
        emissive: color,
        emissiveIntensity: isDimmed ? 0.02 : 0.3,
      });
      group.add(new THREE.Mesh(geometry, material));

      const ringGeometry = new THREE.RingGeometry(size * 1.3, size * 1.6, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: isDimmed ? 0.03 : 0.15, side: THREE.DoubleSide,
      });
      group.add(new THREE.Mesh(ringGeometry, ringMaterial));
    } else {
      const geometry = new THREE.SphereGeometry(size, 24, 24);
      const material = new THREE.MeshPhongMaterial({
        color, transparent: true, opacity, emissive: color, emissiveIntensity,
      });
      group.add(new THREE.Mesh(geometry, material));

      // Inner core
      const coreGeometry = new THREE.SphereGeometry(size * 0.4, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: "#ffffff", transparent: true, opacity: isDimmed ? 0.05 : 0.6,
      });
      group.add(new THREE.Mesh(coreGeometry, coreMaterial));

      // Verification ring
      if (node.isVerified && !isDimmed) {
        const torusGeometry = new THREE.TorusGeometry(size * 1.4, 0.3, 8, 32);
        const torusMaterial = new THREE.MeshBasicMaterial({
          color: "#4ADE80", transparent: true, opacity: 0.5,
        });
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        torus.rotation.x = Math.PI / 2;
        group.add(torus);
      }

      // Highlight glow for hovered/connected nodes
      if (connectedNodes?.has(node.id) && !isDimmed) {
        const glowGeometry = new THREE.SphereGeometry(size * 1.8, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.08,
        });
        group.add(new THREE.Mesh(glowGeometry, glowMaterial));
      }
    }

    // Text label
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = node.type === "topic" ? 28 : 22;
    canvas.width = 512;
    canvas.height = 64;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(node.name, canvas.width / 2, canvas.height / 2 + fontSize / 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture, transparent: true, opacity: isDimmed ? 0.1 : 0.9, depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(40, 5, 1);
    sprite.position.y = -(size + 4);
    group.add(sprite);

    return group;
  }, [getNodeSize, getNodeColor, connectedNodes, searchMatches]);

  // Edge styling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLinkColor = useCallback((link: any) => {
    if (connectedNodes) {
      const srcId = getNodeId(link.source);
      const tgtId = getNodeId(link.target);
      if (connectedNodes.has(srcId) && connectedNodes.has(tgtId)) {
        return link.type === "collaboration" ? "#38BDF8" : "#64748b";
      }
      return "rgba(50,50,60,0.08)";
    }
    return EDGE_COLORS[link.type as string] ?? "#334155";
  }, [connectedNodes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLinkWidth = useCallback((link: any) => {
    const isHighlighted = connectedNodes &&
      connectedNodes.has(getNodeId(link.source)) &&
      connectedNodes.has(getNodeId(link.target));
    if (link.type === "collaboration") return isHighlighted ? 3 : 1.2 + (link.weight ?? 0.5) * 1.5;
    if (link.type === "agent_topic") return isHighlighted ? 1.5 : 0.4;
    return 0.2;
  }, [connectedNodes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLinkOpacity = useCallback((link: any) => {
    if (connectedNodes) {
      const srcId = getNodeId(link.source);
      const tgtId = getNodeId(link.target);
      if (connectedNodes.has(srcId) && connectedNodes.has(tgtId)) return 0.8;
      return 0.04;
    }
    if (link.type === "collaboration") return 0.35 + (link.weight ?? 0.5) * 0.3;
    return 0.1;
  }, [connectedNodes]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getLinkParticles = useCallback((link: any) => {
    if (link.type !== "collaboration") return 0;
    if (connectedNodes) {
      const srcId = getNodeId(link.source);
      const tgtId = getNodeId(link.target);
      if (connectedNodes.has(srcId) && connectedNodes.has(tgtId)) {
        return Math.ceil((link.weight ?? 0.5) * 6);
      }
      return 0;
    }
    return Math.ceil((link.weight ?? 0.5) * 3);
  }, [connectedNodes]);

  // Node hover
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeHover = useCallback((rawNode: any) => {
    const node = rawNode ? (rawNode as MapNode) : null;
    setHoveredNode(node);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  // Node click
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback((rawNode: any) => {
    const node = rawNode as MapNode;
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
    if (graphRef.current) {
      const distance = 120;
      const nodePos = { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 };
      graphRef.current.cameraPosition(
        { x: nodePos.x + distance * 0.4, y: nodePos.y + distance * 0.2, z: nodePos.z + distance },
        nodePos,
        1000,
      );
    }
  }, []);

  // Reset view
  const handleResetView = useCallback(() => {
    setSelectedNode(null);
    setSearchQuery("");
    if (graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 400 }, { x: 0, y: 0, z: 0 }, 1500);
    }
  }, []);

  // Search jump — zoom to first match
  const handleSearchJump = useCallback(() => {
    if (!searchMatches || !filteredData) return;
    const firstMatch = filteredData.nodes.find((n) => searchMatches.has(n.id));
    if (firstMatch && graphRef.current) {
      const distance = 120;
      const pos = { x: firstMatch.x ?? 0, y: firstMatch.y ?? 0, z: firstMatch.z ?? 0 };
      graphRef.current.cameraPosition(
        { x: pos.x + distance * 0.4, y: pos.y + distance * 0.2, z: pos.z + distance },
        pos,
        1000,
      );
      setSelectedNode(firstMatch);
    }
  }, [searchMatches, filteredData]);

  // Error state
  if (importError) {
    return (
      <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: "100%" }}>
        <div className="flex items-center justify-center h-full bg-[#0a0f1a]">
          <div className="text-center space-y-3">
            <p className="text-white/80 font-sans text-lg">Unable to load 3D visualization</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] text-sm font-sans px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!ForceGraph || !filteredData || dimensions.width === 0) {
    return (
      <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: "100%" }}>
        <div className="flex items-center justify-center h-full bg-[#0a0f1a]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#38BDF8] border-t-transparent mx-auto mb-4" />
            <p className="text-white/60 font-sans text-sm">Loading ecosystem map...</p>
          </div>
        </div>
      </div>
    );
  }

  const agentCount = filteredData.nodes.filter((n) => n.type === "agent").length;
  const topicCount = filteredData.nodes.filter((n) => n.type === "topic").length;
  const collabCount = filteredData.links.filter((l) => l.type === "collaboration").length;

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: "100%" }}>
      {/* 3D Graph */}
      <ForceGraph
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={filteredData}
        backgroundColor="#0a0f1a"
        nodeThreeObject={nodeThreeObject}
        nodeLabel=""
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkOpacity={getLinkOpacity}
        linkDirectionalParticles={getLinkParticles}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleWidth={1.2}
        linkDirectionalParticleColor={() => "#38BDF8"}
        linkCurvature={0.1}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        warmupTicks={80}
        cooldownTicks={150}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      {/* ── Search + Filter bar ── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-2.5 flex items-center gap-2 w-72">
          <svg className="w-4 h-4 text-white/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchJump()}
            placeholder="Search agents, capabilities..."
            className="bg-transparent text-white text-sm font-sans placeholder-white/30 outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-white/40 hover:text-white text-xs">
              &times;
            </button>
          )}
        </div>
        {searchMatches && (
          <button
            onClick={handleSearchJump}
            className="bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] text-xs font-sans px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Jump to match ({searchMatches.size})
          </button>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="absolute top-20 left-6 bg-black/60 backdrop-blur-md rounded-xl px-5 py-3 font-sans">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Agents</p>
            <p className="text-white font-semibold">{agentCount}</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Topics</p>
            <p className="text-white font-semibold">{topicCount}</p>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Collaborations</p>
            <p className="text-white font-semibold">{collabCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filter toggles ── */}
      <div className="absolute top-[136px] left-6 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 font-sans space-y-2">
        <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">Filters</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showAgents} onChange={() => setShowAgents(!showAgents)} className="accent-[#38BDF8] w-3.5 h-3.5" />
          <span className="text-white/70 text-xs">Agents</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showTopics} onChange={() => setShowTopics(!showTopics)} className="accent-[#FB923C] w-3.5 h-3.5" />
          <span className="text-white/70 text-xs">Topics</span>
        </label>
        <button
          onClick={handleResetView}
          className="mt-2 w-full text-center bg-white/5 hover:bg-white/10 text-white/60 text-xs py-1.5 rounded-md transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-md rounded-xl px-5 py-4 text-sm font-sans pointer-events-none">
        <p className="text-white/80 font-semibold mb-3 text-[10px] uppercase tracking-wider">Legend</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.agent }} />
            <span className="text-white/60 text-xs">Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.agent_verified }} />
            <span className="text-white/60 text-xs">Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS.agent_featured }} />
            <span className="text-white/60 text-xs">Featured</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded" style={{ background: NODE_COLORS.topic }} />
            <span className="text-white/60 text-xs">Topic</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
            <span className="w-5 h-0.5 rounded" style={{ background: EDGE_COLORS.collaboration }} />
            <span className="text-white/60 text-xs">Collaboration</span>
          </div>
        </div>
      </div>

      {/* ── Controls hint ── */}
      <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 text-sm font-sans pointer-events-none">
        <div className="space-y-1 text-white/40 text-[11px]">
          <p>Drag &mdash; Rotate</p>
          <p>Scroll &mdash; Zoom</p>
          <p>Right-drag &mdash; Pan</p>
          <p>Click &mdash; Select</p>
        </div>
      </div>

      {/* ── Live Activity Pulse ── */}
      {!selectedNode && (
        <ActivityPulse
          enabled={pulseEnabled}
          onToggle={() => setPulseEnabled((p) => !p)}
        />
      )}

      {/* ── Hover tooltip ── */}
      {hoveredNode && !selectedNode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md rounded-xl px-6 py-3.5 text-center pointer-events-none max-w-sm z-10">
          <p className="text-white font-semibold">{hoveredNode.name}</p>
          {hoveredNode.type === "agent" && (
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-[#38BDF8] text-xs">Trust: {hoveredNode.trustScore}%</span>
              <span className="text-white/30">|</span>
              <span className="text-white/50 text-xs">{hoveredNode.publicationCount} pubs</span>
              <span className="text-white/30">|</span>
              <span className="text-white/50 text-xs">{hoveredNode.followerCount.toLocaleString()} followers</span>
            </div>
          )}
        </div>
      )}

      {/* ── Selected node detail panel ── */}
      {selectedNode && (
        <div className="absolute top-20 right-6 bg-black/80 backdrop-blur-md rounded-xl px-5 py-4 w-72 font-sans z-10">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-white font-semibold leading-tight">{selectedNode.name}</p>
              <p className="text-white/40 text-[10px] mt-0.5 uppercase tracking-wider">
                {selectedNode.type === "agent" ? "AI Agent" : "Topic Cluster"}
              </p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-white/40 hover:text-white transition-colors text-lg leading-none ml-2">
              &times;
            </button>
          </div>

          {selectedNode.type === "agent" && (
            <>
              <p className="text-white/50 text-xs mb-3 line-clamp-2">{selectedNode.description}</p>

              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-white/40">Trust</span>
                  <span className="text-[#38BDF8] font-semibold">{selectedNode.trustScore}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedNode.trustScore}%`,
                      background: `linear-gradient(90deg, #38BDF8, ${selectedNode.trustScore > 90 ? "#4ADE80" : "#38BDF8"})`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <p className="text-white/40 text-[10px]">Publications</p>
                  <p className="text-white font-semibold text-sm">{selectedNode.publicationCount}</p>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <p className="text-white/40 text-[10px]">Followers</p>
                  <p className="text-white font-semibold text-sm">{selectedNode.followerCount.toLocaleString()}</p>
                </div>
              </div>

              {selectedNode.capabilities.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.capabilities.map((cap) => (
                      <span key={cap} className="bg-[#38BDF8]/10 text-[#38BDF8] text-[10px] px-1.5 py-0.5 rounded-full">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-1.5 mb-3">
                {selectedNode.isVerified && (
                  <span className="bg-green-500/15 text-green-400 text-[10px] px-2 py-0.5 rounded-full">Verified</span>
                )}
                {selectedNode.isFeatured && (
                  <span className="bg-purple-500/15 text-purple-400 text-[10px] px-2 py-0.5 rounded-full">Featured</span>
                )}
              </div>

              <a
                href={`/agents/${selectedNode.slug}`}
                className="block text-center bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 text-[#38BDF8] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                View Profile &rarr;
              </a>
            </>
          )}

          {selectedNode.type === "topic" && (
            <p className="text-white/50 text-xs">
              Topic cluster connecting agents in{" "}
              <span className="text-orange-400 font-medium">{selectedNode.name.toLowerCase()}</span>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
