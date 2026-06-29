import type { FaithfulnessResult, FaithfulnessVerdict } from '../../types'

interface Props {
  result: FaithfulnessResult | null
  isLoading: boolean
}

const VERDICT_CONFIG: Record<
  FaithfulnessVerdict,
  { label: string; icon: string; containerCls: string; badgeCls: string }
> = {
  SUPPORTED: {
    label: 'ANCRÉ DANS LE CONTEXTE',
    icon: '✓',
    containerCls: 'border-green-300 bg-green-50',
    badgeCls: 'bg-green-100 text-green-800 border-green-300',
  },
  PARTIAL: {
    label: 'PARTIELLEMENT ANCRÉ',
    icon: '~',
    containerCls: 'border-yellow-300 bg-yellow-50',
    badgeCls: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  UNSUPPORTED: {
    label: 'NON ANCRÉ',
    icon: '✗',
    containerCls: 'border-red-300 bg-red-50',
    badgeCls: 'bg-red-100 text-red-800 border-red-300',
  },
}

export function SelfRagFaithfulness({ result, isLoading }: Props) {
  if (isLoading || !result) {
    return (
      <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-400">
          {isLoading ? 'Évaluation de la fidélité en cours…' : 'En attente…'}
        </p>
      </div>
    )
  }

  const cfg = VERDICT_CONFIG[result.verdict]

  return (
    <div className={`rounded-xl border p-4 transition-all duration-500 ${cfg.containerCls}`}>
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-base font-bold ${cfg.badgeCls}`}>
          {cfg.icon}
        </span>
        <div>
          <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}>
            {cfg.label}
          </span>
          <p className="mt-1 text-xs italic text-gray-600">{result.reasoning}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        Vérifie que la réponse générée est entièrement justifiée par les chunks injectés dans le prompt.
      </p>
    </div>
  )
}
