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

// Écran 2 : la liste des cours du niveau choisi
function choisirNiveau(niveau) {
    niveauActuel = niveau;
    document.getElementById("titre-niveau").innerText = `${NOMS_NIVEAUX[niveau]} : choisis ton cours`;

    const liste = document.getElementById("liste-cours");
    liste.innerHTML = "";
    coursVisibles(niveau).forEach(cours => {
        const btn = document.createElement("button");
        btn.className = "btn-cours" + (cours.ouvert ? "" : " ferme");
        const titre = document.createElement("span");
        titre.innerText = "📁 " + cours.titre;
        if (estNouveau(cours)) titre.innerHTML += ' <span class="cours-badge">Nouveau</span>';
        if (!cours.ouvert) titre.innerHTML += ' <span class="cours-badge" style="background:#888">Fermé</span>';
        const progression = document.createElement("span");
        progression.className = "cours-progression";
        const pause = lirePauses()[cours.id];
        progression.innerText = pause
            ? `⏸ reprendre ${pause.index + 1}/${pause.questions.length}`
            : `${nbReussiesDuCours(cours)} / ${cours.questions.length}`;
        btn.append(titre, progression);
        btn.onclick = () => lancerCours(niveau, cours.id);
        liste.appendChild(btn);
    });

    document.getElementById("selection-niveau").style.display = "none";
    document.getElementById("selection-cours").style.display = "block";
}

function retourNiveaux() {
    document.getElementById("selection-cours").style.display = "none";
    document.getElementById("selection-niveau").style.display = "block";
}

// Écran 3 : le quiz d'un cours
function lancerCours(niveau, idCours) {
    const cours = trouverCours(niveau, idCours);
    if (!cours) return;
    niveauActuel = niveau;
    coursActuel = cours;

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

    document.getElementById("titre-cours-jeu").innerText = "📁 " + cours.titre;
    document.getElementById("selection-niveau").style.display = "none";
    document.getElementById("selection-cours").style.display = "none";
    document.getElementById("jeu").style.display = "block";

    lancerTimer();
    afficherQuestion();
}

function etatSession() {
    return {
        niveau: niveauActuel,
        cours: coursActuel.id,
        questions: questionsAffichees,
        index: indexQuestion,
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

    document.getElementById("jeu").style.display = "none";
    choisirNiveau(niveauActuel);
}

function afficherQuestion() {
    if (indexQuestion >= questionsAffichees.length) {
        terminerQuiz();
        return;
    }
    sauvegarderSession();
    const q = questionsAffichees[indexQuestion];
    document.getElementById("question").innerText = q.q;
    document.getElementById("input-reponse").value = "";
    document.getElementById("progression").innerText = `Question ${indexQuestion + 1} / ${questionsAffichees.length}`;
    document.getElementById("input-reponse").focus();
}

function verifierReponse() {
    if (!peutValider) return;
    const input = document.getElementById("input-reponse");
    const feedback = document.getElementById("feedback-message");
    const saisie = input.value.trim();
    if (!saisie) return;

    peutValider = false;
    const q = questionsAffichees[indexQuestion];

    if (reponseCorrecte(saisie, q.a)) {
        score++;
        if (!questionsReussies.includes(q.q)) {
            questionsReussies.push(q.q);
            localStorage.setItem('quiz_reussies', JSON.stringify(questionsReussies));
        }
        feedback.className = "feedback correct";
        feedback.innerHTML = "✅ BIEN JOUÉ " + prenom.toUpperCase() + " !<br><small>" + q.r + "</small>";
    } else {
        feedback.className = "feedback erreur";
        feedback.innerHTML = "❌ PAS TOUT À FAIT...<br><small>Réponse attendue : " + q.r + "</small>";
    }

    feedback.style.display = "block";
    sauvegarderSession();

    minuterieSuite = setTimeout(() => {
        feedback.style.display = "none";
        indexQuestion++;
        if (indexQuestion < questionsAffichees.length) {
            afficherQuestion();
            peutValider = true;
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
        document.getElementById("timer").innerText = `Temps : ${m}m ${s < 10 ? "0" + s : s}s`;
        if (timerGlobal % 5 === 0) sauvegarderSession();
    }, 1000);
}

function terminerQuiz() {
    clearInterval(intervalTimer);
    localStorage.removeItem('quiz_encours');
    const pauses = lirePauses();
    delete pauses[coursActuel.id];
    localStorage.setItem('quiz_pauses', JSON.stringify(pauses));

    const progressionCours = `${nbReussiesDuCours(coursActuel)} / ${coursActuel.questions.length}`;
    const m = Math.floor(timerGlobal / 60);
    const s = timerGlobal % 60;

    document.getElementById("jeu").innerHTML = `
        <div class="card" style="text-align:center;">
            <h2>🏆 OBJECTIF ATTEINT ${prenom.toUpperCase()} !</h2>
            <p style="font-size: 1.4em; color: #3498db;"><strong>${coursActuel.titre}</strong><br><small>${NOMS_NIVEAUX[niveauActuel]}</small></p>
            <p style="font-size: 1.2em;">Score de la session : <span style="color: #2ecc71;">${score} / ${questionsAffichees.length}</span></p>
            <p>Progression sur ce cours : <span style="color: #2ecc71;">${progressionCours}</span></p>
            <p>Temps : ${m}m ${s < 10 ? "0"+s : s}s</p>
            <hr style="margin: 25px auto; border-color: #eee;">
            <p id="statut-envoi">📤 Envoi de tes résultats au prof…</p>
            <button class="btn-lvl" onclick="location.reload()" style="background:none; color:#555; border:1px solid #ccc;">Retour au menu</button>
        </div>
    `;

    // Envoi automatique : l'élève n'a plus rien à cliquer
    envoyerResultats(donneesResultats("terminé"));
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
    fetch(URL_SCRIPT, { method: "POST", mode: "no-cors", body: JSON.stringify(donnees) })
        .then(() => {
            if (statut) statut.innerText = "✅ Tes résultats ont été envoyés au prof.";
        })
        .catch(() => {
            mettreEnAttente(donnees);
            if (statut) statut.innerText = "📶 Pas de connexion : tes résultats partiront tout seuls à la prochaine ouverture de l'app.";
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
    if (!quizEnCours) return;
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
        notif.innerHTML = `🚀 Ravi de te revoir ${prenom}, on reprend ton entraînement !`;
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
