import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type FunctionDeclaration, type Tool } from "@google/genai";
import { resolveContext, type ResolvedContext } from "@/lib/dateContext";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/rateLimit";

type ChatMessage = {
  role: "user" | "assistant" | "model";
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
    id?: string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };
  images?: Array<{
    base64: string;
    mimeType: string;
  }>;
};

type ChatContext = { label: string; iso: string };
type ChatRequest = {
  messages: ChatMessage[];
  images?: Array<{ base64: string; mimeType: string }>;
  context?: ChatContext;
  resolvedContext?: ResolvedContext;
  timeZone?: string;
  date?: string;
  persona?: string;
  customInstructions?: string;
};

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "create_task",
    description: "Create a new task or item in My day.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Title of the task or item to do.",
        },
        time: {
          type: Type.STRING,
          description: "Optional ISO datetime for when the task is scheduled (e.g. 2026-11-22T17:00:00).",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List the user's tasks from My day.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "complete_task",
    description: "Mark a task in My day as completed by its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: {
          type: Type.STRING,
          description: "The unique ID of the task to complete.",
        },
      },
      required: ["id"],
    },
  },
];

const tools: Tool[] = [
  {
    functionDeclarations,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  const roleOk = value.role === "user" || value.role === "assistant" || value.role === "model";
  if (!roleOk) return false;
  const hasText = typeof value.text === "string";
  const hasFunctionCall = isRecord(value.functionCall) && typeof value.functionCall.name === "string";
  const hasFunctionResponse = isRecord(value.functionResponse) && typeof value.functionResponse.name === "string";
  const hasImages = !value.images || (Array.isArray(value.images) && value.images.every(
    (img) => isRecord(img) && typeof img.base64 === "string" && typeof img.mimeType === "string"
  ));
  return (hasText || hasFunctionCall || hasFunctionResponse) && hasImages;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_B64_BYTES = Math.ceil(5 * 1024 * 1024 * 4 / 3); // base64 of 5 MB
const MAX_IMAGES_PER_MSG = 3;
const VALID_PERSONAS = ["friendly", "concise", "formal", "custom"] as const;

function isChatContext(value: unknown): value is ChatContext {
  if (!isRecord(value)) return false;
  return typeof value.label === "string" && typeof value.iso === "string";
}

function isResolvedContext(value: unknown): value is ResolvedContext {
  if (!isRecord(value)) return false;
  return (
    typeof value.label === "string" &&
    typeof value.start === "string" &&
    typeof value.end === "string"
  );
}

function sanitize(text: string, key?: string): string {
  if (!text) return "";
  let clean = text;
  if (key && key.trim()) {
    clean = clean.split(key).join("[REDACTED_API_KEY]");
  }
  clean = clean.replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED_API_KEY]");
  clean = clean.replace(/(api[_-]?key["':\s=]+)[a-zA-Z0-9_\-]{16,}/gi, "$1[REDACTED_API_KEY]");
  return clean;
}

type ErrorResponseBody = {
  error: string;
  field?: string;
  source: "validation" | "gemini" | "server";
};

function errorResponse(
  message: string,
  status: number,
  options?: { field?: string; source?: "validation" | "gemini" | "server" }
) {
  const source: "validation" | "gemini" | "server" =
    options?.source ?? (status === 400 ? "validation" : status >= 500 ? "server" : "gemini");

  const body: ErrorResponseBody = {
    error: message || `Error (${status})`,
    source,
    ...(options?.field ? { field: options.field } : {}),
  };

  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function validationError(message: string, field?: string) {
  console.error("[chat] 400:", message);
  return errorResponse(message, 400, { field, source: "validation" });
}

function extractStatus(error: unknown): number {
  if (isRecord(error)) {
    if (typeof error.status === "number") return error.status;
    if (typeof error.statusCode === "number") return error.statusCode;
    if (typeof error.code === "number") return error.code;
  }
  return 500;
}

function extractSafeError(error: unknown, apiKey?: string): { status: number; message: string } {
  let status = extractStatus(error);
  let rawMessage = "";

  if (isRecord(error) && typeof error.message === "string") {
    rawMessage = error.message;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else {
    rawMessage = String(error ?? "");
  }

  const msg = sanitize(rawMessage, apiKey);
  const lower = msg.toLowerCase();

  // Rate limit / Quota exceeded (429)
  if (
    status === 429 ||
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit")
  ) {
    return { status: 429, message: "Rate limit reached" };
  }

  // Invalid API key / Auth issues (400, 401, 403)
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api key not valid") ||
    lower.includes("invalid api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key is invalid") ||
    lower.includes("unauthenticated")
  ) {
    const realStatus = status === 401 || status === 403 ? status : 400;
    return { status: realStatus, message: "Invalid API key" };
  }

  // Bad request (400)
  if (status === 400 || lower.includes("bad request") || lower.includes("invalid argument")) {
    let reason = "Invalid request";
    const match = msg.match(/(?:bad request|invalid argument)[:\-]?\s*([^.,\n]{3,60})/i);
    if (match && match[1]?.trim()) {
      reason = match[1].trim();
    } else {
      const firstLine = msg.split("\n")[0].replace(/^.*?(?:error|exception)[:\s]*/i, "").trim();
      if (firstLine && firstLine.length < 60 && !firstLine.includes("http")) {
        reason = firstLine;
      }
    }
    return { status: 400, message: `Gemini rejected the request: ${reason}` };
  }

  // Overloaded / Unavailable (503)
  if (status === 503 || lower.includes("overloaded") || lower.includes("unavailable")) {
    return { status: 503, message: "The assistant is overloaded. Please try again shortly." };
  }

  // Not found (404)
  if (status === 404 || lower.includes("not found")) {
    return { status: 404, message: "Model or resource not found" };
  }

  return {
    status: status >= 400 && status < 600 ? status : 500,
    message: status >= 500 ? "Internal assistant error" : `Gemini error (${status})`,
  };
}

export async function POST(request: Request) {
  console.log("[chat] request received", request.method, request.headers.get("content-type"));

  // Session check
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized. Please sign in.", 401, { source: "server" });
  }

  // Rate limiting (30 requests per minute per user)
  const rateLimitKey = session.user.id || session.user.email || "user";
  const rateLimit = checkRateLimit(rateLimitKey, 30, 60_000);
  if (!rateLimit.allowed) {
    return errorResponse("Rate limit exceeded. Please wait a moment.", 429, { source: "server" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return errorResponse("GEMINI_API_KEY is not configured.", 500, { source: "server" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError("Invalid JSON request body: unable to parse JSON");
  }

  if (!isRecord(body)) {
    return validationError("Invalid request body (must be a JSON object).");
  }

  // Log body keys and field types at the start (never log API key)
  const bodyTypes = Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, Array.isArray(value) ? "array" : typeof value])
  );
  console.log("[chat] body keys:", Object.keys(body), bodyTypes);

  // Validate messages
  if (!Array.isArray(body.messages)) {
    return validationError("Invalid field: messages (must be an array)", "messages");
  }
  if (body.messages.length === 0) {
    return validationError("Invalid field: messages (must not be empty)", "messages");
  }
  for (let i = 0; i < body.messages.length; i++) {
    if (!isChatMessage(body.messages[i])) {
      return validationError(`Invalid field: messages[${i}] (must have valid role and content)`, "messages");
    }
  }

  // Validate images
  if (body.images !== undefined && !Array.isArray(body.images)) {
    return validationError("Invalid field: images (must be an array)", "images");
  }
  const rawImages = Array.isArray(body.images) ? body.images : [];
  if (rawImages.length > MAX_IMAGES_PER_MSG) {
    return validationError("Invalid field: images (up to 3 images are allowed)", "images");
  }
  const validatedImages: Array<{ base64: string; mimeType: string }> = [];
  for (let i = 0; i < rawImages.length; i++) {
    const img = rawImages[i];
    if (!isRecord(img) || typeof img.base64 !== "string" || typeof img.mimeType !== "string") {
      return validationError(`Invalid field: images[${i}] (must contain base64 and mimeType strings)`, "images");
    }
    if (!ALLOWED_MIME_TYPES.has(img.mimeType)) {
      return validationError(`Invalid field: images[${i}] (unsupported image type: ${img.mimeType})`, "images");
    }
    if (img.base64.length > MAX_B64_BYTES) {
      return validationError(`Invalid field: images[${i}] (image exceeds 5 MB limit)`, "images");
    }
    validatedImages.push({ base64: img.base64, mimeType: img.mimeType });
  }

  // Validate context
  if (body.context !== undefined && !isChatContext(body.context)) {
    return validationError("Invalid field: context (must have string label and iso)", "context");
  }

  // Validate resolvedContext
  if (body.resolvedContext !== undefined && !isResolvedContext(body.resolvedContext)) {
    return validationError("Invalid field: resolvedContext (must have string label, start, and end)", "resolvedContext");
  }

  // Validate timeZone
  if (body.timeZone !== undefined && typeof body.timeZone !== "string") {
    return validationError("Invalid field: timeZone (must be a string)", "timeZone");
  }

  // Validate date
  if (body.date !== undefined && (typeof body.date !== "string" || isNaN(Date.parse(body.date)))) {
    return validationError("Invalid field: date (must be a valid ISO date string)", "date");
  }

  // Validate persona
  if (body.persona !== undefined && (typeof body.persona !== "string" || !VALID_PERSONAS.includes(body.persona as any))) {
    return validationError("Invalid field: persona (must be one of: friendly, concise, formal, custom)", "persona");
  }

  // Validate customInstructions (must be string up to 500 characters; empty string is valid!)
  if (body.customInstructions !== undefined && (typeof body.customInstructions !== "string" || body.customInstructions.length > 500)) {
    return validationError("Invalid field: customInstructions (must be a string up to 500 characters)", "customInstructions");
  }

  const chatRequest: ChatRequest = {
    messages: body.messages,
    images: validatedImages,
    ...(body.context ? { context: body.context } : {}),
    ...(body.resolvedContext ? { resolvedContext: body.resolvedContext } : {}),
    ...(typeof body.timeZone === "string" ? { timeZone: body.timeZone } : {}),
    ...(typeof body.date === "string" ? { date: body.date } : {}),
    ...(typeof body.persona === "string" ? { persona: body.persona } : {}),
    ...(typeof body.customInstructions === "string" ? { customInstructions: body.customInstructions } : {}),
  };

  const timeZone = chatRequest.timeZone || "UTC";
  const now = chatRequest.date ? new Date(chatRequest.date) : new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone,
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });

  const resolvedCtx =
    chatRequest.resolvedContext ??
    (chatRequest.context ? resolveContext(chatRequest.context, now) : undefined);

  const contextInstruction = resolvedCtx
    ? `The user is asking about ${resolvedCtx.label} (${resolvedCtx.start} to ${resolvedCtx.end}). Today is ${dateStr}. Interpret relative dates from this.`
    : "";

  // ---- persona → tone instruction ----
  const PERSONA_MAP: Record<string, string> = {
    friendly: "You are warm, encouraging, and conversational. Use natural language and occasional light humour when appropriate.",
    concise:  "Be extremely concise. Answer in as few words as possible. Omit pleasantries and filler.",
    formal:   "Use formal, professional language. Avoid contractions, slang, and casual phrasing. Be thorough and precise.",
    custom:   "",
  };
  const persona = chatRequest.persona ?? "friendly";
  const personaTone = PERSONA_MAP[persona] ?? PERSONA_MAP.friendly;

  // Sanitise custom instructions server-side: trim, collapse runs of whitespace, hard cap at 500 chars
  const rawCustom = typeof chatRequest.customInstructions === "string"
    ? chatRequest.customInstructions.trim().replace(/\s+/g, " ").slice(0, 500)
    : "";
  const customPart = persona === "custom" && rawCustom
    ? `Additional instructions from the user: ${rawCustom}`
    : "";

  const systemInstruction = [
    `You are Puddle, a personal assistant.`,
    personaTone,
    `Today's date is ${dateStr}. The user's timezone is ${timeZone}. Current local time is ${timeStr}.`,
    `When the user wants to add, list, or complete tasks/reminders/to-dos, call the provided tools (create_task, list_tasks, complete_task).`,
    `When creating tasks with relative times like "tomorrow at 5pm", "this afternoon", or "in 2 hours", resolve them to ISO datetime strings using the user's reference date and timezone.`,
    contextInstruction,
    customPart,
  ].filter(Boolean).join("\n");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = chatRequest.messages.map((message, idx) => {
      const role = message.role === "assistant" || message.role === "model" ? "model" : "user";
      const parts: Array<Record<string, unknown>> = [];
      if (typeof message.text === "string" && message.text) {
        parts.push({ text: message.text });
      }
      if (message.images && message.images.length > 0) {
        for (const img of message.images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
      // Attach validated top-level images to the last user message
      const isLastUserMsg = idx === chatRequest.messages.length - 1 && role === "user";
      if (isLastUserMsg && validatedImages.length > 0) {
        for (const img of validatedImages) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
      if (message.functionCall) {
        parts.push({
          functionCall: {
            name: message.functionCall.name,
            args: message.functionCall.args ?? {},
            ...(message.functionCall.id ? { id: message.functionCall.id } : {}),
          },
        });
      }
      if (message.functionResponse) {
        parts.push({
          functionResponse: {
            name: message.functionResponse.name,
            response: message.functionResponse.response ?? {},
            ...(message.functionResponse.id ? { id: message.functionResponse.id } : {}),
          },
        });
      }
      return { role, parts };
    });

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const calls = chunk.functionCalls;
            if (calls && calls.length > 0) {
              for (const call of calls) {
                const line = JSON.stringify({
                  type: "tool_call",
                  name: call.name,
                  args: call.args ?? {},
                  ...(call.id ? { id: call.id } : {}),
                }) + "\n";
                controller.enqueue(encoder.encode(line));
              }
            }
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? "");
    const stack = error instanceof Error ? error.stack : undefined;
    const sanitizedMsg = sanitize(rawMessage, apiKey);
    const sanitizedStack = stack ? sanitize(stack, apiKey) : undefined;
    const errStatus = isRecord(error) && typeof error.status === "number"
      ? error.status
      : (error instanceof Error && "status" in error && typeof (error as any).status === "number"
        ? (error as any).status
        : undefined);

    console.error("[chat] Gemini error:", errStatus, sanitizedMsg, sanitizedStack);

    const { status, message } = extractSafeError(error, apiKey);
    return errorResponse(message, status, { source: "gemini" });
  }
}
