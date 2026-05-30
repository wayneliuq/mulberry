type PlayerPillProps = {
  displayName: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  avatarUrl?: string | null;
};

export function PlayerPill({
  displayName,
  selected,
  onToggle,
  disabled = false,
  avatarUrl,
}: PlayerPillProps) {
  return (
    <button
      type="button"
      className={selected ? "player-pill player-pill-selected" : "player-pill"}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
    >
      {selected ? (
        <span className="pill-check-icon" aria-hidden="true">
          ✓
        </span>
      ) : null}
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="avatar-tiny" />
      ) : null}
      <span className="pill-name">{displayName}</span>
    </button>
  );
}
