import type { Passport } from "@/lib/visa";
import type { SightType } from "@/types";

/** Trip snapshot the client can attach so the assistant reasons about the open trip. */
export interface TripContextPayload {
  id?: string;
  name?: string;
  /** 1-based start month; 0 = unset / flexible. */
  start: number;
  stops: [string, number][];
  interests?: SightType[];
}

export interface AssistantRequestBody {
  messages: unknown[];
  tripContext?: TripContextPayload | null;
}

export type AssistantPassport = Passport;
