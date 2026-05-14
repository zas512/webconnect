"use client";

import {
  ArrowRightLeft,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Play,
  User,
  X
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CallRecordStatus } from "@/types/call";
import type { CallAlertState } from "@/types/sipTypes";

/** Simulated PBX / SIP surface data (no real server reads for connection). */
const DUMMY_SIP = {
  extensionId: "1001",
  host: "sip.demo.local",
  port: 5061
} as const;

const SIMULATED_SERVER_READY_MS = 2000;
const SIMULATED_OUTGOING_CONNECT_MS = 2000;

export default function DashboardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingConnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [serverConnected, setServerConnected] = useState(false);
  const [userConnected, setUserConnected] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isSipConnected, setIsSipConnected] = useState(false);
  const [callAlert, setCallAlert] = useState<Partial<CallAlertState>>({});
  const [dialPhoneNumber, setDialPhoneNumber] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>("00:00");

  const activeSessionIdRef = useRef<string | null>(null);
  const dialedAtRef = useRef<number | null>(null);
  const connectedAtRef = useRef<number | null>(null);

  const userDisplay = {
    name: session?.user?.name ?? "Demo User",
    extensionId: DUMMY_SIP.extensionId,
    host: DUMMY_SIP.host,
    port: DUMMY_SIP.port
  };

  const clearOutgoingTimer = useCallback(() => {
    if (outgoingConnectTimerRef.current) {
      clearTimeout(outgoingConnectTimerRef.current);
      outgoingConnectTimerRef.current = null;
    }
  }, []);

  // Simulated server + registration (no real WebSocket / SIP).
  useEffect(() => {
    setServerConnected(false);
    setUserConnected(false);
    setIsUserRegistered(false);
    setIsSipConnected(false);

    connectTimerRef.current = setTimeout(() => {
      setIsSipConnected(true);
      setServerConnected(true);
      setIsUserRegistered(true);
      setUserConnected(true);
      toast.success("Server connected");
      toast.success("User registered");
    }, SIMULATED_SERVER_READY_MS);

    return () => {
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      clearOutgoingTimer();
    };
  }, [clearOutgoingTimer]);

  // Calculate call duration while connected
  useEffect(() => {
    let durationInterval: ReturnType<typeof setInterval> | null = null;
    if (callStartTime) {
      durationInterval = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - callStartTime) / 1000);
        const minutes = Math.floor(diffInSeconds / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (diffInSeconds % 60).toString().padStart(2, "0");
        setCallDuration(`${minutes}:${seconds}`);
      }, 1000);
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [callStartTime]);

  const persistCallToDb = useCallback(
    async (payload: {
      sessionId: string;
      phoneNumber: string;
      outcome: CallRecordStatus;
      cause: string;
      hangupBy: string;
      durationSeconds: number;
      dialedAt: number;
      connectedAt: number | null;
      endedAt: number;
      wasHold: boolean;
      wasMuted: boolean;
    }) => {
      try {
        const res = await fetch("/api/calls", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: payload.sessionId,
            phoneNumber: payload.phoneNumber,
            direction: "outgoing",
            outcome: payload.outcome,
            cause: payload.cause,
            hangupBy: payload.hangupBy,
            extensionId: userDisplay.extensionId,
            userName: userDisplay.name ?? "",
            wasHold: payload.wasHold,
            wasMuted: payload.wasMuted,
            durationSeconds: payload.durationSeconds,
            dialedAt: new Date(payload.dialedAt).toISOString(),
            connectedAt: payload.connectedAt
              ? new Date(payload.connectedAt).toISOString()
              : null,
            endedAt: new Date(payload.endedAt).toISOString()
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? res.statusText);
        }
        await queryClient.invalidateQueries({ queryKey: ["calls-dashboard"] });
        toast.success("Call saved");
      } catch (e) {
        console.error(e);
        toast.error("Could not save call to database");
      }
    },
    [queryClient, userDisplay.extensionId, userDisplay.name]
  );

  const callDisconnect = useCallback(() => {
    clearOutgoingTimer();
    activeSessionIdRef.current = null;
    dialedAtRef.current = null;
    connectedAtRef.current = null;
    setCallAlert({});
    setCallStartTime(null);
    setCallDuration("00:00");
    setIsMuted(false);
  }, [clearOutgoingTimer]);

  const rejectHandle = useCallback(() => {
    const sessionId = activeSessionIdRef.current;
    const phoneNumber = callAlert.phoneNumber;
    const dialedAt = dialedAtRef.current;
    const connectedAt = connectedAtRef.current;
    const status = callAlert.status;
    const wasHold = Boolean(callAlert.isHold);

    if (!sessionId || !phoneNumber || dialedAt == null) {
      callDisconnect();
      return;
    }

    const endedAt = Date.now();
    let outcome: CallRecordStatus = "ended";
    let durationSeconds = 0;

    if (status === "connected" && connectedAt != null) {
      durationSeconds = Math.max(0, Math.floor((endedAt - connectedAt) / 1000));
    } else if (status === "dialing") {
      outcome = "cancelled";
      durationSeconds = 0;
    }

    void persistCallToDb({
      sessionId,
      phoneNumber,
      outcome,
      cause: outcome === "cancelled" ? "CANCELLED" : "NORMAL_CLEARING",
      hangupBy: userDisplay.extensionId,
      durationSeconds,
      dialedAt,
      connectedAt,
      endedAt,
      wasHold,
      wasMuted: isMuted
    });

    if (status === "dialing") {
      toast.success("Call cancelled");
    } else {
      toast.success("Call ended");
    }

    callDisconnect();
  }, [
    callAlert.isHold,
    callAlert.phoneNumber,
    callAlert.status,
    callDisconnect,
    isMuted,
    persistCallToDb,
    userDisplay.extensionId
  ]);

  const dialPhoneNumberHandle = () => {
    if (!dialPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    const phoneNumber = dialPhoneNumber.trim();
    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `call-${Date.now()}`;

    activeSessionIdRef.current = sessionId;
    dialedAtRef.current = Date.now();
    connectedAtRef.current = null;

    const newCallAlert: Partial<CallAlertState> = {
      sessionId,
      phoneNumber,
      direction: "outgoing",
      cause: "",
      status: "dialing",
      hangupBy: "",
      userId: userDisplay.extensionId,
      user_name: userDisplay.name
    };
    setCallAlert(newCallAlert);
    setDialPhoneNumber("");

    clearOutgoingTimer();
    outgoingConnectTimerRef.current = setTimeout(() => {
      connectedAtRef.current = Date.now();
      setCallAlert((prev) => ({
        ...prev,
        status: "connected"
      }));
      setCallStartTime(Date.now());
    }, SIMULATED_OUTGOING_CONNECT_MS);
  };

  const toggleMute = () => {
    if (callAlert.status === "connected") {
      setIsMuted((m) => !m);
    }
  };

  const toggleHold = () => {
    if (callAlert.status === "connected") {
      setCallAlert((prev) => ({
        ...prev,
        isHold: !prev.isHold
      }));
    }
  };

  useEffect(() => {
    if (Object.keys(callAlert).length === 0 && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [callAlert]);

  const addToNumber = (digit: string) => {
    setDialPhoneNumber((prev) => prev + digit);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dialPhoneNumberHandle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDialPhoneNumber("");
    }
  };

  const hasCredentials = true;
  const isReady = hasCredentials && serverConnected && userConnected;

  const getConnectionStatus = () => {
    if (!serverConnected) {
      return {
        borderColor: "border-orange-500/50",
        bgColor: "bg-orange-500/5",
        statusText: "Server Disconnected",
        statusColor: "text-orange-500",
        iconColor: "text-orange-500"
      };
    }
    if (!userConnected) {
      return {
        borderColor: "border-yellow-500/50",
        bgColor: "bg-yellow-500/5",
        statusText: "Not Registered",
        statusColor: "text-yellow-500",
        iconColor: "text-yellow-500"
      };
    }
    return {
      borderColor: "border-green-500/50",
      bgColor: "bg-green-500/5",
      statusText: "Ready",
      statusColor: "text-green-500",
      iconColor: "text-green-500"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto container">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Voice Dialer
              </h1>
              <p className="text-muted-foreground mt-2">
                User: <span className="font-semibold">{userDisplay.name}</span>{" "}
                | Extension:{" "}
                <span className="font-semibold">{userDisplay.extensionId}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant={isUserRegistered ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    isUserRegistered ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                User {isUserRegistered ? "Registered" : "Not Registered"}
              </Badge>
              <Badge
                variant={isSipConnected ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    isSipConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                Server {isSipConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {callAlert.status &&
              callAlert.status !== "connected" &&
              callAlert.status !== "ended" && (
                <Card className="border-primary">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative flex items-center justify-center">
                        <div className="h-32 w-32 flex items-center justify-center rounded-full bg-primary/10">
                          <User className="h-16 w-16 text-primary" />
                        </div>
                        {callAlert.status === "dialing" && (
                          <div className="absolute inset-0 h-32 w-32 rounded-full bg-primary/20 animate-pulse" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">Dialing…</p>
                        <p className="text-2xl font-bold mt-2">
                          {callAlert.phoneNumber}
                        </p>
                      </div>
                      <Button
                        onClick={rejectHandle}
                        size="lg"
                        variant="destructive"
                        className="h-14 w-14 rounded-full"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

            {callAlert.status === "connected" && (
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center">
                      <div className="h-32 w-32 flex items-center justify-center rounded-full bg-primary/10">
                        <User className="h-16 w-16 text-primary" />
                      </div>
                      <div className="absolute inset-0 h-32 w-32 rounded-full bg-primary/20 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{callDuration}</p>
                      <p className="text-2xl font-bold mt-2">
                        {callAlert.phoneNumber}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        onClick={toggleHold}
                        size="lg"
                        variant={callAlert.isHold ? "default" : "outline"}
                        className="h-14 w-14 rounded-full"
                      >
                        {callAlert.isHold ? (
                          <Play className="h-6 w-6" />
                        ) : (
                          <Pause className="h-6 w-6" />
                        )}
                      </Button>
                      <Button
                        onClick={toggleMute}
                        size="lg"
                        variant={isMuted ? "secondary" : "outline"}
                        className="h-14 w-14 rounded-full"
                      >
                        {isMuted ? (
                          <MicOff className="h-6 w-6" />
                        ) : (
                          <Mic className="h-6 w-6" />
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 w-14 rounded-full"
                        type="button"
                        disabled
                      >
                        <ArrowRightLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        onClick={rejectHandle}
                        size="lg"
                        variant="destructive"
                        className="h-14 w-14 rounded-full"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {Object.keys(callAlert).length === 0 ? (
              <Card
                className={`${connectionStatus.borderColor} ${connectionStatus.bgColor} border-2 transition-colors`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Dialer</CardTitle>
                      <CardDescription>
                        Enter a phone number or use the dial pad (simulated
                        trunk)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          !serverConnected
                            ? "bg-orange-500"
                            : !userConnected
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${connectionStatus.statusColor}`}
                      >
                        {connectionStatus.statusText}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={phoneInputRef}
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={dialPhoneNumber}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(
                            /[^0-9*#+]/g,
                            ""
                          );
                          setDialPhoneNumber(sanitized);
                        }}
                        onKeyDown={handleKeyDown}
                        className="text-lg font-mono h-9"
                        disabled={!isReady}
                      />
                      {dialPhoneNumber && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDialPhoneNumber("")}
                          disabled={!isReady}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={dialPhoneNumberHandle}
                        disabled={!dialPhoneNumber.trim() || !isReady}
                        size="lg"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Dial
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Dial Pad</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "+",
                        "0",
                        "#"
                      ].map((digit) => (
                        <Button
                          key={digit}
                          variant="outline"
                          size="lg"
                          className="h-16 text-xl font-semibold"
                          onClick={() => {
                            addToNumber(digit);
                            phoneInputRef.current?.focus();
                          }}
                          disabled={!isReady}
                        >
                          {digit}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {!isReady && (
                    <div
                      className={`p-3 rounded-lg ${connectionStatus.bgColor} border ${connectionStatus.borderColor}`}
                    >
                      <p
                        className={`text-sm font-medium ${connectionStatus.statusColor} text-center`}
                      >
                        {!serverConnected &&
                          "Server will show as connected in a moment (demo mode)."}
                        {serverConnected &&
                          !userConnected &&
                          "Waiting for simulated registration…"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Server Connection</span>
                  <Badge variant={serverConnected ? "default" : "secondary"}>
                    {serverConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Registration</span>
                  <Badge variant={userConnected ? "default" : "secondary"}>
                    {userConnected ? "Registered" : "Not Registered"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Extension ID</span>
                  <span className="font-mono text-sm">
                    {userDisplay.extensionId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Host</span>
                  <span className="font-mono text-sm">{userDisplay.host}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Port</span>
                  <span className="font-mono text-sm">{userDisplay.port}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
