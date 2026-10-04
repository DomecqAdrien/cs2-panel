package fr.cs2panel.rcon;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "cs2.rcon")
public record RconProperties(String host, int port, String publicIp, int connectTimeoutMs, int responseTimeoutMs) {
}
