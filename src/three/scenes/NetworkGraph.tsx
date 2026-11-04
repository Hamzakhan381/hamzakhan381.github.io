import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, Object3D, Vector3 } from 'three'
import config from '../scene.json'
import { useHalfWidth, useNarrow, usePalette } from '../kit'
import { scrollState } from '../../lib/scroll'
import { DOUBLE, HALF } from '../../lib/math'

const N = config.network
const GOLDEN_ANGLE = 2.399963229728653
const NODE_SEGMENTS = 1
const PACKET_SEGMENTS = 8
const POINTER_TILT = 0.15

type Edge = [number, number]

function buildGraph() {
  const nodes = Array.from({ length: N.nodes }, (_, i) => {
    const y = 1 - (i / (N.nodes - 1)) * DOUBLE
    const ring = Math.sqrt(1 - y * y)
    const theta = GOLDEN_ANGLE * i
    const jitter = () => (Math.random() - HALF) * N.jitter
    return new Vector3(Math.cos(theta) * ring * N.radius + jitter(), y * N.radius + jitter(), Math.sin(theta) * ring * N.radius + jitter())
  })
  const edges = nodes.flatMap((node, i) =>
    nodes
      .map((other, j) => ({ j, d: node.distanceTo(other) }))
      .filter(({ j }) => j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, N.links)
      .map(({ j }): Edge => (i < j ? [i, j] : [j, i])),
  )
  const unique = Array.from(new Map(edges.map((e) => [e.join('-'), e])).values())
  const neighbours = nodes.map((_, i) => unique.filter((e) => e[0] === i || e[1] === i))
  return { nodes, edges: unique, neighbours }
}

/** Projects: a slowly turning service mesh, with data packets hopping from node to node along its links. */
export function NetworkGraph() {
  const narrow = useNarrow()
  const half = useHalfWidth(N.z)
  const palette = usePalette()
  const group = useRef<Group>(null)
  const nodeMesh = useRef<InstancedMesh>(null)
  const packetMesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const graph = useMemo(buildGraph, [])
  const packetCount = narrow ? N.mobilePackets : N.packets

  const lines = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(graph.edges.flatMap(([a, b]) => [...graph.nodes[a].toArray(), ...graph.nodes[b].toArray()]), graph.nodes[0].toArray().length))
    return g
  }, [graph])
  useEffect(() => () => lines.dispose(), [lines])

  const packets = useMemo(
    () =>
      Array.from({ length: packetCount }, () => {
        const edge = graph.edges[Math.floor(Math.random() * graph.edges.length)]
        return { from: edge[0], to: edge[1], t: Math.random(), speed: N.speedMin + Math.random() * (N.speedMax - N.speedMin) }
      }),
    [graph, packetCount],
  )

  useEffect(() => {
    const mesh = nodeMesh.current
    if (!mesh) return
    graph.nodes.forEach((pos, i) => {
      dummy.position.copy(pos)
      dummy.scale.setScalar(i < N.hubs ? N.hubSize / N.nodeSize : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, i < N.hubs ? palette.accent : palette.line)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [graph, dummy, palette])

  useFrame((state, delta) => {
    const mesh = packetMesh.current
    if (mesh) {
      packets.forEach((packet, i) => {
        const next = packet.t + delta * packet.speed
        const arrived = next >= 1
        const hops = graph.neighbours[packet.to]
        const hop = hops[Math.floor(Math.random() * hops.length)]
        Object.assign(
          packet,
          arrived && hop ? { from: packet.to, to: hop[0] === packet.to ? hop[1] : hop[0], t: 0 } : { t: next % 1 },
        )
        dummy.position.lerpVectors(graph.nodes[packet.from], graph.nodes[packet.to], packet.t)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
    if (group.current) {
      const t = state.clock.elapsedTime
      group.current.rotation.set(
        N.tilt + scrollState.pointerY * POINTER_TILT,
        t * N.spin + scrollState.progress * N.turn + scrollState.spin + scrollState.pointerX * POINTER_TILT,
        0,
      )
      // Off to the right on wide screens, so its nodes and links stay clear of the hero text on the left.
      group.current.position.set(narrow ? 0 : half * N.x, 0, N.z)
      group.current.scale.setScalar(narrow ? N.mobileScale : 1)
    }
  })

  return (
    <group ref={group}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color={palette.line} transparent opacity={N.lineOpacity} />
      </lineSegments>
      <instancedMesh ref={nodeMesh} args={[undefined, undefined, graph.nodes.length]}>
        <icosahedronGeometry args={[N.nodeSize, NODE_SEGMENTS]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={packetMesh} args={[undefined, undefined, packetCount]} frustumCulled={false}>
        <sphereGeometry args={[N.packetSize, PACKET_SEGMENTS, PACKET_SEGMENTS]} />
        <meshBasicMaterial color={palette.accent} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
