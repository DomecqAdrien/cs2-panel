package fr.cs2panel.rcon;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RconCommandRequest(
        @NotBlank(message = "L'adresse IP du serveur est obligatoire.")
        @Pattern(regexp = "^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$", message = "Saisis une adresse IPv4 valide.")
        String serverIp,
        @Min(value = 1, message = "Le port RCON doit être compris entre 1 et 65535.")
        @Max(value = 65535, message = "Le port RCON doit être compris entre 1 et 65535.")
        int serverPort,
        @NotBlank(message = "La commande est obligatoire.")
        @Size(max = 512, message = "La commande ne peut pas dépasser 512 caractères.")
        String command,
        @NotBlank(message = "Le mot de passe RCON est obligatoire.")
        @Size(max = 128, message = "Le mot de passe RCON ne peut pas dépasser 128 caractères.")
        String rconPassword) {
}
