// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { queryClient } from "../client/src/lib/queryClient";
import App from "../client/src/App";

// The sidebar is outside the auth router; it does not participate in this flow.
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/DashboardHeader", () => ({ default: () => null }));

describe("auth response with no user", () => {
  beforeEach(() => {
    queryClient.clear();
    localStorage.clear();
    localStorage.setItem("hms_token", "stale-token");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clears the token, displays a destructive session error, and renders Login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
        headers: { Authorization: "Bearer stale-token" },
        credentials: "include",
      });
      expect(localStorage.getItem("hms_token")).toBeNull();
    });

    const title = await screen.findByText("Session error");
    expect(screen.getByText("Your session could not be verified. Please sign in again.")).toBeInTheDocument();
    expect(title.closest("[data-state]")).toHaveClass("destructive");
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to access the system")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});