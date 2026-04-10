// Simplified vertical label for mobile (like desktop NeonVerticalLabel)

interface VerticalLabelProps {
  text: string
  color: string
}

export const VerticalLabel = ({ text, color }: VerticalLabelProps) => {
  const letters = text.toUpperCase().split('')
  return (
    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10 pointer-events-none">
      {letters.map((letter, idx) => (
        <span
          key={idx}
          className="font-bold text-xs leading-none block"
          style={{
            color: color,
            opacity: 0.85,
            textShadow: `0 0 10px ${color}50, 0 0 20px ${color}30`,
            fontFamily: 'Anton, sans-serif',
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  )
}
