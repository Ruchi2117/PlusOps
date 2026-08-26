const http = require("node:http");

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(204).end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404).end();
    return;
  }

  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    const payload = JSON.parse(body);
    const prompt = payload.messages?.map((message) => message.content).join("\n") ?? "";
    const grounded = prompt.includes("plusops-postgresql") || prompt.includes("Authoritative PlusOps context");

    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({
      id: "e2e-grounded-response",
      model: payload.model,
      choices: [{
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: [
            "Facts",
            grounded
              ? "The request includes authoritative PlusOps PostgreSQL operational context."
              : "No authoritative operational context was supplied.",
            "",
            "Interpretation",
            "The selected signal should be correlated with its service health and active alert.",
            "",
            "Recommended next actions",
            "Inspect the linked service, compare recent metric samples, and confirm the active incident state.",
            "",
            "Uncertainty",
            "This conclusion is limited to the supplied PlusOps context and does not include external telemetry."
          ].join("\n")
        }
      }],
      usage: { prompt_tokens: 120, completion_tokens: 58, total_tokens: 178 }
    }));
  });
});

server.listen(4010, "127.0.0.1", () => {
  console.log("E2E OpenAI-compatible test provider listening on 4010");
});
