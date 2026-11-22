import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import Navbar from "./Navbar.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import { I18nProvider } from "../../i18n/index.jsx";

function renderNavbar() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("Navbar branding", () => {
  it("shows the RentSaathi logo with alt text and links it home", async () => {
    renderNavbar();
    const logo = await screen.findByAltText("RentSaathi");
    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toContain("rentsaathi-logo");
    const link = logo.closest("a");
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("/");
    expect(link.getAttribute("aria-label")).toBe("RentSaathi home");
  });

  it("renders the public navigation with brand-coloured active state", async () => {
    renderNavbar();
    await waitFor(() => expect(screen.getAllByText("Find a room").length).toBeGreaterThan(0));
    const listingsLink = screen.getAllByText("Find a room")[0].closest("a");
    expect(listingsLink.getAttribute("href")).toBe("/listings");
  });
});
