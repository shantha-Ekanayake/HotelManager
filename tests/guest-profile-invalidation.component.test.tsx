// @vitest-environment jsdom

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { guestQueryKey, queryClient } from "../client/src/lib/queryClient.js";

const { mutationOptions, guests, tagUpdates } = vi.hoisted(() => ({
  mutationOptions: [] as Array<{
    mutationFn: (variables: any) => Promise<any>;
    onSuccess: (response: any, variables: any) => void;
  }>,
  guests: [] as any[],
  tagUpdates: [] as string[][],
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: any) => ({
      data: options.queryKey[0] === "/api/guests/all" ? { guests } : null,
      isLoading: false,
    }),
    useMutation: (options: any) => {
      mutationOptions.push(options);
      return {
        mutate: (variables: any) => {
          if (options.mutationFn.toString().includes("/tags")) {
            tagUpdates.push(variables.tags);
          }
          options.onSuccess?.({}, variables);
        },
        isPending: false,
      };
    },
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

import Guests from "../client/src/pages/Guests.js";

afterEach(() => {
  mutationOptions.length = 0;
  guests.length = 0;
  tagUpdates.length = 0;
  queryClient.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("guest profile mutation cache invalidation", () => {
  it.each([
    ["loyalty", 2, { loyaltyTier: "gold", loyaltyPoints: 50 }],
    ["blacklist", 3, { blacklistStatus: true }],
    ["tags", 4, { tags: ["returning"] }],
  ])("%s success invalidates the updated guest's detail/profile and list", async (path, index, fields) => {
    render(<Guests />);
    const mutation = mutationOptions[index];
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", request);

    const variables = { id: "guest-updated", ...fields };
    const response = await mutation.mutationFn(variables);
    expect(request).toHaveBeenCalledWith(
      `/api/guests/guest-updated/${path}`,
      expect.objectContaining({ method: "PUT" }),
    );

    const profileKey = [...guestQueryKey("guest-updated"), "profile"];
    const otherProfileKey = [...guestQueryKey("another-guest"), "profile"];
    queryClient.setQueryData(profileKey, { guest: variables });
    queryClient.setQueryData(otherProfileKey, { guest: { id: "another-guest" } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    mutation.onSuccess(response, variables);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["/api/guests/all"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: guestQueryKey("guest-updated") });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: guestQueryKey("another-guest") });
    expect(queryClient.getQueryState(profileKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherProfileKey)?.isInvalidated).toBe(false);
  });

  it("segment success marks only the updated guest's profile stale along with the directory", async () => {
    render(<Guests />);
    const mutation = mutationOptions[5];
    const request = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", request);

    const variables = { id: "guest-updated", segment: "business" };
    const response = await mutation.mutationFn(variables);
    expect(request).toHaveBeenCalledWith(
      "/api/guests/guest-updated/segment",
      expect.objectContaining({ method: "PUT" }),
    );

    const profileKey = [...guestQueryKey("guest-updated"), "profile"];
    const otherProfileKey = [...guestQueryKey("another-guest"), "profile"];
    const directoryKey = ["/api/guests/all"];
    queryClient.setQueryData(profileKey, { guest: variables });
    queryClient.setQueryData(otherProfileKey, { guest: { id: "another-guest" } });
    queryClient.setQueryData(directoryKey, { guests: [] });

    mutation.onSuccess(response, variables);

    expect(queryClient.getQueryState(directoryKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(profileKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(otherProfileKey)?.isInvalidated).toBe(false);
  });

  it("updates the open profile after loyalty and blacklist changes and keeps consecutive tags", () => {
    guests.push({
      id: "guest-updated",
      firstName: "Test",
      lastName: "Guest",
      createdAt: "2026-01-01T00:00:00Z",
      vipStatus: false,
      loyaltyTier: "none",
      loyaltyPoints: 0,
      blacklistStatus: false,
      tags: [],
    });
    render(<Guests />);
    fireEvent.click(screen.getByTestId("card-guest-guest-updated"));

    act(() => {
      mutationOptions[2].onSuccess({}, { id: "guest-updated", loyaltyTier: "gold", loyaltyPoints: 50 });
      mutationOptions[3].onSuccess({}, { id: "guest-updated", blacklistStatus: true });
    });
    expect(screen.getByText("gold (50 pts)")).toBeInTheDocument();
    expect(screen.getAllByText("Blacklisted").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByTestId("input-new-tag"), { target: { value: "returning" } });
    fireEvent.click(screen.getByTestId("button-add-tag"));
    expect(screen.getByText("returning")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("input-new-tag"), { target: { value: "priority" } });
    fireEvent.click(screen.getByTestId("button-add-tag"));

    expect(tagUpdates).toEqual([["returning"], ["returning", "priority"]]);
    expect(screen.getByText("priority")).toBeInTheDocument();
  });
});