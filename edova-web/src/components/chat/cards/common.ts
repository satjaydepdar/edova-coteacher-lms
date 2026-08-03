/** Segmented-control option style shared by the chat card widgets. */
export const seg = (active: boolean) =>
  "flex-1 cursor-pointer rounded-[7px] px-2 py-1.5 text-center text-[12px] font-semibold transition-colors " +
  (active ? "bg-white text-ink shadow-sm" : "text-text-secondary")
