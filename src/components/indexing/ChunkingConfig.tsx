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
            ~{config.chunkSize} tokens
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={25}
          value={config.chunkSize}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...config, chunkSize: Number(e.target.value) })
          }
          className="w-full accent-blue-600"
        />
        <div className="mt-0.5 flex justify-between text-xs text-gray-400">
          <span>50</span>
          <span>500</span>
        </div>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Recouvrement (overlap)</span>
          <span className="font-mono font-bold text-purple-600">
            ~{config.overlap} tokens
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.floor(config.chunkSize / 2)}
          step={10}
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
        Le recouvrement permet à des informations situées à la frontière entre
        deux chunks de ne pas être perdues lors de la recherche.
      </p>
    </div>
  )
}
