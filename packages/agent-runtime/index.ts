import { z } from "zod";
export const agentVersion = "browser-pilot-v1";
export const agentEnabled = () => process.env.SIMULA_AGENT_MODE === "true";
export type PersonaSpec = { id: string; context: string; basis: "assumption" };
export type TaskSpec = { id: string; goal: string };
export const personas: PersonaSpec[] = [
  {
    id: "iniciante",
    context: "Usa calendário simples. Nunca configurou uma agenda comercial.",
    basis: "assumption",
  },
  {
    id: "digital",
    context: "Usa ferramentas digitais, mas desconhece agendas comerciais.",
    basis: "assumption",
  },
  {
    id: "migrante",
    context:
      "Conhece outra agenda comercial e precisa aprender esta interface.",
    basis: "assumption",
  },
];
export const task: TaskSpec = {
  id: "booking-v1",
  goal: "Cadastre o serviço Consulta, duração 30 minutos, disponibilize 09:00 e reserve esse horário para Cliente fictício.",
};
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("fill"),
      label: z.string().min(1).max(120),
      value: z.string().max(200),
    })
    .strict(),
  z
    .object({ type: z.literal("click"), label: z.string().min(1).max(120) })
    .strict(),
  z.object({ type: z.literal("finish") }).strict(),
]);
export type AgentAction = z.infer<typeof actionSchema>;
export type ActionEvent = {
  step: number;
  action: AgentAction;
  observation: string;
  result: string;
  screenshot?: string;
  tokens: number;
};
export const fixtureStateSchema = z
  .object({
    service: z.string(),
    duration: z.number(),
    availability: z.string(),
    bookings: z
      .array(
        z.object({ id: z.string(), customer: z.string(), time: z.string() }),
      )
      .max(1),
  })
  .strict();
export type FixtureState = z.infer<typeof fixtureStateSchema>;
export type EvaluationResult = {
  success: boolean;
  checks: Record<string, boolean>;
};
export function evaluate(raw: unknown): EvaluationResult {
  const parsed = fixtureStateSchema.safeParse(raw);
  const checks: Record<string, boolean> = parsed.success
    ? {
        service: parsed.data.service === "Consulta",
        duration: parsed.data.duration === 30,
        availability: parsed.data.availability === "09:00",
        booking:
          parsed.data.bookings.length === 1 &&
          parsed.data.bookings[0].customer === "Cliente fictício" &&
          parsed.data.bookings[0].time === "09:00",
      }
    : { evidence: false };
  return { success: Object.values(checks).every(Boolean), checks };
}
export type TrialRun = {
  id: string;
  version: string;
  persona: PersonaSpec;
  task: TaskSpec;
  variant: "A" | "B";
  status: "ready" | "running" | "completed" | "cancelled" | "failed";
  events: ActionEvent[];
  createdAt: string;
  model?: string;
  tokens: number;
  outcome?: string;
  evaluation?: EvaluationResult;
  error?: string;
  cancelRequested?: boolean;
  finalState?: FixtureState;
  durationMs?: number;
};
export const eventSchema = z
  .object({
    step: z.number().int().min(1).max(20),
    action: actionSchema,
    observation: z.string().max(6000),
    result: z.string().max(300),
    screenshot: z.string().max(200).optional(),
    tokens: z.number().int().min(0).max(12000),
  })
  .strict();
export const resultSchema = z
  .object({
    outcome: z.enum([
      "finished",
      "action_limit",
      "token_limit",
      "timeout",
      "executor_error",
      "cancelled",
    ]),
    state: fixtureStateSchema.optional(),
    error: z.string().max(300).optional(),
    tokens: z.number().int().min(0).max(24000).optional(),
    durationMs: z.number().nonnegative().max(180000),
    model: z.string().max(200),
  })
  .strict();
