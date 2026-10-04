package fr.cs2panel.rcon;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@RestController
@RequestMapping("/api/rcon")
public class RconController {
    private final SourceRconClient rconClient;

    public RconController(SourceRconClient rconClient) {
        this.rconClient = rconClient;
    }

    @PostMapping("/commands")
    public RconCommandResponse execute(@Valid @RequestBody RconCommandRequest request) {
        String serverIp = request.serverIp().trim();
        if (!isPublicIpv4(serverIp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saisis une adresse IPv4 publique pour le serveur.");
        }
        String command = request.command().trim();
        if (command.indexOf('\n') >= 0 || command.indexOf('\r') >= 0 || command.indexOf('\0') >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une seule commande est autorisée par requête.");
        }
        return new RconCommandResponse(command,
                rconClient.execute(serverIp, request.serverPort(), command, request.rconPassword()), Instant.now());
    }

    private boolean isPublicIpv4(String address) {
        String[] parts = address.split("\\.");
        int first = Integer.parseInt(parts[0]);
        int second = Integer.parseInt(parts[1]);
        int third = Integer.parseInt(parts[2]);

        return first != 0 && first != 10 && first != 127 && first < 224
                && !(first == 100 && second >= 64 && second <= 127)
                && !(first == 169 && second == 254)
                && !(first == 172 && second >= 16 && second <= 31)
                && !(first == 192 && (second == 168 || (second == 0 && (third == 0 || third == 2))))
                && !(first == 192 && second == 88 && third == 99)
                && !(first == 198 && (second == 18 || second == 19 || (second == 51 && third == 100)))
                && !(first == 203 && second == 0 && third == 113);
    }
}
