"use client";

type InfoTooltipProps = {
  text: string;
  ariaLabel?: string;
};

export function InfoTooltip({ text, ariaLabel = "More information" }: InfoTooltipProps) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={ariaLabel}>
      <span className="info-tooltip__icon" aria-hidden="true">i</span>
      <span className="info-tooltip__bubble" role="tooltip">{text}</span>
    </span>
  );
}
