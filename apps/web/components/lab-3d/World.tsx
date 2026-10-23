"use client";
import { useRef, useMemo, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Instances, Instance } from "@react-three/drei";
import { Vector3, CanvasTexture, type Group } from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import type { SimulationEvent } from "@packages/contracts";
import { useReplay } from "./store";
function Label({
  text,
  position,
  color = "#155e55",
}: {
  text: string;
  position: [number, number, number];
  color?: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillRect(0, 0, 512, 80);
    ctx.fillStyle = color;
    ctx.font = "bold 25px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 40);
    return new CanvasTexture(canvas);
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[2.8, 0.44, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
const colors = { buy: "#43ab87", reject: "#d97872", undecided: "#deb85c" };
type Props = {
  events: SimulationEvent[];
  ids: string[];
  seed: number;
  onCycle: () => void;
  focus: boolean;
};
function Block({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
function Avatar({
  events,
  index,
  time,
  selected,
  onSelect,
}: {
  events: SimulationEvent[];
  index: number;
  time: React.RefObject<number>;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);
  const inventory = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const decision = events.find((e) => e.type === "DECISION_SHOWN")?.decision;
  useFrame(() => {
    const t = time.current - index * 0.11;
    if (!group.current) return;
    group.current.visible = t >= 0 && t < 10;
    const lane = ((index % 6) - 2.5) * 0.5;
    let x = -6 + lane,
      z = 3 + (index % 4) * 0.35;
    if (t > 1 && t < 3) {
      const u = (t - 1) / 2;
      x = x * (1 - u) + lane * u;
      z = z * (1 - u) + 0.7 * u;
    } else if (t >= 3 && t < 6.5) {
      x = lane;
      z = 0.7 + (index % 3) * 0.35;
    } else if (t >= 6.5) {
      const u = Math.min(1, (t - 6.5) / 3.5),
        target = decision === "buy" ? -4 : decision === "reject" ? 4 : 0;
      x = lane * (1 - u) + target * u;
      z = 0.7 * (1 - u) - 3 * u;
    }
    group.current.position.set(
      x,
      0.17 +
        ((t > 1 && t < 3) || t > 6.5 ? Math.abs(Math.sin(t * 9)) * 0.045 : 0),
      z,
    );
    if (inventory.current)
      inventory.current.visible = events.some(
        (e) => e.type === "INVENTORY_ITEM_ADDED" && e.at <= t * 1000,
      );
    if (halo.current) halo.current.visible = t >= 5;
  });
  return (
    <group
      name={events[0]?.customerId}
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Block
        position={[0, 0.5, 0]}
        size={[0.32, 0.42, 0.22]}
        color={
          selected
            ? "#155e55"
            : ["#5b8fb1", "#9b8cbd", "#d2a16d", "#6aa69a"][index % 4]
        }
      />
      <Block position={[0, 0.85, 0]} size={[0.3, 0.28, 0.28]} color="#e8dfd0" />
      <Block
        position={[-0.09, 0.16, 0]}
        size={[0.12, 0.25, 0.16]}
        color="#334654"
      />
      <Block
        position={[0.09, 0.16, 0]}
        size={[0.12, 0.25, 0.16]}
        color="#334654"
      />
      <Block
        position={[-0.24, 0.51, 0]}
        size={[0.12, 0.3, 0.15]}
        color="#e8dfd0"
      />
      <Block
        position={[0.24, 0.51, 0]}
        size={[0.12, 0.3, 0.15]}
        color="#e8dfd0"
      />
      <group ref={inventory}>
        <Block
          position={[0.3, 0.6, 0.17]}
          size={[0.23, 0.28, 0.07]}
          color="#155e55"
        />
      </group>
      <group ref={halo}>
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={colors[decision ?? "undecided"]} />
        </mesh>
      </group>
      {selected && (
        <Label
          text={events[0]?.customerId.slice(0, 10) ?? ""}
          position={[0, 1.5, 0]}
        />
      )}
    </group>
  );
}
function Scene({ events, ids, seed, onCycle, focus }: Props) {
  const time = useRef(0);
  const controls = useRef<Controls>(null);
  const { scene, camera, invalidate } = useThree();
  const { playing, speed, selected, select, setPlaying, epoch } = useReplay();
  useEffect(() => {
    time.current = 0;
  }, [ids.join(","), epoch]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(invalidate, 1000 / 30);
    return () => clearInterval(timer);
  }, [playing, invalidate]);
  useEffect(() => {
    if ("zoom" in camera) {
      camera.zoom = focus ? 65 : 43;
      camera.updateProjectionMatrix();
    }
    if (!focus) controls.current?.target.set(0, 0, 0);
    invalidate();
  }, [focus, camera, invalidate]);
  useFrame((_, delta) => {
    if (focus && controls.current) {
      const avatar = scene.getObjectByName(selected);
      const target = focus && avatar ? avatar.position : new Vector3(0, 0, 0);
      controls.current.target.lerp(target, 0.08);
      controls.current.update();
    }
    if (!playing) return;
    time.current += Math.min(delta, 0.1) * speed;
    if (time.current > 15) {
      time.current = 0;
      onCycle();
    }
  });
  return (
    <>
      <color attach="background" args={["#edf2f1"]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[8, 15, 6]} intensity={2} />
      <group>
        <Block position={[0, -0.25, 0]} size={[15, 0.5, 12]} color="#dce9e3" />
        <Instances limit={180}>
          <boxGeometry args={[0.96, 0.04, 0.96]} />
          <meshStandardMaterial roughness={0.9} />
          {Array.from({ length: 180 }, (_, i) => (
            <Instance
              key={i}
              position={[Math.floor(i / 12) - 7, 0.01, (i % 12) - 5.5]}
              color={
                (Math.floor(i / 12) + (i % 12)) % 2 ? "#e9f0e9" : "#e3ece6"
              }
            />
          ))}
        </Instances>
        <Block
          position={[0, 0.22, 0]}
          size={[3.7, 0.35, 2.5]}
          color="#c1d9d0"
        />
        <Block
          position={[0, 0.75, -0.6]}
          size={[1.5, 1.1, 0.65]}
          color="#155e55"
        />
        <Block
          position={[0, 1.36, -0.6]}
          size={[1.8, 0.12, 0.85]}
          color="#80bdac"
        />
        <Block
          position={[0, 1.7, -0.6]}
          size={[0.55, 0.55, 0.18]}
          color="#f0ce7b"
        />
        <Label text="ESTAÇÃO DA OFERTA" position={[0, 2.3, -0.7]} />
        {(["buy", "undecided", "reject"] as const).map((d, i) => (
          <group key={d}>
            <Block
              position={[(i - 1) * 4, 0.09, -3]}
              size={[3, 0.12, 2]}
              color={
                d === "buy" ? "#c3e5d3" : d === "reject" ? "#ecd1ca" : "#eee0bb"
              }
            />
            <Label
              position={[(i - 1) * 4, 0.5, -4.3]}
              color={colors[d]}
              text={
                d === "buy"
                  ? "ACEITAÇÃO"
                  : d === "reject"
                    ? "REJEIÇÃO"
                    : "INDECISÃO"
              }
            />
          </group>
        ))}
        {[-6.3, 6.3].map((x) =>
          [-4, 1, 4].map((z) => (
            <group key={x + ":" + z}>
              <Block
                position={[x, 0.3, z]}
                size={[0.7, 0.6, 0.7]}
                color="#b7cbc1"
              />
              <Block
                position={[x, 0.95, z]}
                size={[0.85, 0.9, 0.85]}
                color="#659780"
              />
              <Block
                position={[x, 1.45, z]}
                size={[0.55, 0.4, 0.55]}
                color="#81af8c"
              />
            </group>
          )),
        )}
        {ids.map((id, index) => (
          <Avatar
            key={id}
            events={events.filter((e) => e.customerId === id)}
            index={(index + (seed % 7)) % ids.length}
            time={time}
            selected={selected === id}
            onSelect={() => {
              select(id);
              setPlaying(false);
            }}
          />
        ))}
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={false}
        enableRotate={!focus}
        minZoom={28}
        maxZoom={90}
        target={[0, 0, 0]}
      />
    </>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="webgl-error">
        O 3D não está disponível neste dispositivo. Use a visualização em tabela
        abaixo.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function World(props: Props) {
  return (
    <Boundary>
      <Canvas
        orthographic
        frameloop="demand"
        camera={{ position: [13, 12, 15], zoom: 43, near: 0.1, far: 100 }}
        dpr={1}
        gl={{ antialias: true }}
      >
        <Scene {...props} />
      </Canvas>
    </Boundary>
  );
}
