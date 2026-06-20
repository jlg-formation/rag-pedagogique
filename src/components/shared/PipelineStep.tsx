import clsx from 'clsx'
import { StepBadge } from './StepBadge'

interface Props {
  number: number
  title: string
  status: 'pending' | 'active' | 'done'
  children?: React.ReactNode
}

export function PipelineStep({ number, title, status, children }: Props) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all duration-300',
        status === 'pending' && 'border-gray-200 bg-white opacity-50',
        status === 'active' && 'border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-400',
        status === 'done' && 'border-green-200 bg-green-50',
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <StepBadge number={number} status={status} />
        <h3
          className={clsx(
            'text-sm font-semibold uppercase tracking-wide',
            status === 'pending' && 'text-gray-400',
            status === 'active' && 'text-blue-700',
            status === 'done' && 'text-green-700',
          )}
        >
          {title}
        </h3>
      </div>
      {status !== 'pending' && children}
    </div>
  )
}
