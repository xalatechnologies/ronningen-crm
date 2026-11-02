/** Vitest setup for node/unit tests — mock Next.js server-only guard. */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
