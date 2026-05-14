export type CallDirection = "incoming" | "outgoing";

export type CallRecordStatus = "ended" | "failed" | "cancelled" | "no_answer";

/** Serialized call row from GET /api/calls */
export type CallApiRow = {
  id: string;
  sessionId: string;
  phoneNumber: string;
  direction: CallDirection;
  outcome: CallRecordStatus;
  cause: string;
  hangupBy: string;
  extensionId: string;
  userName: string;
  wasHold: boolean;
  wasMuted: boolean;
  durationSeconds: number;
  dialedAt: string;
  connectedAt: string | null;
  endedAt: string;
  createdAt: string;
};

export type CallDashboardResponse = {
  stats: {
    total: number;
    incoming: number;
    outgoing: number;
    uniqueClients: number;
  };
  calls: CallApiRow[];
};
