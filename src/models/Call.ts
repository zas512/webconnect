import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from "mongoose";
import type { CallDirection, CallRecordStatus } from "@/types/call";

export type { CallDirection, CallRecordStatus } from "@/types/call";

export interface ICall extends Document {
  user: Types.ObjectId;
  sessionId: string;
  phoneNumber: string;
  direction: CallDirection;
  /** Final outcome for this row */
  outcome: CallRecordStatus;
  /** Last SIP-style / UI cause if any */
  cause: string;
  hangupBy: string;
  extensionId: string;
  userName: string;
  wasHold: boolean;
  wasMuted: boolean;
  /** Seconds of connected audio (0 if hung up before connect) */
  durationSeconds: number;
  dialedAt: Date;
  connectedAt?: Date;
  endedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
    },
    outcome: {
      type: String,
      enum: ["ended", "failed", "cancelled", "no_answer"],
      required: true,
    },
    cause: {
      type: String,
      default: "",
      trim: true,
    },
    hangupBy: {
      type: String,
      default: "",
      trim: true,
    },
    extensionId: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    wasHold: {
      type: Boolean,
      default: false,
    },
    wasMuted: {
      type: Boolean,
      default: false,
    },
    durationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    dialedAt: {
      type: Date,
      required: true,
    },
    connectedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const Call: Model<ICall> =
  mongoose.models.Call || mongoose.model<ICall>("Call", CallSchema);

export default Call;
