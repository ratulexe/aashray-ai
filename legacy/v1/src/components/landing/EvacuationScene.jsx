import { Float, Line } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function RouteBeacon({ curve, reducedMotion }) {
  const beacon = useRef(null)

  useFrame(({ clock }) => {
    if (!beacon.current || reducedMotion) {
      return
    }

    const progress = (clock.getElapsedTime() * 0.12) % 1
    beacon.current.position.copy(curve.getPointAt(progress))
  })

  return (
    <mesh ref={beacon} position={curve.getPointAt(0.42)}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshStandardMaterial
        color="#effffb"
        emissive="#2dd4bf"
        emissiveIntensity={4}
      />
    </mesh>
  )
}

function CitizenNode({ reducedMotion }) {
  return (
    <Float
      speed={reducedMotion ? 0 : 1.25}
      rotationIntensity={reducedMotion ? 0 : 0.08}
      floatIntensity={reducedMotion ? 0 : 0.22}
    >
      <group position={[-2.55, 0.52, 1.15]}>
        <mesh position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshStandardMaterial
            color="#67e8f9"
            emissive="#0891b2"
            emissiveIntensity={1.2}
            roughness={0.28}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.53, 0.025, 12, 64]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.52} />
        </mesh>
        <pointLight color="#22d3ee" intensity={3.5} distance={2.8} />
      </group>
    </Float>
  )
}

function ShelterNode({ reducedMotion }) {
  return (
    <Float
      speed={reducedMotion ? 0 : 0.85}
      rotationIntensity={reducedMotion ? 0 : 0.04}
      floatIntensity={reducedMotion ? 0 : 0.16}
    >
      <group position={[2.35, 0.4, -1.1]} rotation={[0, -0.32, 0]}>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[1.05, 0.78, 0.9]} />
          <meshStandardMaterial
            color="#99f6e4"
            emissive="#0f766e"
            emissiveIntensity={0.65}
            roughness={0.32}
          />
        </mesh>
        <mesh position={[0, 0.93, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.83, 0.55, 4]} />
          <meshStandardMaterial color="#e2fff8" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.25, 0.456]}>
          <boxGeometry args={[0.28, 0.5, 0.03]} />
          <meshStandardMaterial color="#0b3735" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.24, 0]}>
          <torusGeometry args={[0.78, 0.03, 12, 64]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.58} />
        </mesh>
        <pointLight color="#34d399" intensity={4.2} distance={3.5} />
      </group>
    </Float>
  )
}

function ResponseScene({ reducedMotion }) {
  const route = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.55, 0.34, 1.15),
        new THREE.Vector3(-1.55, 0.5, 0.7),
        new THREE.Vector3(-0.45, 0.28, 0.2),
        new THREE.Vector3(0.65, 0.52, -0.15),
        new THREE.Vector3(1.5, 0.33, -0.72),
        new THREE.Vector3(2.35, 0.26, -1.1),
      ]),
    [],
  )
  const routePoints = useMemo(() => route.getPoints(64), [route])

  return (
    <>
      <color attach="background" args={['#071d1e']} />
      <fog attach="fog" args={['#071d1e', 7, 13]} />
      <ambientLight intensity={0.82} color="#b8fff1" />
      <directionalLight position={[2, 6, 4]} intensity={2.4} color="#d6fff8" />
      <pointLight position={[-4, 2, -2]} intensity={4} color="#155e75" />

      <group rotation={[0, -0.08, 0]}>
        <gridHelper
          args={[10, 18, '#1c6965', '#123d3d']}
          position={[0, -0.02, 0]}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <planeGeometry args={[11, 8]} />
          <meshStandardMaterial
            color="#081f20"
            roughness={0.82}
            metalness={0.16}
          />
        </mesh>

        <Line
          points={routePoints}
          color="#5eead4"
          lineWidth={2.4}
          transparent
          opacity={0.82}
        />
        <Line
          points={routePoints}
          color="#a7f3d0"
          lineWidth={0.8}
          dashed
          dashSize={0.14}
          gapSize={0.1}
          transparent
          opacity={0.8}
        />
        <RouteBeacon curve={route} reducedMotion={reducedMotion} />
        <CitizenNode reducedMotion={reducedMotion} />
        <ShelterNode reducedMotion={reducedMotion} />

        {[
          [-3.4, 0.13, -1.4],
          [-1.25, 0.13, -1.7],
          [0.35, 0.13, 1.5],
          [3.15, 0.13, 0.9],
        ].map((position) => (
          <mesh key={position.join('-')} position={position}>
            <cylinderGeometry args={[0.06, 0.12, 0.2, 10]} />
            <meshStandardMaterial color="#1f766f" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </>
  )
}

function canRenderWebGl() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

function EvacuationScene() {
  const reducedMotion = useReducedMotion()

  if (!canRenderWebGl()) {
    return <div className="evacuation-scene-fallback" aria-hidden="true" />
  }

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 4.1, 7.4], fov: 43, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <ResponseScene reducedMotion={reducedMotion} />
    </Canvas>
  )
}

export default EvacuationScene
