# La Cave des P'tits Bonheurs — site vitrine

Site vitrine **statique** (HTML / CSS / JavaScript, sans framework) pour le caviste
**La Cave des P'tits Bonheurs** à Saint-Clément-de-Rivière. Entièrement responsive
(ordinateur, tablette, mobile).

## Pages

| Fichier | Rôle |
|---|---|
| `index.html` | Accueil (hero, Nouveautés, Le mot du caviste, univers, avis, footer) |
| `vins.html` · `bieres.html` · `spiritueux.html` · `epicerie.html` | Pages univers |
| `contact.html` | Contact + formulaire |
| `mentions-legales.html` | Mentions légales |
| `demo-iphone.html` | Aperçu mobile en cadre iPhone (outil de présentation, non essentiel à la prod) |

## Structure

```
site/
├─ index.html, vins.html, bieres.html, spiritueux.html, epicerie.html,
│  contact.html, mentions-legales.html, demo-iphone.html
├─ css/style.css      # tous les styles + responsive
├─ js/main.js         # header au scroll, menu plein écran, formulaire, carrousel
└─ assets/            # logo, image hero, dessin footer (images optimisées)
```

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
npx http-server -p 8777
```

## À compléter avant la mise en ligne

- **Formulaire de contact** : dans `contact.html`, remplacer `VOTRE_ID` par l'identifiant
  de votre formulaire [Formspree](https://formspree.io) pour activer l'envoi réel.
- **Facebook** : vérifier l'URL de la page dans les footers (valeur actuelle déduite, à confirmer).
- **Mentions légales** : renseigner le nom et l'adresse de l'hébergeur dans `mentions-legales.html`.
- **Nouveautés** : les bouteilles sont des **illustrations de démonstration** — à remplacer par
  de vraies photos / données produits.

## Design

- Couleurs : bleu ardoise `#3a5163`, crème `#efe9dc`, terracotta `#d06a30`.
- Typographies (Google Fonts) : Cormorant Garamond (titres), Source Sans 3 (texte), Caveat (accroches).
