package fr.cs2panel.rcon;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RconProperties.class)
public class RconConfiguration {
}
