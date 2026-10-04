package fr.cs2panel.rcon;

import java.time.Instant;

public record RconCommandResponse(String command, String output, Instant executedAt) {
}
