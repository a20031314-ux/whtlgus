import { ReactNode } from "react";

type HowToSayCardProps = {
  expression: string;
  explanation: string;
  example: string;
  labels: {
    title: string;
    explanation: string;
    example: string;
  };
  actions?: ReactNode;
};

export function HowToSayCard({
  expression,
  explanation,
  example,
  labels,
  actions,
}: HowToSayCardProps) {
  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 shadow-sm">
      <p className="mb-1 text-xs font-semibold tracking-wide text-blue-700">
        {labels.title}
      </p>
      <p className="text-base font-medium" translate="no">{expression}</p>
      <p className="mt-2">
        {labels.explanation}: {explanation}
      </p>
      <p className="mt-2" translate="no">
        {labels.example}: {example}
      </p>
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  );
}
