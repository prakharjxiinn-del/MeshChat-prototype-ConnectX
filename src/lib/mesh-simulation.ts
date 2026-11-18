export type PacketTrace = {
  visitedPeers: string[];
  destinationReached: boolean;
};

export function isHopLimitValid(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function tracePacketPath(
  hopLimit: number,
  relayPeerIds: string[],
): PacketTrace {
  if (!isHopLimitValid(hopLimit)) {
    return { visitedPeers: [], destinationReached: false };
  }

  const visitedPeers = relayPeerIds.slice(0, hopLimit);
  return {
    visitedPeers,
    destinationReached: hopLimit > relayPeerIds.length,
  };
}