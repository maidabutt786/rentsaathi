import { forwardRef, useId } from "react";

export const Input = forwardRef(function Input(
  { label, error, hint, className = "", id, required, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <div className={className}>
      {label ? (
        <label className="label-base" htmlFor={inputId}>
          {label}
          {required ? <span className="ml-0.5 text-primary">*</span> : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`input-base ${error ? "border-status-highrisk focus:border-status-highrisk focus:ring-status-highrisk/20" : ""}`}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-status-highrisk">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = "", id, required, rows = 4, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <div className={className}>
      {label ? (
        <label className="label-base" htmlFor={inputId}>
          {label}
          {required ? <span className="ml-0.5 text-primary">*</span> : null}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`input-base resize-y ${error ? "border-status-highrisk focus:border-status-highrisk focus:ring-status-highrisk/20" : ""}`}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-status-highrisk">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, className = "", id, required, children, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <div className={className}>
      {label ? (
        <label className="label-base" htmlFor={inputId}>
          {label}
          {required ? <span className="ml-0.5 text-primary">*</span> : null}
        </label>
      ) : null}
      <select
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? "true" : undefined}
        className={`input-base appearance-none ${error ? "border-status-highrisk" : ""}`}
        {...props}
      >
        {children}
      </select>
      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-status-highrisk">{error}</p> : null}
    </div>
  );
});
