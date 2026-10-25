// ==========================================
// 1. ÉTAT DU JEU
// ==========================================
// Les questions sont dans questions.js (constante COURS : niveau -> cours -> questions)

// Remise à zéro générale : changer cette date efface TOUT sur chaque téléphone à sa prochaine
// ouverture (progression, diamants, profil, avatar), comme une rentrée de septembre.
const REMISE_A_ZERO = "2026-10-25";
try {
    if (localStorage.getItem('remise_a_zero') !== REMISE_A_ZERO) {
        localStorage.clear();
        localStorage.setItem('remise_a_zero', REMISE_A_ZERO);
    }
} catch (e) { /* stockage indisponible : rien à effacer */ }

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
let classe = localStorage.getItem('user_classe') || ""; // 2COMPO, 1COMPO, TCOMPO ou Invité
let avatar = JSON.parse(localStorage.getItem('user_avatar')) || null;

// Diamants : questions réussies au moins une fois. Contrairement à questionsReussies
// (remis à zéro quand un cours est terminé pour pouvoir le refaire), un diamant reste acquis.
let diamantsAcquis = JSON.parse(localStorage.getItem('diamants_acquis')) || [...questionsReussies];

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
    const choisie = document.querySelector("#choix-classe button.choisie");

    if (p === "" || n === "") {
        alert("Pense à remplir ton nom et ton prénom pour que je puisse te reconnaître !");
        return;
    }
    if (!choisie) {
        alert("Choisis ta classe (ou Invité) pour apparaître sur le bon podium !");
        return;
    }

    // Sauvegarde
    localStorage.setItem('user_prenom', p);
    localStorage.setItem('user_nom', n);
    localStorage.setItem('user_classe', choisie.dataset.classe);
    prenom = p;
    nom = n;
    classe = choisie.dataset.classe;

    // Gestion du "Ne plus afficher"
    if (document.getElementById('nePlusAfficher').checked) {
        localStorage.setItem('guide_vu', 'true');
    }

    document.getElementById('welcome-modal').style.display = "none";
    majEntete();
    envoyerProfil();

    // Pas encore d'avatar : on propose de le créer tout de suite
    if (!avatar && document.getElementById('jeu').style.display === 'none') {
        ouvrirAvatar();
        return;
    }

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

// Bandeau du haut : avatar (ou initiales), "Salut Prénom", classe, diamants
function majEntete() {
    const pastille = document.getElementById("avatar");
    if (avatar) {
        const image = element("img");
        image.src = urlAvatar(avatar);
        image.alt = "";
        pastille.replaceChildren(image);
    } else {
        pastille.innerText = ((prenom[0] || "") + (nom[0] || "")).toUpperCase() || "?";
    }
    document.getElementById("salut").innerText = prenom ? `Salut ${prenom} !` : "Salut !";
    document.getElementById("role").innerText = classe || "Élève";
    document.getElementById("total-diamants").innerText = diamantsAcquis.length;
}

// Écran 1 : nombre de cours ouverts sous chaque niveau
function majInfosNiveaux() {
    Object.keys(NOMS_NIVEAUX).forEach(niveau => {
        document.getElementById("info-" + niveau).innerText = `${coursVisibles(niveau).length} cours à réviser`;
    });
}

function afficherEcran(id) {
    ["selection-niveau", "selection-cours", "jeu", "fin", "revision", "ecran-avatar", "classement"].forEach(e =>
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
        if (!diamantsAcquis.includes(q.q)) {
            diamantsAcquis.push(q.q);
            localStorage.setItem('diamants_acquis', JSON.stringify(diamantsAcquis));
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
        ...donneesProfil(),
        nom_complet: prenom + " " + nom.toUpperCase() + (classe ? ` (${classe})` : ""),
        niveau: niveauActuel + " – " + coursActuel.titre + " (" + statut + ")",
        cours: coursActuel.titre,
        statut: statut,
        score: score, // On envoie juste le nombre (ex: 16)
        temps: timerGlobal // On envoie les secondes totales (ex: 501)
    };
}

// Profil pour le classement : le programme Google garde le plus grand nombre de diamants reçu
function donneesProfil() {
    return {
        prenom: prenom,
        nom: nom,
        classe: classe,
        diamants: diamantsAcquis.length,
        avatar: avatar ? JSON.stringify(avatar) : ""
    };
}

function envoyerProfil() {
    if (!prenom || !classe) return Promise.resolve();
    const donnees = { type: "profil", ...donneesProfil() };
    return fetch(URL_SCRIPT, { method: "POST", mode: "no-cors", body: JSON.stringify(donnees) })
        .catch(() => mettreEnAttente(donnees));
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
// AVATAR (DiceBear, style "Avataaars" de Pablo Stanley : libre d'usage)
// ==========================================
// L'avatar est un petit objet de réglages ; l'image est fabriquée par l'API DiceBear.

const COULEURS_ACCESSOIRES = ["262e33", "65c9ff", "5199e4", "25557c", "e6e6e6", "929598", "3c4f5c", "b1e2ff", "a7ffc4", "ffafb9", "ffffb1", "ff488e", "ff5c5c", "ffffff"];
const REGLAGES_AVATAR = [
    { cle: "skinColor", titre: "Peau", couleurs: ["ffdbb4", "edb98a", "fd9841", "d08b5b", "ae5d29", "614335", "f8d25c"] },
    { cle: "top", titre: "Coiffure", valeurs: ["shortFlat", "shortRound", "shortWaved", "shortCurly", "theCaesar", "theCaesarAndSidePart", "sides", "dreads01", "dreads02", "frizzle", "shaggy", "shaggyMullet", "bigHair", "bob", "bun", "curly", "curvy", "dreads", "frida", "fro", "froBand", "longButNotTooLong", "miaWallace", "shavedSides", "straight01", "straight02", "straightAndStrand", "hat", "hijab", "turban", "winterHat1", "winterHat02", "winterHat03", "winterHat04"] },
    { cle: "hairColor", titre: "Cheveux et barbe", couleurs: ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "ecdcbf", "e8e1e1", "c93305", "f59797"] },
    { cle: "eyes", titre: "Yeux", valeurs: ["default", "happy", "wink", "squint", "side", "surprised", "hearts", "eyeRoll", "winkWacky", "closed"] },
    { cle: "eyebrows", titre: "Sourcils", valeurs: ["defaultNatural", "raisedExcitedNatural", "flatNatural", "upDownNatural", "angryNatural", "sadConcernedNatural", "unibrowNatural", "default", "raisedExcited", "angry"] },
    { cle: "mouth", titre: "Bouche", valeurs: ["smile", "default", "twinkle", "tongue", "serious", "eating", "disbelief", "concerned"] },
    { cle: "accessories", titre: "Lunettes", valeurs: ["aucune", "prescription01", "prescription02", "round", "kurt", "wayfarers", "sunglasses"] },
    { cle: "facialHair", titre: "Barbe", valeurs: ["aucune", "beardLight", "beardMedium", "beardMajestic", "moustacheFancy", "moustacheMagnum"] },
    { cle: "clothing", titre: "Vêtement", valeurs: ["hoodie", "shirtCrewNeck", "shirtVNeck", "shirtScoopNeck", "graphicShirt", "collarAndSweater", "blazerAndShirt", "blazerAndSweater", "overall"] },
    { cle: "clothesColor", titre: "Couleur du vêtement", couleurs: COULEURS_ACCESSOIRES },
    { cle: "fond", titre: "Fond", couleurs: ["c9dcff", "ffe68f", "c4f0cf", "ffd0e6", "dcd2ff", "ffd9bf"] }
];
let avatarEnCours = null;

function urlAvatar(a) {
    const p = new URLSearchParams({
        seed: "objectif-materiaux",
        top: a.top, topProbability: 100,
        hairColor: a.hairColor, facialHairColor: a.hairColor,
        skinColor: a.skinColor,
        eyes: a.eyes, eyebrows: a.eyebrows, mouth: a.mouth,
        clothing: a.clothing, clothesColor: a.clothesColor, clothingGraphic: "diamond",
        accessoriesProbability: a.accessories === "aucune" ? 0 : 100,
        facialHairProbability: a.facialHair === "aucune" ? 0 : 100,
        backgroundColor: a.fond
    });
    if (a.accessories !== "aucune") p.set("accessories", a.accessories);
    if (a.facialHair !== "aucune") p.set("facialHair", a.facialHair);
    return "https://api.dicebear.com/9.x/avataaars/svg?" + p.toString();
}

function avatarAleatoire() {
    const hasard = liste => liste[Math.floor(Math.random() * liste.length)];
    const a = {};
    REGLAGES_AVATAR.forEach(r => a[r.cle] = hasard(r.valeurs || r.couleurs));
    a.accessories = Math.random() < 0.7 ? "aucune" : a.accessories; // pas trop de lunettes
    a.facialHair = Math.random() < 0.8 ? "aucune" : a.facialHair;  // pas trop de barbes
    return a;
}

let ecranAvantAvatar = "selection-niveau";
function ouvrirAvatar() {
    const visible = ["selection-niveau", "selection-cours", "revision", "classement"].find(e => document.getElementById(e).style.display !== "none");
    if (document.getElementById("jeu").style.display !== "none") return; // pas pendant un quiz
    ecranAvantAvatar = visible || "selection-niveau";
    avatarEnCours = avatar ? { ...avatar } : avatarAleatoire();
    // Classe : modifiable ici aussi (ex. erreur à l'inscription, passage en Première)
    document.querySelectorAll("#profil-classe button").forEach(b => {
        b.classList.toggle("choisie", b.dataset.classe === classe);
        b.onclick = () => {
            document.querySelectorAll("#profil-classe button").forEach(x => x.classList.remove("choisie"));
            b.classList.add("choisie");
        };
    });
    dessinerReglagesAvatar();
    afficherEcran("ecran-avatar");
}

function fermerAvatar() {
    if (ecranAvantAvatar === "selection-cours") choisirNiveau(niveauActuel);
    else if (ecranAvantAvatar === "classement") ouvrirClassement();
    else retourNiveaux();
}

function avatarAuHasard() {
    avatarEnCours = avatarAleatoire();
    dessinerReglagesAvatar();
}

function enregistrerAvatar() {
    avatar = { ...avatarEnCours };
    localStorage.setItem('user_avatar', JSON.stringify(avatar));
    const choisie = document.querySelector("#profil-classe button.choisie");
    if (choisie) {
        classe = choisie.dataset.classe;
        localStorage.setItem('user_classe', classe);
    }
    majEntete();
    envoyerProfil();
    fermerAvatar();
}

function dessinerReglagesAvatar() {
    document.getElementById("apercu-avatar").src = urlAvatar(avatarEnCours);
    document.getElementById("fond-apercu").style.background = "#" + avatarEnCours.fond;
    const zone = document.getElementById("reglages-avatar");
    zone.innerHTML = "";
    REGLAGES_AVATAR.forEach(r => {
        const bloc = element("div", "reglage");
        const titre = element("div", "reglage-titre", r.titre);
        bloc.append(titre);
        if (r.valeurs) {
            // Flèches : modèle précédent / suivant
            const i = Math.max(0, r.valeurs.indexOf(avatarEnCours[r.cle]));
            const aucun = r.valeurs[i] === "aucune";
            const defileur = element("div", "defileur");
            const avant = element("button", "btn btn-rond", "‹");
            const apres = element("button", "btn btn-rond", "›");
            const changer = pas => {
                avatarEnCours[r.cle] = r.valeurs[(i + pas + r.valeurs.length) % r.valeurs.length];
                dessinerReglagesAvatar();
            };
            avant.onclick = () => changer(-1);
            apres.onclick = () => changer(1);
            const numero = r.valeurs[0] === "aucune" ? i : i + 1;
            const total = r.valeurs[0] === "aucune" ? r.valeurs.length - 1 : r.valeurs.length;
            defileur.append(avant, element("span", "valeur", aucun ? "Aucune" : `Modèle ${numero} sur ${total}`), apres);
            bloc.append(defileur);
        } else {
            // Pastilles de couleur
            const pastilles = element("div", "pastilles-couleur");
            r.couleurs.forEach(c => {
                const b = element("button", c === avatarEnCours[r.cle] ? "choisie" : "");
                b.style.background = "#" + c;
                b.setAttribute("aria-label", r.titre + " " + c);
                b.onclick = () => { avatarEnCours[r.cle] = c; dessinerReglagesAvatar(); };
                pastilles.append(b);
            });
            bloc.append(pastilles);
        }
        zone.append(bloc);
    });
}

// ==========================================
// CLASSEMENT : podium des 3 premiers de la classe
// ==========================================
// Seuls les 3 premiers sont affichés (choix du prof : personne ne doit se sentir rabaissé).
// Les données viennent du Google Sheet (onglet "Classement") via le programme Google.

async function ouvrirClassement() {
    afficherEcran("classement");
    const podium = document.getElementById("podium");
    const encouragement = document.getElementById("encouragement");
    document.getElementById("titre-classement").innerText = classe ? `Podium ${classe}` : "Podium";
    document.getElementById("annee-classement").innerText = "";
    podium.replaceChildren(element("p", "", "Chargement du podium…"));
    encouragement.replaceChildren();

    if (!classe) {
        podium.replaceChildren(element("p", "", "Choisis ta classe pour voir ton podium."));
        return;
    }
    try {
        await envoyerProfil(); // tes derniers diamants comptent tout de suite
        const reponse = await fetch(`${URL_SCRIPT}?action=podium&classe=${encodeURIComponent(classe)}&prenom=${encodeURIComponent(prenom)}&nom=${encodeURIComponent(nom)}`);
        const donnees = await reponse.json();
        document.getElementById("annee-classement").innerText = `Année ${donnees.annee} · les 3 élèves qui ont le plus de diamants`;
        dessinerPodium(donnees.podium || []);
    } catch (e) {
        podium.replaceChildren(element("p", "", "Pas de connexion : le podium n'a pas pu se charger."));
    }
}

function dessinerPodium(liste) {
    const places = [
        { rang: 1, classeCss: "premier", medaille: "1st place medal/3D/1st_place_medal_3d.png" },
        { rang: 2, classeCss: "deuxieme", medaille: "2nd place medal/3D/2nd_place_medal_3d.png" },
        { rang: 3, classeCss: "troisieme", medaille: "3rd place medal/3D/3rd_place_medal_3d.png" }
    ];
    const ordreAffichage = [places[1], places[0], places[2]]; // 2e, 1er, 3e
    const podium = document.getElementById("podium");
    podium.replaceChildren();
    ordreAffichage.forEach(place => {
        const eleve = liste[place.rang - 1];
        const marche = element("div", `marche ${place.classeCss}${eleve ? "" : " vide"}`);
        const tete = element("img", "tete");
        tete.alt = "";
        if (eleve && eleve.avatar) tete.src = urlAvatar(eleve.avatar);
        marche.append(tete);
        marche.append(element("div", "nom-podium", eleve ? eleve.nom : "Place libre"));
        const score = element("div", "score-podium");
        if (eleve) {
            const gemme = element("img");
            gemme.src = illu("Gem stone/3D/gem_stone_3d.png");
            gemme.alt = "";
            score.append(gemme, document.createTextNode(String(eleve.diamants)));
        }
        marche.append(score);
        const socle = element("div", "socle");
        const medaille = element("img");
        medaille.src = illu(place.medaille);
        medaille.alt = place.rang + "e place";
        socle.append(medaille);
        marche.append(socle);
        podium.append(marche);
    });

    // Encouragement : jamais de numéro de place en dehors du podium
    const surPodium = liste.some(e => e.moi);
    const n = diamantsAcquis.length;
    const encouragement = document.getElementById("encouragement");
    encouragement.replaceChildren(
        element("strong", "", surPodium ? "Bravo, tu es sur le podium !" : "Continue comme ça !"),
        element("span", "", surPodium
            ? "Garde ta place : chaque nouvelle question réussie te rapporte un diamant."
            : `Tu as ${n} diamant${n > 1 ? "s" : ""}. Chaque nouvelle question réussie t'en rapporte un de plus.`)
    );
}

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

    // Diamants : on enregistre la liste dès le premier lancement de cette version
    localStorage.setItem('diamants_acquis', JSON.stringify(diamantsAcquis));

    // Choix de la classe dans la fenêtre d'accueil
    document.querySelectorAll("#choix-classe button").forEach(b => {
        if (b.dataset.classe === classe) b.classList.add("choisie");
        b.onclick = () => {
            document.querySelectorAll("#choix-classe button").forEach(x => x.classList.remove("choisie"));
            b.classList.add("choisie");
        };
    });

    // Remplissage automatique si déjà connu
    if (prenom) {
        document.getElementById('user-prenom').value = prenom;
        document.getElementById('user-nom').value = nom;
        // On cache la section si l'élève est déjà connu (et a déjà choisi sa classe)
        if (classe) document.getElementById('section-identification').style.display = "none";
    }
    envoyerProfil();

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

    // Fenêtre d'accueil : au premier lancement, ou pour un élève déjà inscrit qui n'a pas encore de classe
    if (!localStorage.getItem('guide_vu') || (prenom && !classe)) {
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
