# Déployer la console RCON

La console n'est liée à aucun serveur CS2 particulier. Le backend peut tourner sur un VPS séparé et se connecte en sortie à l'adresse IPv4 publique et au port saisis dans l'interface. Aucun conteneur CS2 ni port RCON local n'est requis.

## Déploiement avec Docker Compose

Copie `backend/` et `docker-compose.panel.yml` sur le serveur qui héberge le backend. Crée un fichier `.env` à côté du fichier Compose :

```dotenv
PANEL_CORS_ALLOWED_ORIGINS=https://panel.ton-domaine.fr
```

Démarre le backend :

```bash
docker compose -f docker-compose.panel.yml up -d --build
```

L'API écoute sur `127.0.0.1:8080`. Configure ton reverse proxy HTTPS pour transmettre `/api` et `/actuator/health` à cette adresse. Le mot de passe RCON est envoyé uniquement lors des appels API et n'est pas stocké par le backend ; l'interface le garde en mémoire jusqu'à la fermeture ou la déconnexion.

Le serveur choisi doit avoir RCON activé et son port RCON doit être accessible depuis le VPS. N'ouvre que ce port sur le pare-feu du serveur de jeu. Le navigateur et le backend doivent communiquer en HTTPS dès que l'interface est accessible à distance.

## Vérifier le backend

```bash
docker compose -f docker-compose.panel.yml ps
curl http://127.0.0.1:8080/actuator/health
```

## Tester une connexion

```bash
curl -H 'Content-Type: application/json' \
  -d '{"serverIp":"198.51.100.42","serverPort":27015,"command":"status","rconPassword":"MOT_DE_PASSE_RCON_DU_SERVEUR"}' \
  http://127.0.0.1:8080/api/rcon/commands
```

Remplace l'adresse d'exemple et le mot de passe par ceux du serveur. Les adresses IPv4 privées, locales et réservées sont refusées ; cette console accepte les serveurs avec une adresse IPv4 publique.
