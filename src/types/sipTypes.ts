export type ExtendedRTCSession = {
  direction: "incoming" | "outgoing";
  connection: RTCPeerConnection;
  remote_identity?: { uri?: { user?: string } };
  answer: (options?: { mediaConstraints?: { audio?: boolean } }) => void;
  terminate: () => void;
  mute: (options?: { audio?: boolean }) => void;
  unmute: (options?: { audio?: boolean }) => void;
  hold: () => void;
  unhold: () => void;
  sendRefer?: (
    target: string,
    options?: {
      eventHandlers?: { succeeded?: () => void; failed?: () => void };
    }
  ) => void;
  on: (event: string, callback: (data: unknown) => void) => void;
  _request?: {
    call_id?: string;
    headers?: Record<string, Array<{ raw?: string }>>;
  };
  _id?: string;
};

export interface CallAlertState {
  sessionId?: string;
  phoneNumber?: string;
  direction?: "incoming" | "outgoing";
  cause?: string;
  status?:
    | "ringing"
    | "connected"
    | "ended"
    | "failed"
    | "dialing"
    | "call_transferred";
  hangupBy?: string;
  userId?: string | number;
  user_name?: string;
  isHold?: boolean;
}
