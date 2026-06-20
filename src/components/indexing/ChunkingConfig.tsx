import type { ChunkingConfig } from '../../types'

interface Props {
  config: ChunkingConfig
  onChange: (config: ChunkingConfig) => void
  disabled?: boolean
}

export function ChunkingConfigPanel({ config, onChange, disabled }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        ⚙️ Paramètres de découpage
      </h3>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Taille des chunks</span>
          <span className="font-mono font-bold text-blue-600">
            {config.chunkSize} mots
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={config.chunkSize}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...config, chunkSize: Number(e.target.value) })
          }
          className="w-full accent-blue-600"
        />
        <div className="mt-0.5 flex justify-between text-xs text-gray-400">
          <span>10</span>
          <span>300</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Recouvrement (overlap)</span>
          <span className="font-mono font-bold text-purple-600">
            {config.overlap} mots
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.floor(config.chunkSize / 2)}
          step={5}
          value={config.overlap}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...config, overlap: Number(e.target.value) })
          }
          className="w-full accent-purple-600"
        />
        <div className="mt-0.5 flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>{Math.floor(config.chunkSize / 2)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Chaque chunk (sauf le dernier) contient exactement{' '}
        <strong>{config.chunkSize}</strong> mots. Le recouvrement reprend les{' '}
        <strong>{config.overlap}</strong> derniers mots du chunk précédent.
      </p>
    </div>
  )
}
