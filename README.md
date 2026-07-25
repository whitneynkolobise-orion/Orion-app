# Orion — guide de mise en ligne 100% gratuit (Gemini)

Ce dossier contient tout le code nécessaire, branché sur l'API Gemini de Google (gratuite, sans carte bancaire).

## Étape 1 — Récupérer une clé API Gemini (gratuite)

1. Va sur https://aistudio.google.com/apikey
2. Connecte-toi avec un compte Google (Gmail).
3. Clique "Create API key" → choisis "Create API key in new project".
4. Copie la clé générée, garde-la de côté pour l'étape 3.

**Important à savoir** : sur le niveau gratuit, Google peut utiliser les échanges (questions/réponses) pour améliorer ses modèles. Comme Orion est pensé pour des confidences intimes, garde ça en tête pour cette phase de test — tu pourras passer sur un compte payant plus tard (très peu cher) pour retirer ce point si tu ouvres l'app à plus de monde.

## Étape 2 — Mettre le code sur GitHub

1. Crée un compte gratuit sur https://github.com si tu n'en as pas.
2. Clique sur "New repository", nomme-le `orion-app`, crée-le (Public ou Private).
3. Sur la page du repository, clique "uploading an existing file".
4. Glisse-dépose TOUS les fichiers et dossiers de ce projet (garde bien la structure des dossiers `app/`, `app/api/ai/`).
5. Clique "Commit changes".

## Étape 3 — Déployer sur Vercel (gratuit)

1. Va sur https://vercel.com et connecte-toi avec ton compte GitHub.
2. Clique "Add New" → "Project".
3. Choisis le repository `orion-app` → "Import".
4. Vercel détecte automatiquement Next.js, ne change rien.
5. Avant de cliquer "Deploy", ouvre "Environment Variables" :
   - Name : `GEMINI_API_KEY`
   - Value : colle ta clé de l'étape 1
   - Clique "Add"
6. Clique "Deploy". Après 1-2 minutes, tu reçois ton lien `orion-app-xxxx.vercel.app`.

Ce lien est celui à partager pour tester avec d'autres personnes — et tout ça sans dépenser un centime.

## Limites du niveau gratuit Gemini à connaître

- Un nombre de messages limité par jour (largement suffisant pour toi et quelques proches qui testent, mais pas pour des centaines d'utilisateurs actifs)
- Un peu moins "fin" dans la conversation que Claude sur des sujets très nuancés — à voir à l'usage si ça te convient pour Orion
- Les échanges peuvent être utilisés par Google pour améliorer ses modèles (voir plus haut)

## Autres limites de cette version de test

- Chaque personne qui teste a sa propre mémoire Orion stockée uniquement dans SON navigateur (pas de compte partagé, pas de synchronisation entre appareils).
- Si tu changes une couleur ou du code, il faut re-uploader les fichiers sur GitHub (Vercel republie automatiquement).

## Pour tester en local avant de déployer (optionnel, si tu as Node.js)

```
npm install
cp .env.local.example .env.local
# colle ta clé dans .env.local
npm run dev
```

Puis ouvre http://localhost:3000
