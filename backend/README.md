# CS2 Panel Backend

API Spring Boot 4.1.1 / Java 26 for the RCON console.

The backend is not configured for a specific server. Each request supplies a public IPv4 address, its RCON port, a command, and the server's RCON password. The password is not persisted. Private, local, and reserved IPv4 addresses are rejected.

## Run locally

Requires JDK 26 and Maven 3.6.3+.

```powershell
mvn spring-boot:run
```

The web API listens on port 8080 by default. Optional `RCON_CONNECT_TIMEOUT_MS` and `RCON_RESPONSE_TIMEOUT_MS` variables control network timeouts. CORS origins are configured with `PANEL_CORS_ALLOWED_ORIGINS`.

Example request:

```http
POST /api/rcon/commands
Content-Type: application/json
{"serverIp":"198.51.100.42","serverPort":27015,"command":"status","rconPassword":"your-server-rcon-password"}
```

The target server must have RCON enabled and permit inbound connections from the backend host. Use HTTPS between the browser and backend when accessed remotely. CORS is not authentication; keep the API behind a trusted network or an authenticated reverse proxy.

For Docker deployment, see [`../DEPLOYMENT.md`](../DEPLOYMENT.md).
