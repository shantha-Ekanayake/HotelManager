// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { apiRequest, queryClient } from "../client/src/lib/queryClient";
import App from "../client/src/App";

// The sidebar is outside the auth router; it does not participate in this flow.
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/DashboardHeader", () => ({ default: () => null }));
vi.mock("@/pages/Dashboard", () => ({ default: () => <div>Dashboard loaded</div> }));

describe("auth verification", () => {
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

  it("clears a token rejected with 401, renders Login, and stops sending that token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "Invalid token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("hms_token")).toBeNull());
    expect(screen.getByText("Session expired")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", {
      headers: { Authorization: "Bearer stale-token" },
      credentials: "include",
    });
    fetchMock.mockResolvedValueOnce({ ok: true });
    await apiRequest("GET", "/api/after-logout");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/after-logout", {
      method: "GET",
      headers: {},
      body: undefined,
      credentials: "include",
    });
  });

  it("leaves staff screens when a later verification rejects a previously accepted token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1", username: "staff", role: "admin", propertyId: "1" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: "Token expired" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    expect(await screen.findByText("Dashboard loaded")).toBeInTheDocument();

    await queryClient.refetchQueries({ queryKey: ["/api", "auth", "me"] });

    await waitFor(() => {
      expect(localStorage.getItem("hms_token")).toBeNull();
      expect(screen.queryByText("Dashboard loaded")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the token and offers retry if verification fails without a 401", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1", username: "staff", role: "admin", propertyId: "1" } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't verify your session");
    expect(localStorage.getItem("hms_token")).toBe("stale-token");
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();

    fireEvent.click(retry);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/me", {
      headers: { Authorization: "Bearer stale-token" },
      credentials: "include",
    });
    await waitFor(() => expect(screen.getByText("Dashboard loaded")).toBeInTheDocument());
    expect(localStorage.getItem("hms_token")).toBe("stale-token");
  });
});