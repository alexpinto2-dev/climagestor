const petals = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 7.3 + 3) % 100,
  size: 10 + ((i * 5) % 18),
  duration: 14 + ((i * 3) % 12),
  delay: -(i * 2.4),
  drift: i % 2 === 0 ? 30 : -30,
}));

export function IcePetals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute -top-16 text-primary/25 ice-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--petal-drift" as string]: `${p.drift}px`,
          }}
          fill="currentColor"
        >
          <path d="M12 1c3 4.5 4.5 7.5 4.5 11S14.5 19 12 23c-2.5-4-4.5-7.5-4.5-11S9 5.5 12 1z" />
        </svg>
      ))}
    </div>
  );
}
