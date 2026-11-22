import { initials } from "../../lib/format.js";

export default function Avatar({ name = "", src, size = 40, className = "" }) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        style={style}
        className={`shrink-0 rounded-full border border-line object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-secondary-soft text-sm font-semibold text-secondary ${className}`}
    >
      {initials(name) || "RS"}
    </span>
  );
}
