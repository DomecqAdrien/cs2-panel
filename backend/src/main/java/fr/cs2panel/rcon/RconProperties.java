package fr.cs2panel.rcon;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "rcon")
public record RconProperties(int connectTimeoutMs, int responseTimeoutMs) {
}
