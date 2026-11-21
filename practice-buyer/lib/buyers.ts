/**
 * PUBLIC buyer info: safe to show in the browser. No secrets here.
 * The hidden prompts live in lib/personas.ts, which only the server reads.
 */

export type Buyer = {
  id: string;
  name: string;
  title: string;
  company: string;
  difficulty: "Easy" | "Medium" | "Hard";
  minutes: number;
  /** What the rep knows before the call. Never the secrets. */
  brief: string;
};

export const BUYERS: Buyer[] = [
  {
    id: "dana",
    name: "Dana Reyes",
    title: "COO",
    company: "Lumora",
    difficulty: "Hard",
    minutes: 5,
    brief:
      "Lumora (80 people) turns recorded insurance call-center calls into transcripts and summaries. Dana is COO: cares about cost, customers and deadlines, not tech details. A colleague forwarded your email; Dana is between meetings.",
  },
  {
    id: "priya",
    name: "Priya Nair",
    title: "CTO",
    company: "Brightsmile AI",
    difficulty: "Medium",
    minutes: 10,
    brief:
      "Brightsmile AI (25 people, seed-funded) builds an AI phone receptionist that books appointments for dental clinics. Priya is the CTO and co-founder: technical, curious, and careful with money. Priya booked this call after trying a free tier.",
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    title: "Founder",
    company: "Notewise",
    difficulty: "Easy",
    minutes: 10,
    brief:
      "Notewise (6 people) is an AI meeting notetaker for small agencies. Marcus is the founder: chatty, open, and building fast. Marcus replied to your cold email saying 'sure, happy to chat'.",
  },
];

/** Lets the buyer hang up. Harmless to expose: it has no secrets. */
export const END_CALL_TOOL = {
  type: "function" as const,
  name: "end_call",
  description: "Hang up the phone. Call this right after you have said goodbye.",
  parameters: { type: "object", properties: {}, required: [] },
  execution_mode: "hold" as const,
  timeout_seconds: 5,
};
