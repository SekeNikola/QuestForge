interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, id, disabled = false }: ToggleProps) {
  const toggleId = id ?? `toggle-${Math.random().toString(36).slice(2)}`

  return (
    <div className="flex items-center gap-3">
      {label && (
        <label htmlFor={toggleId} className="text-sm text-gray-300 cursor-pointer select-none">
          {label}
        </label>
      )}
      <button
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f1a]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          checked
            ? 'bg-violet-600 border-violet-500'
            : 'bg-[#2d2d4e] border-[#3d3d6e]',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg',
            'transform transition duration-200 ease-in-out mt-0.5',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
