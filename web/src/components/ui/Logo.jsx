import { Link } from "react-router-dom";

import logoTransparent from "../../assets/rentsaathi-logo-transparent.png";
import icon from "../../assets/rentsaathi-icon.png";

export function Logo({ variant = "full", className = "", height = 44, linked = true, alt = "RentSaathi" }) {
  const source = variant === "icon" ? icon : logoTransparent;
  const image = (
    <img
      src={source}
      alt={alt}
      style={{ height }}
      width={variant === "icon" ? height : undefined}
      className={`${variant === "icon" ? "rounded-xl object-cover" : "w-auto object-contain"} ${className}`}
      loading={linked ? "eager" : "lazy"}
    />
  );
  if (!linked) return image;
  return (
    <Link to="/" className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="RentSaathi home">
      {image}
    </Link>
  );
}

export default Logo;
