"use client";
import { useState, useRef, useEffect } from "react";
import { UA, WebSocketInterface } from "jssip";
import {
  User,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import type { ExtendedRTCSession, CallAlertState } from "@/types/sipTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { data: session } = useSession();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneAudioRef = useRef<HTMLAudioElement>(null);
  const ringerRef = useRef<HTMLAudioElement>(null);
  const [sipDial, setSipDial] = useState<UA | null>(null);
  const [serverConnected, setServerConnected] = useState(false);
  const [userConnected, setUserConnected] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [isSipConnected, setIsSipConnected] = useState(false);
  const [callAlert, setCallAlert] = useState<Partial<CallAlertState>>({});
  const [activeCall, setActiveCall] = useState<ExtendedRTCSession | null>(null);
  const [queueCalls, setQueueCalls] = useState<ExtendedRTCSession | null>(null);
  const [dialPhoneNumber, setDialPhoneNumber] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>("00:00");

  // Fetch user data with SIP credentials
  const { data: userData } = useQuery({
    queryKey: ["user-me"],
    queryFn: async () => {
      const res = await fetch("/api/user/me");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!session,
  });

  // Calculate call duration
  useEffect(() => {
    let durationInterval: NodeJS.Timeout | null = null;
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

  // Register WebRTC event handlers
  const registerWebrtcEvent = (call: ExtendedRTCSession) => {
    const eventsToHandle = [
      "peerconnection",
      "connecting",
      "sending",
      "progress",
      "accepted",
      "newDTMF",
      "newInfo",
      "hold",
      "unhold",
      "muted",
      "unmuted",
      "reinvite",
      "update",
      "refer",
      "replaces",
      "sdp",
      "icecandidate",
      "getusermediafailed",
      "ended",
      "failed",
      "confirmed",
    ];

    eventsToHandle.forEach((eventType) => {
      call.on(eventType, (data: unknown) => {
        handleSessionEvent(eventType, data, call);
      });
    });
  };

  // Handle session events
  const handleSessionEvent = (
    eventType: string,
    data: unknown,
    call: ExtendedRTCSession
  ) => {
    switch (eventType) {
      case "accepted":
        setCallAlert((prevState) => ({
          ...prevState,
          status: "connected",
        }));
        setCallStartTime(Date.now());
        connectAudio(call);
        break;
      case "failed":
        handleCallFailed(data, call);
        break;
      case "ended":
        handleCallEnd(data, call);
        break;
      default:
        break;
    }
  };

  const handleCallFailed = (data: unknown, call: ExtendedRTCSession) => {
    const currentCall = JSON.parse(localStorage.getItem("liveCall") ?? "{}");
    if (currentCall && Object.keys(currentCall).length > 0) {
      const eventData = data as { originator?: string; cause?: string };
      const { originator, cause } = eventData;
      currentCall.hangupBy =
        originator === "remote"
          ? call?.remote_identity?.uri?.user
          : userData?.extensionId;
      currentCall.status = "call_failed";
      currentCall.cause = cause || "NO_ANSWER";
      localStorage.removeItem("liveCall");
      toast.error(`Call failed: ${cause || "No answer"}`);
      callDisconnect();
    }
  };

  const handleCallEnd = (data: unknown, call: ExtendedRTCSession) => {
    const currentCall = JSON.parse(localStorage.getItem("liveCall") ?? "{}");
    if (currentCall && Object.keys(currentCall).length > 0) {
      const eventData = data as { originator?: string; cause?: string };
      const { originator, cause } = eventData;
      currentCall.hangupBy =
        originator === "remote"
          ? call?.remote_identity?.uri?.user
          : userData?.extensionId;
      currentCall.status = "call_ended";
      currentCall.cause = cause || "ANSWER";
      localStorage.removeItem("liveCall");
      toast.success("Call ended");
      callDisconnect();
    }
  };

  const callDisconnect = () => {
    setActiveCall(null);
    setQueueCalls(null);
    setCallAlert({});
    setCallStartTime(null);
    setCallDuration("00:00");
    setIsMuted(false);
    stopRing();
  };

  const acceptHandle = () => {
    if (queueCalls) {
      stopRing();
      queueCalls.answer({
        mediaConstraints: {
          audio: true,
        },
      });
      setCallAlert((prevState) => ({
        ...prevState,
        status: "connected",
        cause: "call_accepted",
      }));
      setCallStartTime(Date.now());
      connectAudio(queueCalls);
    } else {
      callDisconnect();
    }
  };

  const rejectHandle = () => {
    if (queueCalls) {
      queueCalls.terminate();
      setCallAlert((prevState) => ({
        ...prevState,
        hangupBy: userData?.extensionId?.toString(),
      }));
      callDisconnect();
    } else {
      callDisconnect();
    }
  };

  const connectAudio = (call: ExtendedRTCSession) => {
    if (phoneAudioRef.current && phoneAudioRef.current) {
      call.connection.addEventListener("track", (event: RTCTrackEvent) => {
        if (event.track.kind === "audio" && event.streams[0]) {
          if (phoneAudioRef.current) {
            phoneAudioRef.current.srcObject = event.streams[0];
            phoneAudioRef.current.play().catch((err) => {
              console.error("Error playing audio:", err);
            });
          }
        }
      });
    }
  };

  const callPhoneNumber = async (phoneNumber: string) => {
    if (!sipDial) {
      toast.error("SIP connection not available");
      return;
    }
    const options = {
      mediaConstraints: {
        audio: true,
      },
    };
    try {
      const call = sipDial.call(
        `sip:${phoneNumber}@${userData?.host}`,
        options
      ) as ExtendedRTCSession;
      const newCallAlert: Partial<CallAlertState> = {
        sessionId: call._request?.call_id || call._id || "",
        phoneNumber: phoneNumber,
        direction: "outgoing",
        cause: "",
        status: "dialing",
        hangupBy: "",
        userId: userData?.extensionId,
        user_name: userData?.name,
      };
      setCallAlert(newCallAlert);
      localStorage.setItem("liveCall", JSON.stringify(newCallAlert));
      setActiveCall(call);
      registerWebrtcEvent(call);
    } catch (error) {
      console.error("Error making call:", error);
      toast.error("Error calling phone number");
    }
  };

  const dialPhoneNumberHandle = () => {
    if (!dialPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }
    callPhoneNumber(dialPhoneNumber);
    setDialPhoneNumber("");
  };

  const playRing = () => {
    if (ringerRef.current) {
      ringerRef.current.currentTime = 0;
      ringerRef.current.play().catch((err) => {
        console.error("Error playing ring:", err);
      });
    }
  };

  const stopRing = () => {
    if (ringerRef.current) {
      ringerRef.current.pause();
      ringerRef.current.currentTime = 0;
    }
  };

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmute({ audio: true });
        setIsMuted(false);
      } else {
        activeCall.mute({ audio: true });
        setIsMuted(true);
      }
    }
  };

  const toggleHold = () => {
    if (activeCall) {
      const isHold = !callAlert.isHold;
      setCallAlert((prevState) => ({
        ...prevState,
        isHold,
      }));
      if (isHold) {
        activeCall.hold();
      } else {
        activeCall.unhold();
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Functions are stable and don't need to be in deps
  useEffect(() => {
    if (
      userData?.extensionId &&
      userData?.host &&
      userData?.secret &&
      userData?.port
    ) {
      const wsUrl = `wss://${userData.host}/ws`;
      const sipUri = `sip:${userData.extensionId}@${userData.host}`;
      console.log(
        "data===========>",
        userData,
        "wsUrl",
        wsUrl,
        "sipUri",
        sipUri
      );

      const socket = new WebSocketInterface(wsUrl);
      const configuration = {
        sockets: [socket],
        uri: sipUri,
        authorizationUser: userData.extensionId,
        password: userData.secret,
        displayName: userData.name || "",
        traceSip: true,
        register: true,
        hackIpInContact: true,
        hackWssInTransport: true,
        register_expires: 3600,
        rtcpMuxPolicy: "negotiate" as const,
      };
      console.log("configuration===========>", configuration);
      const sip = new UA(configuration);

      sip.on("connected", () => {
        console.log("✅ [SIP] UA connected - Server connection established");
        setIsSipConnected(true);
        setIsUserRegistered(false);
        setServerConnected(true);
        setUserConnected(false);
        toast.success("Server connected");
      });

      sip.on("disconnected", (error?: unknown) => {
        console.error("❌ [SIP] UA disconnected", {
          error,
          timestamp: new Date().toISOString(),
        });
        setIsSipConnected(false);
        setIsUserRegistered(false);
        setServerConnected(false);
        setUserConnected(false);
        toast.error("Server disconnected");
      });

      sip.on("registered", () => {
        console.log("✅ [SIP] User registered successfully", {
          extensionId: userData.extensionId,
          timestamp: new Date().toISOString(),
        });
        setIsUserRegistered(true);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(true);
        toast.success("User registered");
      });

      sip.on("registrationFailed", (response?: unknown) => {
        console.error("❌ [SIP] Registration failed", {
          response,
          extensionId: userData.extensionId,
          host: userData.host,
          port: userData.port,
          timestamp: new Date().toISOString(),
        });
        setIsUserRegistered(false);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(false);
        toast.error("Registration failed");
      });

      sip.on("unregistered", (response?: unknown) => {
        console.warn("⚠️ [SIP] User unregistered", {
          response,
          timestamp: new Date().toISOString(),
        });
        setIsUserRegistered(false);
        setUserConnected(false);
      });

      sip.on("registrationExpiring", () => {
        console.warn("⏰ [SIP] Registration expiring soon");
      });

      sip.on("newRTCSession", (e: unknown) => {
        const event = e as {
          originator: string;
          session: ExtendedRTCSession;
          request?: unknown;
        };
        const sessionCall = event.session;
        console.log("📞 [SIP] New RTC session", {
          direction: sessionCall.direction,
          originator: event.originator,
          remoteIdentity: sessionCall.remote_identity?.uri?.user,
          timestamp: new Date().toISOString(),
        });
        const newCallAlert: Partial<CallAlertState> = {
          sessionId:
            sessionCall.direction === "incoming"
              ? sessionCall._request?.headers?.["Sip-Caller-Id"]?.[0]?.raw ||
                sessionCall._id ||
                ""
              : sessionCall._request?.call_id || sessionCall._id || "",
          phoneNumber: sessionCall?.remote_identity?.uri?.user,
          direction: sessionCall.direction,
          cause: "",
          status: "ringing",
          hangupBy: "",
          userId: userData.extensionId,
          user_name: userData.name,
        };

        if (sessionCall.direction === "incoming") {
          playRing();
          setCallAlert(newCallAlert);
        } else {
          setCallAlert(newCallAlert);
        }

        localStorage.setItem("liveCall", JSON.stringify(newCallAlert));
        setActiveCall(sessionCall);
        setQueueCalls(sessionCall);
        registerWebrtcEvent(sessionCall);

        if (sessionCall.direction === "outgoing") {
          connectAudio(sessionCall);
        }
      });

      console.log("▶️ [SIP] Starting UA...");
      sip.start();
      setSipDial(sip);

      return () => {
        sip.stop();
      };
    } else if (
      userData &&
      (!userData.extensionId ||
        !userData.host ||
        !userData.secret ||
        !userData.port)
    ) {
      toast.error("SIP credentials not configured. Please contact admin.");
    }
  }, [userData]);

  // Auto-focus phone input
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
    } else if (/^[0-9*#+]$/.test(e.key)) {
      addToNumber(e.key);
    }
  };

  // Determine connection status and visual cues
  const hasCredentials =
    userData?.extensionId &&
    userData?.host &&
    userData?.secret &&
    userData?.port;
  const isReady = hasCredentials && serverConnected && userConnected;

  // Get visual cue colors based on connection status
  const getConnectionStatus = () => {
    if (!hasCredentials) {
      return {
        borderColor: "border-red-500/50",
        bgColor: "bg-red-500/5",
        statusText: "No SIP Credentials",
        statusColor: "text-red-500",
        iconColor: "text-red-500",
      };
    }
    if (!serverConnected) {
      return {
        borderColor: "border-orange-500/50",
        bgColor: "bg-orange-500/5",
        statusText: "Server Disconnected",
        statusColor: "text-orange-500",
        iconColor: "text-orange-500",
      };
    }
    if (!userConnected) {
      return {
        borderColor: "border-yellow-500/50",
        bgColor: "bg-yellow-500/5",
        statusText: "Not Registered",
        statusColor: "text-yellow-500",
        iconColor: "text-yellow-500",
      };
    }
    return {
      borderColor: "border-green-500/50",
      bgColor: "bg-green-500/5",
      statusText: "Ready",
      statusColor: "text-green-500",
      iconColor: "text-green-500",
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Voice Dialer
              </h1>
              <p className="text-muted-foreground mt-2">
                User:{" "}
                <span className="font-semibold">{userData?.name || ""}</span> |
                Extension:{" "}
                <span className="font-semibold">
                  {userData?.extensionId || ""}
                </span>
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
            {/* Call Status / Dialing / Ringing */}
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
                        {callAlert.status === "ringing" && (
                          <div className="absolute inset-0 h-32 w-32 rounded-full bg-primary/20 animate-pulse" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">
                          {callAlert.direction === "incoming" &&
                          callAlert.status === "ringing"
                            ? "Incoming Call"
                            : "Dialing..."}
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {callAlert.phoneNumber}
                        </p>
                      </div>
                      {callAlert.direction === "incoming" &&
                      callAlert.status === "ringing" ? (
                        <div className="flex gap-4">
                          <Button
                            onClick={acceptHandle}
                            size="lg"
                            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                          >
                            <Phone className="h-6 w-6" />
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
                      ) : (
                        <Button
                          onClick={rejectHandle}
                          size="lg"
                          variant="destructive"
                          className="h-14 w-14 rounded-full"
                        >
                          <PhoneOff className="h-6 w-6" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Call Connected */}
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
                          <Mic className="h-6 w-6" />
                        ) : (
                          <MicOff className="h-6 w-6" />
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-14 w-14 rounded-full"
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

            {/* Dialer */}
            {Object.keys(callAlert).length === 0 ? (
              <Card
                className={`${connectionStatus.borderColor} ${connectionStatus.bgColor} border-2 transition-colors`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Dialer</CardTitle>
                      <CardDescription>
                        Enter a phone number or use the dial pad
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          !hasCredentials
                            ? "bg-red-500"
                            : !serverConnected
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
                          const onlyNumbers = e.target.value.replace(
                            /[^0-9+]/g,
                            ""
                          );
                          setDialPhoneNumber(onlyNumbers);
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
                        "#",
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
                        {!hasCredentials &&
                          "⚠️ SIP credentials not configured. Please contact your administrator."}
                        {hasCredentials &&
                          !serverConnected &&
                          "⚠️ Server is not connected. Please check your network connection."}
                        {hasCredentials &&
                          serverConnected &&
                          !userConnected &&
                          "⚠️ User not registered. Please wait for registration to complete."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Connection Status */}
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
                {userData && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Extension ID</span>
                      <span className="font-mono text-sm">
                        {userData.extensionId || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Host</span>
                      <span className="font-mono text-sm">
                        {userData.host || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Port</span>
                      <span className="font-mono text-sm">
                        {userData.port || "-"}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Audio elements */}
      <audio ref={phoneAudioRef} preload="auto" style={{ display: "none" }}>
        <track kind="captions" />
      </audio>
      <audio ref={ringerRef} preload="auto" style={{ display: "none" }}>
        <track kind="captions" />
      </audio>
    </div>
  );
}
