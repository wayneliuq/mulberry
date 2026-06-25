export type OptionPillGroupOption<T extends string> = {
  value: T;
  label: string;
};

type OptionPillGroupProps<T extends string> = {
  options: readonly OptionPillGroupOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

/**
 * Mutually exclusive pill selector. Reuses `player-pill` styles for a compact
 * toggle row (e.g. Team A / Team B). Clicking the active pill clears the value.
 */
export function OptionPillGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: OptionPillGroupProps<T>) {
  return (
    <div className="option-pill-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={
              selected ? "player-pill player-pill-selected" : "player-pill"
            }
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(selected ? null : option.value)}
          >
            {selected ? (
              <span className="pill-check-icon" aria-hidden="true">
                ✓
              </span>
            ) : null}
            <span className="pill-name">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
