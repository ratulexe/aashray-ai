const particles = Array.from({ length: 22 }, (_, index) => ({
  id: index,
  x: (index * 37 + 11) % 100,
  y: (index * 53 + 7) % 100,
  size: 2 + (index % 3),
  duration: 11 + (index % 6) * 2,
  delay: -(index % 9) * 1.7,
  drift: 16 + (index % 5) * 7,
}))

function EmergencyParticles() {
  return (
    <div className="emergency-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            '--particle-x': `${particle.x}%`,
            '--particle-y': `${particle.y}%`,
            '--particle-size': `${particle.size}px`,
            '--particle-duration': `${particle.duration}s`,
            '--particle-delay': `${particle.delay}s`,
            '--particle-drift': `${particle.drift}px`,
            '--particle-rise': `${particle.drift * -1}px`,
          }}
        />
      ))}
    </div>
  )
}

export default EmergencyParticles
