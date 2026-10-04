# Déployer CS2 Panel depuis Git

Le dépôt contient le frontend Angular et le backend Spring Boot. Docker Compose construit les deux images sur le VPS. Le serveur CS2 reste dans son Compose actuel ; le backend le joint à son adresse IP publique et à son port RCON.

## Première installation sur le VPS

Installe Git et Docker avec le plugin Docker Compose sur le VPS, puis clone le dépôt. Remplace l’URL par celle de ton dépôt :

```bash
sudo mkdir -p /opt/cs2-panel
sudo chown "$USER":"$USER" /opt/cs2-panel
git clone <URL_DU_DEPOT_GIT> /opt/cs2-panel
cd /opt/cs2-panel
```

Si le dépôt est privé, configure une clé SSH de déploiement en lecture seule sur l’hébergeur Git avant le `clone`.

Crée `/opt/cs2-panel/.env` :

```dotenv
PANEL_CORS_ALLOWED_ORIGINS=https://panel.ton-domaine.fr
```

Cette variable est facultative pour l’accès au site par le reverse proxy, qui sert le frontend et relaie `/api` vers le backend sur le réseau Docker.

Construis et démarre l’application :

```bash
docker compose -f docker-compose.panel.yml up -d --build
```

Le frontend est disponible localement sur `127.0.0.1:8081`. Le backend est sur `127.0.0.1:8080`. Configure ton reverse proxy HTTPS pour transmettre le domaine du panneau vers `http://127.0.0.1:8081`. Le conteneur frontend relaie les requêtes `/api` au backend ; il n’est pas nécessaire d’exposer l’API directement à Internet.

## Publier une mise à jour

Depuis ton ordinateur, enregistre puis pousse tes changements sur la branche utilisée par le VPS :

```bash
git add .
git commit -m "Mise à jour du panneau CS2"
git push origin main
```

Puis, sur le VPS :

```bash
cd /opt/cs2-panel
git pull --ff-only origin main
docker compose -f docker-compose.panel.yml up -d --build
```

Adapte `main` si tu déploies une autre branche. Le fichier `.env` local au VPS n’est pas remplacé par `git pull`.

## Vérifier le déploiement

```bash
docker compose -f docker-compose.panel.yml ps
curl -i http://127.0.0.1:8081/actuator/health
docker compose -f docker-compose.panel.yml logs --tail=100 panel-backend panel-frontend
```

L’endpoint de santé doit renvoyer `200`. Pour tester RCON, connecte-toi depuis le panneau avec l’adresse publique, le port RCON et le mot de passe du serveur. Le port RCON doit être accessible en TCP depuis le VPS ; n’ouvre que ce port sur le pare-feu du serveur de jeu.

Le mot de passe RCON est conservé dans le stockage de session du navigateur pour restaurer la connexion après une actualisation. Il n’est pas enregistré par le backend. Utilise HTTPS pour le domaine du panneau.
