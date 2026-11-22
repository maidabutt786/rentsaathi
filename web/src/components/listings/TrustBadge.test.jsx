import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TrustBadge from "./TrustBadge.jsx";

describe("TrustBadge", () => {
  it("shows a verified label, icon and fraud score", () => {
    render(<TrustBadge ai={{ fraudLabel: "verified", fraudScore: 18 }} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("· 18/100")).toBeInTheDocument();
    expect(screen.getByLabelText("AI trust status: Verified, fraud score 18 out of 100")).toBeInTheDocument();
  });

  it("never relies on colour alone for high risk", () => {
    render(<TrustBadge ai={{ fraudLabel: "high_risk", fraudScore: 82 }} />);
    expect(screen.getByText("High risk")).toBeInTheDocument();
    expect(screen.getByText("· 82/100")).toBeInTheDocument();
  });

  it("shows an analyzing state when no AI result exists yet", () => {
    render(<TrustBadge ai={null} />);
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
    expect(screen.getByLabelText("AI trust status: Analyzing")).toBeInTheDocument();
  });
});
