import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("n8n reminder workflow", () => {
  it("calls the due and mark-sent routes", () => {
    const workflow = JSON.parse(readFileSync("n8n/appointment-reminders.json", "utf8")) as {
      nodes: { name: string; type: string; parameters: Record<string, unknown> }[]
      connections: Record<string, unknown>
    }
    const urls = workflow.nodes.map((node) => String(node.parameters.url ?? ""))
    expect(urls.some((url) => url.includes("/api/reminders/due"))).toBe(true)
    expect(urls.some((url) => url.includes("/api/reminders/mark-sent"))).toBe(true)
    expect(workflow.nodes.some((node) => node.type === "n8n-nodes-base.emailSend")).toBe(true)
    expect(workflow.nodes.some((node) => node.type === "n8n-nodes-base.scheduleTrigger")).toBe(true)
    expect(workflow.connections["Every hour"]).toBeTruthy()
  })
})
