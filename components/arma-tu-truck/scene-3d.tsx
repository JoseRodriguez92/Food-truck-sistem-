"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40, 40, 40]} />
      <meshBasicMaterial color="#E8C547" wireframe />
    </mesh>
  )
}

export function Scene3D() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#1F1F1F"]} />

      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} near={0.1} far={200} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />

      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1} />

      <Suspense fallback={null}>
        <Floor />
      </Suspense>
    </Canvas>
  )
}
