"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [callHistory, setCallHistory] = useState<
    Array<{ id: string; number: string; time: string; status: string }>
  >([]);

  const handleDial = () => {
    if (!phoneNumber.trim()) return;

    const newCall = {
      id: Date.now().toString(),
      number: phoneNumber,
      time: new Date().toLocaleTimeString(),
      status: "dialing",
    };

    setCallHistory([newCall, ...callHistory]);
    setIsCalling(true);
    setPhoneNumber("");

    // Simulate call
    setTimeout(() => {
      setIsCalling(false);
      setCallHistory((prev) =>
        prev.map((call) =>
          call.id === newCall.id ? { ...call, status: "completed" } : call
        )
      );
    }, 3000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDial();
    }
  };

  const dialPadNumbers = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  const addToNumber = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Voice Dialer</h1>
          <p className="text-muted-foreground mt-2">
            Make calls quickly and efficiently
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Dialer Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dialer</CardTitle>
                <CardDescription>
                  Enter a phone number or use the dial pad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Phone Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="text-lg font-mono"
                      disabled={isCalling}
                    />
                    <Button
                      onClick={handleDial}
                      disabled={!phoneNumber.trim() || isCalling}
                      size="lg"
                    >
                      {isCalling ? "Calling..." : "Call"}
                    </Button>
                  </div>
                </div>

                {/* Dial Pad */}
                <div className="space-y-3">
                  <Label>Dial Pad</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {dialPadNumbers.flat().map((digit) => (
                      <Button
                        key={digit}
                        variant="outline"
                        size="lg"
                        className="h-16 text-xl font-semibold"
                        onClick={() => addToNumber(digit)}
                        disabled={isCalling}
                      >
                        {digit}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPhoneNumber("")}
                      disabled={isCalling}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        setPhoneNumber((prev) => prev.slice(0, -1))
                      }
                      disabled={isCalling}
                    >
                      Backspace
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call Status */}
            {isCalling && (
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <div className="h-6 w-6 animate-pulse rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Calling...</p>
                      <p className="text-sm text-muted-foreground">
                        {callHistory[0]?.number}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Call History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>Your call history</CardDescription>
              </CardHeader>
              <CardContent>
                {callHistory.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No calls yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {callHistory.slice(0, 10).map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium font-mono">{call.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {call.time}
                          </p>
                        </div>
                        <Badge
                          variant={
                            call.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {call.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
