import clsx from 'clsx'

interface Props {
  number: number
  status: 'pending' | 'active' | 'done'
}

export function StepBadge({ number, status }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-all duration-300',
        status === 'pending' && 'bg-gray-200 text-gray-500',
        status === 'active' && 'animate-pulse bg-blue-600 text-white',
        status === 'done' && 'bg-green-600 text-white',
      )}
    >
      {status === 'done' ? '✓' : number}
    </span>
  )
}
