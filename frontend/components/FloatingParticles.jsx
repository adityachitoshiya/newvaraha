import { useEffect, useState } from 'react';

export default function FloatingParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 10,
      size: 2 + Math.random() * 3,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 rounded-full bg-royal-orange/30 blur-sm"
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `particle ${particle.duration}s ease-in infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: '0 0 10px rgba(224, 122, 36, 0.5)',
          }}
        />
      ))}
    </div>
  );
}
