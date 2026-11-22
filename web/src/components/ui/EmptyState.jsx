import { Home } from "lucide-react";

export default function EmptyState({ icon: Icon = Home, title, body, action, className = "" }) {
  return (
    <div className={`card flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body ? <p className="mt-2 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
