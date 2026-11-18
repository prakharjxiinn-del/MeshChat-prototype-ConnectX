import { describe, expect, it } from "vitest";

import { isHopLimitValid, tracePacketPath } from "@/lib/mesh-simulation";

describe("MeshChat packet simulation", () => {
  it("accepts the documented hop-limit range from 1 through 5", () => {
    expect(isHopLimitValid(1)).toBe(true);
    expect(isHopLimitValid(5)).toBe(true);
    expect(isHopLimitValid(0)).toBe(false);
    expect(isHopLimitValid(6)).toBe(false);
  });

  it("stops at the hop limit when a simulated route is too long", () => {
    expect(tracePacketPath(1, ["leo", "nina"])).toEqual({
      visitedPeers: ["leo"],
      destinationReached: false,
    });
    expect(tracePacketPath(3, ["leo", "nina"]).destinationReached).toBe(true);
  });
});