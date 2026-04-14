import { TTSButton } from "./TTSButton";
import { ReactNode } from "react";

type CorrectionCardProps = {
  highlighted: string;
  corrected: string;
  natural: string;
  explanation: string;
  hasError: boolean;
  feedback: string;
  labels: {
    title: string;
    highlighted: string;
    corrected: string;
    natural: string;
    explanation: string;
    listen: string;
    noCorrectionNeeded: string;
  };
  actions?: ReactNode;
};

export function CorrectionCard({
  highlighted,
  corrected,
  natural,
  explanation,
  hasError,
  feedback,
  labels,
  actions,
}: CorrectionCardProps) {
  const showNatural = hasError && natural.trim() !== corrected.trim();

  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        {labels.title}
      </p>
      <p className="text-sm font-medium text-emerald-900">{feedback}</p>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          {labels.corrected}: {corrected}
        </p>
        <TTSButton text={corrected} ariaLabel={labels.listen} />
      </div>
      {hasError ? (
        <>
          <p className="mt-2" translate="no">
            {labels.highlighted}: {highlighted}
          </p>
          {showNatural && (
            <p className="mt-2" translate="no">
              {labels.natural}: {natural}
            </p>
          )}
          <p className="mt-2 text-emerald-900/90">
            {labels.explanation}: {explanation}
          </p>
        </>
      ) : (
        <p className="mt-2 text-emerald-900/90">{labels.noCorrectionNeeded}</p>
      )}
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  );
}
