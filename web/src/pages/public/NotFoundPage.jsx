import { Link } from "react-router-dom";
import { Compass, Home, LifeBuoy } from "lucide-react";

import Logo from "../../components/ui/Logo.jsx";
import Button from "../../components/ui/Button.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <Logo height={64} linked={false} />
      <p className="mt-8 font-heading text-7xl font-bold text-primary">404</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold">This page moved or never existed</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        The link may be old, or the listing may have been removed. Try the room search, or head back home.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button to="/">
          <Home className="h-4 w-4" aria-hidden="true" /> Go home
        </Button>
        <Button to="/listings" variant="outline">
          <Compass className="h-4 w-4" aria-hidden="true" /> Find a room
        </Button>
        <Button to="/contact" variant="ghost">
          <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Get help
        </Button>
      </div>
      <p className="mt-6 text-xs text-muted">
        Looking for a listing?{" "}
        <Link to="/listings" className="font-semibold text-primary hover:underline">
          Browse all rooms
        </Link>
        .
      </p>
    </div>
  );
}
