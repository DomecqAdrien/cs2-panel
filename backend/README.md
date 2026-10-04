# CS2 Panel Backend

API Spring Boot 4.1.1 / Java 26 for the CS2 control panel MVP.

## Included

- `GET /actuator/health` for container health checks.
- `POST /api/rcon/commands` to send one RCON command and receive its output.
- HTTP Basic authentication for the admin API.
- RCON host and port configured on the backend; the RCON password is supplied with each command and is not persisted by the panel.

Example request:

```http
POST /api/rcon/commands
Content-Type: application/json
Authorization: Basic ...

{"serverIp":"your-server-public-ipv4","command":"status","rconPassword":"your-server-rcon-password"}
```

## Run locally

Requires JDK 26 and Maven 3.6.3+.

```powershell
$env:PANEL_ADMIN_PASSWORD = "choose-a-long-password"
$env:CS2_RCON_HOST = "localhost"
$env:CS2_RCON_PORT = "27050"
$env:CS2_SERVER_PUBLIC_IP = "your-server-public-ipv4"
mvn spring-boot:run
```

For local runs, the CS2 RCON TCP port must be reachable at `localhost:27050`. For Docker deployment, put the backend service on the same Compose network as the CS2 service and leave the RCON port unpublished; use `CS2_RCON_HOST=cs2`.

The panel login password and server public IP are configured on the backend. The RCON password is sent from the browser with each command and is not saved by the backend. The CS2 server still needs its own `CS2_RCONPW` setting to accept RCON connections. Use HTTPS in deployment so credentials are encrypted in transit.

For the VPS Compose overlay and deployment commands, see [`../DEPLOYMENT.md`](../DEPLOYMENT.md).
