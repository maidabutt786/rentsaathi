import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ProtectedRoute from "./ProtectedRoute.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";

function renderGuard(initialPath, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div>Student dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("redirects a visitor without a session to login", async () => {
    renderGuard("/student", ["student"]);
    expect(await screen.findByText("Login screen")).toBeInTheDocument();
  });

  it("blocks a signed-in student from the landlord area", async () => {
    window.localStorage.setItem(
      "rentsaathi.demoSession",
      JSON.stringify({ uid: "student-1", email: "student1@rentsaathi.pk", name: "Hamza Ali", role: "student" }),
    );
    renderGuard("/student", ["landlord"]);
    expect(await screen.findByText("You do not have access to this page")).toBeInTheDocument();
  });

  it("lets a student into the student area", async () => {
    window.localStorage.setItem(
      "rentsaathi.demoSession",
      JSON.stringify({ uid: "student-1", email: "student1@rentsaathi.pk", name: "Hamza Ali", role: "student" }),
    );
    renderGuard("/student", ["student"]);
    await waitFor(() => expect(screen.getByText("Student dashboard")).toBeInTheDocument());
  });
});
