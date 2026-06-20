interface Props {
  vector: Float32Array
  dims?: number
}

export function MiniVector({ vector, dims = 24 }: Props) {
  const values = Array.from(vector.slice(0, dims))
  const max = Math.max(...values.map(Math.abs), 0.01)

  return (
    <div className="flex items-end gap-px" style={{ height: 32 }}>
      {values.map((v, i) => {
        const height = Math.round((Math.abs(v) / max) * 28)
        return (
          <div
            key={i}
            className="w-2 rounded-sm transition-all duration-300"
            style={{
              height: Math.max(2, height),
              backgroundColor: v >= 0 ? '#3b82f6' : '#ef4444',
              opacity: 0.7 + (Math.abs(v) / max) * 0.3,
            }}
            title={`dim[${i}]=${v.toFixed(4)}`}
          />
        )
      })}
    </div>
  )
}
