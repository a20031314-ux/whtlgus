type SaveButtonProps = {
  isSaved: boolean;
  saveLabel: string;
  savedLabel: string;
  onSave: () => void;
};

export function SaveButton({
  isSaved,
  saveLabel,
  savedLabel,
  onSave,
}: SaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={isSaved}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSaved ? savedLabel : saveLabel}
    </button>
  );
}
