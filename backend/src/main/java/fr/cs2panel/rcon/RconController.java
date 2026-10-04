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
    private final RconProperties rconProperties;

    public RconController(SourceRconClient rconClient, RconProperties rconProperties) {
        this.rconClient = rconClient;
        this.rconProperties = rconProperties;
    }

    @PostMapping("/commands")
    public RconCommandResponse execute(@Valid @RequestBody RconCommandRequest request) {
        if (!rconProperties.publicIp().equals(request.serverIp().trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette adresse ne correspond pas au serveur configuré.");
        }
        String command = request.command().trim();
        if (command.indexOf('\n') >= 0 || command.indexOf('\r') >= 0 || command.indexOf('\0') >= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une seule commande est autorisée par requête.");
        }
        return new RconCommandResponse(command, rconClient.execute(command, request.rconPassword()), Instant.now());
    }
}
