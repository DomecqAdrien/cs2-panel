# Déployer le backend avec le serveur CS2

Le backend doit tourner dans le même projet Compose que le service `cs2`. Le DNS Docker `cs2` permet au backend de le joindre sur le réseau interne.

## Préparer les fichiers sur le VPS

Place le dossier `backend/` et `docker-compose.panel.yml` dans le même dossier que le `docker-compose.yml` actuel du serveur CS2. Le fichier overlay ajoute le port RCON interne `27050` au service CS2 et le service `panel-backend`. Il ne publie pas `27050` sur Internet.

Ajoute ces variables au `.env` existant. Conserve la valeur actuelle de `CS2_RCONPW` pour le conteneur CS2 : le serveur a besoin de son mot de passe pour accepter RCON. Le backend, lui, ne reçoit ni ne stocke ce mot de passe ; le front le transmet avec chaque commande.

```dotenv
PANEL_ADMIN_USERNAME=admin
PANEL_ADMIN_PASSWORD=remplace-par-un-mot-de-passe-long-et-unique
CS2_SERVER_PUBLIC_IP=203.0.113.42
PANEL_CORS_ALLOWED_ORIGINS=https://panel.ton-domaine.fr
```

Remplace `203.0.113.42` par l’IPv4 publique de ton serveur. Le front devra saisir cette même adresse ; le backend la vérifie puis se connecte au service Docker `cs2` en interne. Garde le fichier `.env` privé et ne le committe pas. `CS2_RCONPW` doit être le même secret que celui utilisé par le serveur CS2.

## Démarrer ou mettre à jour

Depuis le dossier qui contient les deux fichiers Compose :

```bash
docker compose -f docker-compose.yml -f docker-compose.panel.yml up -d --build
```

Vérifie ensuite l’état du backend et son endpoint de santé :

```bash
docker compose -f docker-compose.yml -f docker-compose.panel.yml ps
curl http://127.0.0.1:8080/actuator/health
```

Le backend écoute l’API sur `127.0.0.1:8080` côté VPS. Configure ton reverse proxy HTTPS pour transférer `/api` et `/actuator/health` vers cette adresse avant d’y accéder depuis Internet.

## Tester RCON

Une fois le backend démarré, envoie une commande avec l’utilisateur et le mot de passe du panneau :

```bash
curl -u 'admin:TON_MOT_DE_PASSE' \
  -H 'Content-Type: application/json' \
  -d '{"serverIp":"203.0.113.42","command":"status","rconPassword":"MOT_DE_PASSE_RCON_DU_SERVEUR"}' \
  http://127.0.0.1:8080/api/rcon/commands
```

La réponse contient la commande, la sortie serveur et l’heure d’exécution. Si la connexion échoue, vérifie les journaux avec `docker compose -f docker-compose.yml -f docker-compose.panel.yml logs panel-backend cs2`.
