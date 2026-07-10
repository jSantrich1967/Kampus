"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";
import * as THREE from "three";

export type CellPartId = "membrane" | "nucleus" | "mitochondria" | "cytoplasm";

export type CellPartInfo = {
  id: CellPartId;
  label: string;
  description: string;
};

export const DEFAULT_CELL_PARTS: CellPartInfo[] = [
  {
    id: "membrane",
    label: "Membrana celular",
    description: "Capa externa que protege la célula y controla el intercambio de sustancias.",
  },
  {
    id: "cytoplasm",
    label: "Citoplasma",
    description: "Medio interno donde ocurren muchas reacciones y se ubican los orgánulos.",
  },
  {
    id: "nucleus",
    label: "Núcleo",
    description: "Contiene el material genético (ADN) y regula las actividades celulares.",
  },
  {
    id: "mitochondria",
    label: "Mitocondria",
    description: "Orgánulo encargado de producir energía (ATP) para la célula.",
  },
];

type Props = {
  selectedId: CellPartId | null;
  onSelect: (id: CellPartId) => void;
  parts: CellPartInfo[];
};

type MeshProps = {
  active: boolean;
  onClick: () => void;
  emissive: string;
  color: string;
  opacity?: number;
  geometry: React.ReactNode;
  side?: THREE.Side;
};

function SelectableMesh({ active, onClick, emissive, color, opacity = 1, geometry, side }: MeshProps) {
  const ref = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current?.material || Array.isArray(ref.current.material)) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const pulse = active ? 0.45 + Math.sin(clock.elapsedTime * 4) * 0.2 : 0.1;
    mat.emissiveIntensity = pulse;
  });

  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {geometry}
      <meshStandardMaterial
        color={active ? "#f8fafc" : color}
        emissive={emissive}
        emissiveIntensity={active ? 0.45 : 0.1}
        transparent={opacity < 1}
        opacity={opacity}
        side={side}
        depthWrite={opacity >= 0.9}
      />
    </mesh>
  );
}

function Mitochondrion({
  position,
  rotation,
  active,
  onClick,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <group position={position} rotation={rotation}>
      <SelectableMesh
        active={active}
        onClick={onClick}
        emissive="#f97316"
        color="#ea580c"
        geometry={<capsuleGeometry args={[0.12, 0.35, 8, 16]} />}
      />
    </group>
  );
}

export function CellScene({ selectedId, onSelect, parts }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current && !selectedId) groupRef.current.rotation.y += delta * 0.12;
  });

  const labelById = useMemo(() => new Map(parts.map((p) => [p.id, p.label])), [parts]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <directionalLight position={[-5, -2, -4]} intensity={0.35} />
      <pointLight position={[0, 0, 4]} intensity={0.5} color="#a78bfa" />

      <OrbitControls
        enablePan={false}
        minDistance={2.4}
        maxDistance={6.5}
        autoRotate={!selectedId}
        autoRotateSpeed={0.6}
      />

      <group ref={groupRef}>
        <SelectableMesh
          active={selectedId === "cytoplasm"}
          onClick={() => onSelect("cytoplasm")}
          emissive="#22d3ee"
          color="#0e7490"
          opacity={0.28}
          geometry={<sphereGeometry args={[1.05, 48, 48]} />}
        />

        <SelectableMesh
          active={selectedId === "membrane"}
          onClick={() => onSelect("membrane")}
          emissive="#34d399"
          color="#6ee7b7"
          opacity={0.2}
          side={THREE.DoubleSide}
          geometry={<sphereGeometry args={[1.18, 64, 64]} />}
        />

        <SelectableMesh
          active={selectedId === "nucleus"}
          onClick={() => onSelect("nucleus")}
          emissive="#a855f7"
          color="#7c3aed"
          geometry={<sphereGeometry args={[0.42, 48, 48]} />}
        />
        {selectedId === "nucleus" ? (
          <Html position={[0, 0.62, 0]} center>
            <span className="rounded-full bg-violet-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
              {labelById.get("nucleus")}
            </span>
          </Html>
        ) : null}

        <Mitochondrion
          position={[0.55, 0.2, 0.35]}
          rotation={[0.4, 0.6, 0.2]}
          active={selectedId === "mitochondria"}
          onClick={() => onSelect("mitochondria")}
        />
        <Mitochondrion
          position={[-0.45, -0.25, 0.4]}
          rotation={[0.2, -0.5, 0.4]}
          active={selectedId === "mitochondria"}
          onClick={() => onSelect("mitochondria")}
        />
        <Mitochondrion
          position={[0.1, -0.5, -0.35]}
          rotation={[-0.3, 0.2, 0.5]}
          active={selectedId === "mitochondria"}
          onClick={() => onSelect("mitochondria")}
        />
      </group>
    </>
  );
}
