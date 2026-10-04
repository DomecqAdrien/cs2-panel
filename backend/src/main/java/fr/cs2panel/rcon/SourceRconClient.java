package fr.cs2panel.rcon;

import org.springframework.stereotype.Component;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class SourceRconClient {
    private static final int SERVERDATA_EXECCOMMAND = 2;
    private static final int SERVERDATA_AUTH = 3;
    private static final int SERVERDATA_AUTH_RESPONSE = 2;
    private static final int MAX_PACKET_SIZE = 1_048_576;
    private final AtomicInteger requestIds = new AtomicInteger(1);
    private final RconProperties properties;

    public SourceRconClient(RconProperties properties) {
        this.properties = properties;
    }

    public String execute(String command, String password) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(properties.host(), properties.port()), properties.connectTimeoutMs());
            socket.setSoTimeout(properties.responseTimeoutMs());

            DataInputStream input = new DataInputStream(socket.getInputStream());
            DataOutputStream output = new DataOutputStream(socket.getOutputStream());

            int authId = nextId();
            writePacket(output, authId, SERVERDATA_AUTH, password);
            authenticate(input, authId);

            int commandId = nextId();
            writePacket(output, commandId, SERVERDATA_EXECCOMMAND, command);
            output.flush();
            return readCommandResponse(input, socket, commandId);
        } catch (RconException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new RconException("Impossible de communiquer avec le serveur CS2 via RCON.", exception);
        }
    }

    private void authenticate(DataInputStream input, int authId) throws IOException {
        boolean authenticated = false;
        for (int i = 0; i < 2; i++) {
            Packet packet = readPacket(input);
            if (packet.id() == -1) {
                throw new RconException("Authentification RCON refusée. Vérifie le mot de passe saisi.");
            }
            if (packet.id() == authId && packet.type() == SERVERDATA_AUTH_RESPONSE) {
                authenticated = true;
            }
        }
        if (!authenticated) {
            throw new RconException("Réponse d'authentification RCON invalide.");
        }
    }

    private String readCommandResponse(DataInputStream input, Socket socket, int commandId) throws IOException {
        StringBuilder response = new StringBuilder();
        Packet first = readPacket(input);
        if (first.id() != commandId) {
            throw new RconException("Réponse RCON inattendue.");
        }
        response.append(first.body());

        // RCON may split long answers into several packets. Collect any packets already queued.
        socket.setSoTimeout(150);
        while (true) {
            try {
                Packet next = readPacket(input);
                if (next.id() != commandId) {
                    break;
                }
                response.append(next.body());
            } catch (IOException timeoutOrDisconnect) {
                break;
            }
        }
        return response.toString();
    }

    private void writePacket(DataOutputStream output, int id, int type, String body) throws IOException {
        byte[] bodyBytes = body.getBytes(StandardCharsets.UTF_8);
        int length = bodyBytes.length + 10;
        writeLittleEndianInt(output, length);
        writeLittleEndianInt(output, id);
        writeLittleEndianInt(output, type);
        output.write(bodyBytes);
        output.writeByte(0);
        output.writeByte(0);
        output.flush();
    }

    private Packet readPacket(DataInputStream input) throws IOException {
        int length = readLittleEndianInt(input);
        if (length < 10 || length > MAX_PACKET_SIZE) {
            throw new IOException("Taille de paquet RCON invalide : " + length);
        }
        int id = readLittleEndianInt(input);
        int type = readLittleEndianInt(input);
        byte[] body = input.readNBytes(length - 10);
        if (body.length != length - 10) {
            throw new EOFException("Paquet RCON incomplet.");
        }
        input.readByte(); // Empty-string terminator
        input.readByte(); // Packet terminator
        return new Packet(id, type, new String(body, StandardCharsets.UTF_8));
    }

    private int nextId() {
        int id = requestIds.getAndIncrement();
        return id <= 0 ? requestIds.updateAndGet(current -> current <= 0 ? 1 : current) : id;
    }

    private int readLittleEndianInt(DataInputStream input) throws IOException {
        return Integer.reverseBytes(input.readInt());
    }

    private void writeLittleEndianInt(DataOutputStream output, int value) throws IOException {
        output.writeInt(Integer.reverseBytes(value));
    }

    private record Packet(int id, int type, String body) {
    }
}
