// ==========================================
// 1. ÉTAT DU JEU
// ==========================================
// Les questions sont dans questions.js (constante COURS : niveau -> cours -> questions)
let questionsReussies = JSON.parse(localStorage.getItem('quiz_reussies')) || [];
let questionsAffichees = [];
let niveauActuel = "";
let coursActuel = null;
let indexQuestion = 0;
let score = 0;
let timerGlobal = 0;
let intervalTimer;
let peutValider = true;
let nbRepondusEnvoyes = 0; // pour n'envoyer une partie interrompue que si l'élève a avancé depuis
let minuterieSuite = null; // passage automatique à la question suivante après la correction

// Récupération de l'identité
let prenom = localStorage.getItem('user_prenom') || "";
let nom = localStorage.getItem('user_nom') || "";

// Aperçu prof : adresse terminée par ?prof -> les cours fermés sont visibles aussi
const modeProf = new URLSearchParams(location.search).has('prof');

const NOMS_NIVEAUX = { seconde: "Seconde", premiere: "Première", terminale: "Terminale" };
const JOURS_NOUVEAU = 14; // un cours ouvert depuis moins de 14 jours porte le badge "Nouveau"

// Illustrations 3D : Fluent Emoji de Microsoft (licence MIT), version figée
const URL_ILLUS = "https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets/";
function illu(chemin) { return URL_ILLUS + chemin.split("/").map(encodeURIComponent).join("/"); }

// Illustration d'un cours : champ "icone" du cours, sinon d'après les mots du titre
const ILLUS_COURS = [
    [/verre/i, "Test tube/3D/test_tube_3d.png"],
    [/renfort|fibre|tissu/i, "Yarn/3D/yarn_3d.png"],
    [/histoire|économie/i, "Scroll/3D/scroll_3d.png"],
    [/sécurité|hse|epi/i, "Safety vest/3D/safety_vest_3d.png"],
    [/injection|presse|moule/i, "Gear/3D/gear_3d.png"],
    [/révision/i, "Books/3D/books_3d.png"]
];
function illuCours(cours) {
    if (cours.icone) return cours.icone;
    const trouve = ILLUS_COURS.find(([motif]) => motif.test(cours.titre));
    return trouve ? trouve[1] : "Hammer and wrench/3D/hammer_and_wrench_3d.png";
}
const COULEURS_COURS = ["fond-bleu", "fond-rose", "fond-vert", "fond-jaune", "fond-violet", "fond-peche"];

// Google Apps Script du prof : reçoit les résultats et les écrit dans son Google Sheet
const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbw7JK1wl4VxaUVSlm1m0YLLmOH_HpiXnd20TI-SxlBQmSaDh6jigjSS7KLAsFesAbTg/exec";

// ==========================================
// 2. CORRECTION DES RÉPONSES
// ==========================================
// On compare des mots entiers (et non des morceaux de mots) :
// "20" n'est plus accepté pour "2", "re" n'est plus accepté pour "resine".
// On reste tolérant : accents, majuscules, pluriel, petite faute de frappe sur les mots longs.

function decouperEnMots(texte) {
    return texte
        .normalize("NFKD").replace(/[̀-ͯ]/g, "") // NFKD : cm³ -> cm3
        .toLowerCase()
        .replace(/(\d),(\d)/g, "$1.$2")          // 2,5 -> 2.5
        .replace(/(\d) (?=\d{3}\b)/g, "$1")      // 80 000 -> 80000
        .replace(/(\d)([a-z%])/g, "$1 $2")       // 6cm -> 6 cm
        .replace(/([a-z])(\d)/g, "$1 $2")        // co2 -> co 2
        .replace(/[^a-z0-9.%]+/g, " ")
        .replace(/\.(?!\d)|(?<!\d)\./g, " ")     // on ne garde que les points des nombres
        .split(" ")
        .filter(m => m !== "");
}

function distance(a, b) {
    // Nombre de lettres à changer / ajouter / enlever pour passer de a à b
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return d[a.length][b.length];
}

function motCorrespond(motEleve, motCle) {
    if (motEleve === motCle) return true;
    if (/^[\d.%]+$/.test(motCle)) return false;               // nombre : il faut le nombre exact
    if (motCle.length <= 3) return motCle.length === 3 && motEleve === motCle + "s"; // sigle ou mot court : exact ("bacs" ok, "pas" ≠ "pa")
    if (motEleve.startsWith(motCle)) return true;              // pluriel, féminin : "inflammables"
    const fautesPermises = motCle.length >= 8 ? 2 : (motCle.length >= 5 ? 1 : 0);
    return distance(motEleve, motCle) <= fautesPermises;
}

function reponseCorrecte(saisie, motsCles) {
    const motsEleve = decouperEnMots(saisie);
    return motsCles.some(cle => {
        const motsCle = decouperEnMots(cle);
        if (motsCle.length === 0) return false;
        return contientDansLOrdre(motsEleve, motsCle, 0, -1);
    });
}

// Tous les mots du mot-clé, dans l'ordre, avec au plus 2 petits mots entre eux
// ("chasser l'air" est accepté pour le mot-clé "chasser air")
function contientDansLOrdre(motsEleve, motsCle, k, dernier) {
    if (k === motsCle.length) return true;
    const debut = k === 0 ? 0 : dernier + 1;
    const fin = k === 0 ? motsEleve.length - 1 : Math.min(dernier + 3, motsEleve.length - 1);
    for (let i = debut; i <= fin; i++) {
        if (motCorrespond(motsEleve[i], motsCle[k]) && contientDansLOrdre(motsEleve, motsCle, k + 1, i)) return true;
    }
    return false;
}

// ==========================================
// 3. LOGIQUE DU JEU
// ==========================================

// Validation Identité
function validerEtFermer() {
    const p = document.getElementById("user-prenom").value.trim();
    const n = document.getElementById("user-nom").value.trim();

    if (p === "" || n === "") {
        alert("Pense à remplir ton nom et ton prénom pour que je puisse te reconnaître !");
        return;
    }

    // Sauvegarde
    localStorage.setItem('user_prenom', p);
    localStorage.setItem('user_nom', n);
    prenom = p;
    nom = n;

    // Gestion du "Ne plus afficher"
    if (document.getElementById('nePlusAfficher').checked) {
        localStorage.setItem('guide_vu', 'true');
    }

    document.getElementById('welcome-modal').style.display = "none";
    majEntete();

    // Si une partie est en cours, on affiche la notif personnalisée
    if (localStorage.getItem('quiz_encours')) {
        afficherNotifReprise();
    }

    if (document.getElementById('jeu').style.display !== 'none') {
        document.getElementById('input-reponse').focus();
    }
}

function coursVisibles(niveau) {
    return (COURS[niveau] || []).filter(c => c.ouvert || modeProf);
}

function trouverCours(niveau, id) {
    return (COURS[niveau] || []).find(c => c.id === id);
}

function nbReussiesDuCours(cours) {
    return cours.questions.filter(q => questionsReussies.includes(q.q)).length;
}

function estNouveau(cours) {
    if (!cours.ouvert || !cours.date || cours.id.startsWith("revisions-")) return false;
    const jours = (Date.now() - new Date(cours.date).getTime()) / 86400000;
    return jours < JOURS_NOUVEAU;
}

// Bandeau du haut : initiales, "Salut Prénom", diamants = questions réussies
function majEntete() {
    document.getElementById("avatar").innerText = ((prenom[0] || "") + (nom[0] || "")).toUpperCase() || "?";
    document.getElementById("salut").innerText = prenom ? `Salut ${prenom} !` : "Salut !";
    document.getElementById("total-diamants").innerText = questionsReussies.length;
}

// Écran 1 : nombre de cours ouverts sous chaque niveau
function majInfosNiveaux() {
    Object.keys(NOMS_NIVEAUX).forEach(niveau => {
        document.getElementById("info-" + niveau).innerText = `${coursVisibles(niveau).length} cours à réviser`;
    });
}

function afficherEcran(id) {
    ["selection-niveau", "selection-cours", "jeu", "fin", "revision"].forEach(e =>
        document.getElementById(e).style.display = (e === id ? "block" : "none"));
    document.body.classList.toggle("en-jeu", id === "jeu");
    window.scrollTo(0, 0);
}

function element(balise, classe, texte) {
    const el = document.createElement(balise);
    if (classe) el.className = classe;
    if (texte !== undefined) el.innerText = texte;
    return el;
}

// Écran 2 : la liste des cours du niveau choisi
function choisirNiveau(niveau) {
    niveauActuel = niveau;
    document.getElementById("titre-niveau").innerText = NOMS_NIVEAUX[niveau];

    const liste = document.getElementById("liste-cours");
    liste.innerHTML = "";
    coursVisibles(niveau).forEach((cours, i) => {
        const carte = element("div", `carte carte-cours ${COULEURS_COURS[i % COULEURS_COURS.length]}${cours.ouvert ? "" : " cours-ferme"}`);
        const haut = element("div", "haut carte-ligne");
        const image = element("img", "illu");
        image.src = illu(illuCours(cours));
        image.alt = "";

        const texte = element("span", "carte-texte");
        if (estNouveau(cours)) texte.append(element("span", "etiquette-cours nouveau", "Nouveau"));
        if (!cours.ouvert) texte.append(element("span", "etiquette-cours ferme", "Fermé (aperçu prof)"));
        texte.append(element("span", "carte-titre", cours.titre));

        const pause = lirePauses()[cours.id];
        const reussies = nbReussiesDuCours(cours);
        texte.append(element("span", "carte-info", pause
            ? `En pause : reprends à la question ${pause.index + 1} sur ${pause.questions.length}`
            : `${reussies} question${reussies > 1 ? "s" : ""} réussie${reussies > 1 ? "s" : ""} sur ${cours.questions.length}`));
        const barre = element("span", "mini-barre");
        const rempli = element("div");
        rempli.style.width = Math.round(100 * reussies / cours.questions.length) + "%";
        barre.append(rempli);
        texte.append(barre);

        haut.append(image, texte);

        // Deux actions : jouer le quiz, ou revoir toutes les questions (pour en parler entre élèves)
        const actions = element("div", "actions-cours");
        const jouer = element("button", "btn btn-noir", pause ? "Reprendre" : "Jouer");
        jouer.onclick = () => lancerCours(niveau, cours.id);
        const revoir = element("button", "btn btn-blanc", "Revoir");
        revoir.onclick = () => afficherRevision(niveau, cours.id);
        actions.append(jouer, revoir);

        carte.append(haut, actions);
        liste.appendChild(carte);
    });

    afficherEcran("selection-cours");
}

// Écran "Revoir les questions" : chaque question sur une carte, réponse cachée derrière un bouton.
// Seules les questions déjà réussies dans le quiz ont leur réponse consultable (choix du prof).
let toutesVisibles = false;

function afficherRevision(niveau, idCours) {
    const cours = trouverCours(niveau, idCours);
    if (!cours) return;
    niveauActuel = niveau;
    toutesVisibles = false;
    document.getElementById("titre-revision").innerText = cours.titre;
    const nbReussies = nbReussiesDuCours(cours);
    document.getElementById("info-revision").innerText = nbReussies === 0
        ? `${cours.questions.length} questions · réussis-les dans le quiz pour débloquer leurs réponses`
        : `${nbReussies} réponse${nbReussies > 1 ? "s" : ""} débloquée${nbReussies > 1 ? "s" : ""} sur ${cours.questions.length} · les autres se débloquent quand tu les réussis dans le quiz`;
    document.getElementById("btn-tout-voir").innerText = "Afficher mes réponses";
    document.getElementById("btn-tout-voir").style.display = nbReussies > 0 ? "block" : "none";
    document.getElementById("btn-jouer-revision").onclick = () => lancerCours(niveau, idCours);

    const liste = document.getElementById("liste-revision");
    liste.innerHTML = "";
    cours.questions.forEach((q, i) => {
        const carte = element("div", "carte carte-revision");
        const entete = element("div", "entete-revision");
        entete.append(element("span", "numero", String(i + 1)));
        const separation = q.q.match(/^([^:?]{2,40}?)\s*:\s*(.+)$/);
        if (separation) entete.append(element("span", "theme-question", separation[1]));
        const reussie = questionsReussies.includes(q.q);
        if (reussie) entete.append(element("span", "reussie", "Réussie"));
        carte.append(entete, element("p", "texte-question", separation ? separation[2] : q.q));

        if (reussie) {
            const reponse = element("div", "reponse-revision", q.r);
            reponse.style.display = "none";
            const voir = element("button", "btn btn-voir", "Voir la réponse");
            voir.onclick = () => { voir.style.display = "none"; reponse.style.display = "block"; };
            carte.append(voir, reponse);
        } else {
            // La réponse n'est même pas dans la page tant que la question n'est pas réussie
            carte.append(element("div", "verrou", "Réponse bloquée : réussis cette question dans le quiz"));
        }
        liste.appendChild(carte);
    });
    afficherEcran("revision");
}

function basculerToutesReponses() {
    toutesVisibles = !toutesVisibles;
    document.querySelectorAll("#liste-revision .btn-voir").forEach(b => b.style.display = toutesVisibles ? "none" : "block");
    document.querySelectorAll("#liste-revision .reponse-revision").forEach(r => r.style.display = toutesVisibles ? "block" : "none");
    document.getElementById("btn-tout-voir").innerText = toutesVisibles ? "Cacher mes réponses" : "Afficher mes réponses";
}

function retourNiveaux() {
    majInfosNiveaux();
    afficherEcran("selection-niveau");
}

// Écran 3 : le quiz d'un cours
function lancerCours(niveau, idCours) {
    const cours = trouverCours(niveau, idCours);
    if (!cours) return;
    niveauActuel = niveau;
    coursActuel = cours;
    clearTimeout(minuterieSuite);
    peutValider = true;

    // Reprise : partie en cours (app rouverte) ou partie mise en pause (changement de cours)
    const encours = JSON.parse(localStorage.getItem('quiz_encours'));
    const pauses = lirePauses();
    const sauvegarde = (encours && encours.niveau === niveau && encours.cours === idCours) ? encours : pauses[idCours];
    if (pauses[idCours]) {
        delete pauses[idCours];
        localStorage.setItem('quiz_pauses', JSON.stringify(pauses));
    }

    if (sauvegarde) {
        questionsAffichees = sauvegarde.questions;
        indexQuestion = sauvegarde.index;
        score = sauvegarde.score;
        timerGlobal = sauvegarde.timer;
        nbRepondusEnvoyes = sauvegarde.envoyes || 0;
    } else {
        // Nouvelle session : les questions jamais réussies de ce cours
        let dispos = cours.questions.filter(q => !questionsReussies.includes(q.q));

        if (dispos.length === 0) {
            // Cours entièrement réussi : on le remet à zéro pour recommencer
            questionsReussies = questionsReussies.filter(qText => !cours.questions.some(q => q.q === qText));
            localStorage.setItem('quiz_reussies', JSON.stringify(questionsReussies));
            dispos = [...cours.questions];
        }

        dispos.sort(() => Math.random() - 0.5);
        questionsAffichees = dispos.slice(0, 20);
        indexQuestion = 0;
        score = 0;
        timerGlobal = 0;
        nbRepondusEnvoyes = 0;
    }

    document.getElementById("titre-cours-jeu").innerText = cours.titre;
    document.getElementById("feedback-message").style.display = "none";
    afficherEcran("jeu");

    lancerTimer();
    afficherQuestion();
}

function etatSession() {
    return {
        niveau: niveauActuel,
        cours: coursActuel.id,
        questions: questionsAffichees,
        index: indexQuestion + (peutValider ? 0 : 1), // pendant la correction, la question compte comme faite
        score: score,
        timer: timerGlobal,
        envoyes: nbRepondusEnvoyes
    };
}

function sauvegarderSession() {
    localStorage.setItem('quiz_encours', JSON.stringify(etatSession()));
}

// Parties mises en pause quand l'élève change de cours (une par cours)
function lirePauses() {
    return JSON.parse(localStorage.getItem('quiz_pauses')) || {};
}

// Bouton "Changer de cours" : on met la partie en pause et on revient à la liste des cours
function changerDeCours() {
    if (!coursActuel) return;
    envoyerPartieInterrompue(); // le prof voit le travail déjà fait

    // Correction affichée : on passe à la question suivante sans attendre
    clearTimeout(minuterieSuite);
    if (!peutValider) {
        indexQuestion++;
        peutValider = true;
    }
    document.getElementById("feedback-message").style.display = "none";
    clearInterval(intervalTimer);

    if (indexQuestion >= questionsAffichees.length) {
        terminerQuiz(); // il venait de répondre à la dernière question
        return;
    }

    const pauses = lirePauses();
    pauses[coursActuel.id] = etatSession();
    localStorage.setItem('quiz_pauses', JSON.stringify(pauses));
    localStorage.removeItem('quiz_encours');
    coursActuel = null;

    choisirNiveau(niveauActuel);
}

function afficherQuestion() {
    if (indexQuestion >= questionsAffichees.length) {
        terminerQuiz();
        return;
    }
    sauvegarderSession();
    const q = questionsAffichees[indexQuestion];
    // "THÈME : question" -> le thème va dans la pastille au-dessus de la question
    const separation = q.q.match(/^([^:?]{2,40}?)\s*:\s*(.+)$/);
    document.getElementById("theme-question").innerText = separation ? separation[1] : "";
    document.getElementById("theme-question").style.display = separation ? "inline-block" : "none";
    document.getElementById("question").innerText = separation ? separation[2] : q.q;
    document.getElementById("input-reponse").value = "";
    document.getElementById("progression").innerText = `Question ${indexQuestion + 1} sur ${questionsAffichees.length}`;
    document.getElementById("barre-remplie").style.width = Math.round(100 * indexQuestion / questionsAffichees.length) + "%";
    document.getElementById("input-reponse").focus();
    gardeVisible("btn-valider");
}

// Téléphone : le clavier réduit l'écran, on fait défiler pour garder l'élément voulu au-dessus du clavier
function gardeVisible(id) {
    setTimeout(() => document.getElementById(id).scrollIntoView({ block: "nearest", behavior: "smooth" }), 350);
}

function verifierReponse() {
    if (!peutValider) return;
    const input = document.getElementById("input-reponse");
    const feedback = document.getElementById("feedback-message");
    const saisie = input.value.trim();
    if (!saisie) return;

    peutValider = false;
    const q = questionsAffichees[indexQuestion];

    const juste = reponseCorrecte(saisie, q.a);
    if (juste) {
        score++;
        if (!questionsReussies.includes(q.q)) {
            questionsReussies.push(q.q);
            localStorage.setItem('quiz_reussies', JSON.stringify(questionsReussies));
        }
        majEntete();
    }
    const image = element("img");
    image.src = illu(juste ? "Check mark button/3D/check_mark_button_3d.png" : "Cross mark/3D/cross_mark_3d.png");
    image.alt = "";
    const texte = element("div");
    texte.append(
        element("strong", "", juste ? (prenom ? `Bien joué ${prenom} !` : "Bien joué !") : "Pas tout à fait…"),
        element("span", "", (juste ? "" : "Réponse attendue : ") + q.r)
    );
    feedback.className = "feedback " + (juste ? "correct" : "erreur");
    feedback.replaceChildren(image, texte);
    feedback.style.display = "flex";
    gardeVisible("feedback-message");
    document.getElementById("barre-remplie").style.width = Math.round(100 * (indexQuestion + 1) / questionsAffichees.length) + "%";
    sauvegarderSession();

    minuterieSuite = setTimeout(() => {
        feedback.style.display = "none";
        indexQuestion++;
        if (indexQuestion < questionsAffichees.length) {
            peutValider = true;
            afficherQuestion();
        } else {
            terminerQuiz();
        }
    }, 2800);
}

function lancerTimer() {
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
        timerGlobal++;
        const m = Math.floor(timerGlobal / 60);
        const s = timerGlobal % 60;
        document.getElementById("timer").innerText = `${m}:${s < 10 ? "0" + s : s}`;
        if (timerGlobal % 5 === 0) sauvegarderSession();
    }, 1000);
}

function terminerQuiz() {
    clearInterval(intervalTimer);
    localStorage.removeItem('quiz_encours');
    const pauses = lirePauses();
    delete pauses[coursActuel.id];
    localStorage.setItem('quiz_pauses', JSON.stringify(pauses));

    const m = Math.floor(timerGlobal / 60);
    const s = timerGlobal % 60;
    const reussite = score / questionsAffichees.length;

    // Écran 4 : bilan (le texte vient de l'élève et des cours : on passe par innerText)
    const fin = document.getElementById("fin");
    fin.innerHTML = `
        <div class="carte fin-carte ${reussite >= 0.5 ? "fond-vert" : "fond-peche"}">
            <img class="fin-illu" src="${illu(reussite >= 0.5 ? "Trophy/3D/trophy_3d.png" : "Glowing star/3D/glowing_star_3d.png")}" alt="">
            <h2 class="titre-rond" id="fin-titre"></h2>
            <p id="fin-cours"></p>
            <div class="fin-score">${score}<span style="font-size:.45em"> / ${questionsAffichees.length}</span></div>
            <p>bonnes réponses</p>
            <div class="fin-stats">
                <span class="pastille"><img src="${illu("Gem stone/3D/gem_stone_3d.png")}" alt="">${nbReussiesDuCours(coursActuel)} / ${coursActuel.questions.length} du cours</span>
                <span class="pastille"><img src="${illu("Hourglass not done/3D/hourglass_not_done_3d.png")}" alt="">${m}:${s < 10 ? "0" + s : s}</span>
            </div>
            <p id="statut-envoi">Envoi de tes résultats au prof…</p>
            <button class="btn btn-noir btn-large" onclick="continuerCours()">Continuer ce cours</button>
            <button class="btn btn-contour" onclick="afficherRevision(niveauActuel, coursActuel.id)">Revoir les questions</button>
            <button class="btn btn-contour" onclick="choisirNiveau(niveauActuel)">Retour aux cours</button>
        </div>
    `;
    document.getElementById("fin-titre").innerText = (reussite >= 0.5 ? "Bravo" : "Bien essayé") + (prenom ? " " + prenom : "") + " !";
    document.getElementById("fin-cours").innerText = `${coursActuel.titre} · ${NOMS_NIVEAUX[niveauActuel]}`;
    afficherEcran("fin");

    // Envoi automatique : l'élève n'a plus rien à cliquer
    envoyerResultats(donneesResultats("terminé"));
}

// Bouton "Continuer ce cours" : une nouvelle série avec les questions pas encore réussies
function continuerCours() {
    lancerCours(niveauActuel, coursActuel.id);
}

// ==========================================
// ENVOI DES RÉSULTATS AU PROF (Google Sheet via Google Apps Script)
// ==========================================
// Fin de quiz : envoi automatique. Partie interrompue (l'élève quitte l'app ou change
// d'appli en cours de quiz) : envoi d'une ligne "en cours x/20", seulement s'il a avancé.
// Sans connexion : le résultat est gardé et renvoyé à la prochaine ouverture de l'app.

function donneesResultats(statut) {
    // Le cours et l'état apparaissent dans la colonne "niveau" du Google Sheet
    return {
        nom_complet: prenom + " " + nom.toUpperCase(),
        niveau: niveauActuel + " – " + coursActuel.titre + " (" + statut + ")",
        cours: coursActuel.titre,
        statut: statut,
        score: score, // On envoie juste le nombre (ex: 16)
        temps: timerGlobal // On envoie les secondes totales (ex: 501)
    };
}

function envoyerResultats(donnees) {
    const statut = document.getElementById("statut-envoi");
    if (!prenom) return; // pas d'identité (page de test) : rien n'est envoyé au Sheet
    fetch(URL_SCRIPT, { method: "POST", mode: "no-cors", body: JSON.stringify(donnees) })
        .then(() => {
            if (statut) statut.innerText = "Tes résultats ont été envoyés au prof.";
        })
        .catch(() => {
            mettreEnAttente(donnees);
            if (statut) statut.innerText = "Pas de connexion : tes résultats partiront tout seuls à la prochaine ouverture de l'app.";
        });
}

function mettreEnAttente(donnees) {
    const attente = JSON.parse(localStorage.getItem('envois_en_attente')) || [];
    attente.push(donnees);
    localStorage.setItem('envois_en_attente', JSON.stringify(attente));
}

function renvoyerEnAttente() {
    const attente = JSON.parse(localStorage.getItem('envois_en_attente')) || [];
    if (attente.length === 0) return;
    localStorage.removeItem('envois_en_attente');
    attente.forEach(d => envoyerResultats(d)); // en cas de nouvel échec, ils sont remis en attente
}

// Partie interrompue : appelé quand l'app passe en arrière-plan ou se ferme
function envoyerPartieInterrompue() {
    const quizEnCours = coursActuel && document.getElementById("jeu").style.display !== "none"
        && document.getElementById("question") && indexQuestion < questionsAffichees.length;
    if (!quizEnCours || !prenom) return;
    const nbRepondus = indexQuestion + (peutValider ? 0 : 1);
    if (nbRepondus <= nbRepondusEnvoyes) return; // rien de nouveau depuis le dernier envoi

    const donnees = donneesResultats(`en cours ${nbRepondus}/${questionsAffichees.length}`);
    // sendBeacon : l'envoi part même si la page est en train de se fermer
    const parti = navigator.sendBeacon && navigator.sendBeacon(URL_SCRIPT, JSON.stringify(donnees));
    if (!parti) mettreEnAttente(donnees);
    nbRepondusEnvoyes = nbRepondus;
    sauvegarderSession();
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') envoyerPartieInterrompue();
});
window.addEventListener('pagehide', envoyerPartieInterrompue);

// ==========================================
// 4. INITIALISATION
// ==========================================

window.onload = function() {
    renvoyerEnAttente();

    // Illustrations déclarées dans la page (data-illu="Dossier/3D/fichier.png")
    document.querySelectorAll("img[data-illu]").forEach(img => img.src = illu(img.dataset.illu));
    majEntete();
    majInfosNiveaux();

    let sauvegarde = JSON.parse(localStorage.getItem('quiz_encours'));

    // Ancienne sauvegarde (avant les cours) : elle correspond aux révisions générales
    if (sauvegarde && sauvegarde.niveau && !sauvegarde.cours) {
        sauvegarde.cours = "revisions-" + sauvegarde.niveau;
        localStorage.setItem('quiz_encours', JSON.stringify(sauvegarde));
    }

    // Remplissage automatique si déjà connu
    if (prenom) {
        document.getElementById('user-prenom').value = prenom;
        document.getElementById('user-nom').value = nom;
        // On cache la section si l'élève est déjà connu
        document.getElementById('section-identification').style.display = "none";
    }

    // Reprise de la partie en cours (si le cours existe toujours et est ouvert)
    if (sauvegarde && sauvegarde.niveau) {
        const cours = trouverCours(sauvegarde.niveau, sauvegarde.cours);
        if (cours && (cours.ouvert || modeProf)) {
            lancerCours(sauvegarde.niveau, sauvegarde.cours);
            // Le téléphone a pu fermer l'app avant que l'envoi "en cours" parte : on le rattrape
            if (indexQuestion > nbRepondusEnvoyes) {
                envoyerResultats(donneesResultats(`en cours ${indexQuestion}/${questionsAffichees.length}`));
                nbRepondusEnvoyes = indexQuestion;
                sauvegarderSession();
            }
        } else {
            localStorage.removeItem('quiz_encours');
            sauvegarde = null;
        }
    }

    if (!localStorage.getItem('guide_vu')) {
        document.getElementById('welcome-modal').style.display = "flex";
    } else {
        if (sauvegarde) { afficherNotifReprise(); }
    }
};

function afficherNotifReprise() {
    const notif = document.getElementById('notif-reprise');
    if (notif) {
        notif.innerText = `Ravi de te revoir ${prenom}, on reprend où tu t'étais arrêté !`;
        notif.style.display = 'block';
        setTimeout(() => { notif.style.display = 'none'; }, 5000);
    }
}

// ==========================================
// 5. GESTION DES ÉVÉNEMENTS CLAVIER
// ==========================================

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('jeu').style.display !== 'none') {
        verifierReponse();
    }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA enregistrée !'))
      .catch(err => console.log('Erreur PWA :', err));
  });
}
