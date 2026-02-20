// ==========================================
// 1. ÉTAT DU JEU
// ==========================================
let questionsReussies = JSON.parse(localStorage.getItem('quiz_reussies')) || [];
let questionsAffichees = [];
let indexQuestion = 0;
let score = 0;
let timerGlobal = 0;
let intervalTimer;

// ==========================================
// 2. BASE DE DONNÉES
// ==========================================
const questions = {
       seconde: [
        // --- SÉCURITÉ & HSE ---
        { q: "SÉCURITÉ : Que signifie un pictogramme rouge avec une flamme ?", a: ["inflammable", "feu", "brule"], r: "Produit inflammable (ex: acétone, résine)." },
        { q: "SÉCURITÉ : Quel équipement protège les yeux contre les projections ?", a: ["lunettes", "visiere", "masque"], r: "Lunettes de sécurité." },
        { q: "SÉCURITÉ : Que signifie le sigle EPI ?", a: ["protection individuelle", "equipement de protection"], r: "Équipement de Protection Individuelle." },
        { q: "SÉCURITÉ : Que signifie un pictogramme avec un buste qui explose ?", a: ["cmr", "sante", "cancer", "poumon", "toxique"], r: "Danger pour la santé à long terme (CMR)." },
        { q: "SÉCURITÉ : Que signifie un pictogramme avec un poisson et un arbre mort ?", a: ["environnement", "pollution", "nature", "poisson"], r: "Danger pour l'environnement." },
        { q: "SÉCURITÉ : Couleur des panneaux d'obligation ?", a: ["bleu"], r: "Bleu." },
        { q: "SÉCURITÉ : Couleur des panneaux d'interdiction ?", a: ["rouge"], r: "Rouge et blanc." },
        { q: "SÉCURITÉ : Quel type de gants utilise-t-on pour la résine ?", a: ["nitrile", "bleu"], r: "Gants en nitrile." },
        { q: "SÉCURITÉ : Que faire en cas de projection de résine dans les yeux ?", a: ["rincer", "eau", "douche", "laver"], r: "Rincer abondamment à l'eau (douche oculaire)." },
        { q: "SÉCURITÉ : Où trouver les dangers d'un produit chimique ?", a: ["fds", "etiquette", "fiche", "donnees"], r: "Sur la Fiche de Données de Sécurité (FDS)." },
        { q: "SÉCURITÉ : Peut-on utiliser de l'acétone pour se nettoyer les mains ?", a: ["non", "interdit", "pas"], r: "Non, c'est toxique pour le sang et la peau." },
        { q: "SÉCURITÉ : Que signifie le pictogramme avec un point d'exclamation ?", a: ["irritant", "nocif", "danger", "attention"], r: "Produit irritant ou nocif." },
        { q: "HSE : Pourquoi faut-1l ventiler l'atelier composite ?", a: ["vapeurs", "styrene", "odeur", "air", "respirer", "gaz"], r: "Pour évacuer les vapeurs toxiques (styrène)." },
        { q: "SÉCURITÉ : Pourquoi attacher ses cheveux longs en atelier ?", a: ["happe", "colle", "machine", "attrape", "tourner"], r: "Pour éviter qu'ils soient happés ou collés." },
        { q: "SÉCURITÉ : Quel est le risque principal de l'acétone ?", a: ["incendie", "inflammable", "feu", "explosion"], r: "Elle est extrêmement inflammable." },
        { q: "HSE : Où jette-t-on les chiffons souillés de résine ?", a: ["dangereux", "specifique", "poubelle rouge", "bac"], r: "Dans le bac des déchets dangereux." },
        { q: "SÉCURITÉ : Que signifie le sigle EPC ?", a: ["protection collective", "aspiration", "ventilation"], r: "Équipement de Protection Collective (ex: aspiration)." },
        { q: "SÉCURITÉ : Quel masque porter pour poncer du composite ?", a: ["poussiere", "p2", "p3", "blanc", "fpp"], r: "Un masque anti-poussières (P2 ou P3)." },
        { q: "HSE : Pourquoi ne jamais manger dans l'atelier ?", a: ["ingestion", "contamination", "toxique", "manger", "avaler", "produit"], r: "Pour éviter d'ingérer des produits chimiques." },
        { q: "SÉCURITÉ : Que signifie le sigle VLEP ?", a: ["exposition", "limite", "valeur", "pro", "travail"], r: "Valeur Limite d'Exposition Professionnelle." },

        // --- CALCULS (Réponses numériques + unités si l'élève les met) ---
        { q: "CALCUL : 1 kg de résine dosée à 2% de catalyseur. Masse de catalyseur en grammes ?", a: ["20"], r: "20g (1000 * 0,02)." },
        { q: "CALCUL : 400g de résine dosée à 3% de catalyseur. Masse de catalyseur ?", a: ["12"], r: "12g (400 * 0,03)." },
        { q: "CALCUL : 2,5 kg de résine dosée à 1% de catalyseur. Masse de catalyseur en grammes ?", a: ["25"], r: "25g (2500 * 0,01)." },
        { q: "MESURE : Une règle mesure 30 cm. Quelle est sa valeur en millimètres ?", a: ["300"], r: "300 mm." },
        { q: "MESURE : Un échantillon pèse 0,05 kg. Combien de grammes cela fait-il ?", a: ["50"], r: "50g." },
        { q: "CALCUL : Un pot de 200g de gel-coat dosé à 2%. Masse de catalyseur ?", a: ["4"], r: "4g." },

        // --- MATÉRIAUX : POLYMÈRES ---
        { q: "MATÉRIAUX : Famille de plastiques qui ramollissent à la chaleur ?", a: ["thermoplastique", "tp", "fond", "mou"], r: "Les thermoplastiques." },
        { q: "MATÉRIAUX : Famille de résine qui durcit de façon irréversible ?", a: ["thermodurcissable", "td", "durcit", "cuit"], r: "Les thermodurcissables." },
        { q: "MATÉRIAUX : Quel est le sigle du Polypropylène ?", a: ["pp"], r: "Le PP." },
        { q: "MATÉRIAUX : Quel est le sigle du Polyéthylène ?", a: ["pe"], r: "Le PE." },
        { q: "MATÉRIAUX : Quel est le sigle du Polychlorure de Vinyle ?", a: ["pvc"], r: "Le PVC." },
        { q: "MATÉRIAUX : Quel est le sigle du Polystyrène ?", a: ["ps"], r: "Le PS." },
        { q: "MATÉRIAUX : Quel polymère est utilisé pour les bouteilles d'eau ?", a: ["pet", "polyethylene"], r: "Le PET." },
        { q: "MATÉRIAUX : Sous quelle forme reçoit-on la matière thermoplastique ?", a: ["granules", "billes", "grains", "petits"], r: "En granulés." },
        { q: "MATÉRIAUX : Quel est l'avantage des thermoplastiques pour l'écologie ?", a: ["recyclable", "refondre", "cycle", "ecolo"], r: "Ils sont recyclables (on peut les refondre)." },
        { q: "MATÉRIAUX : Comment appelle-t-on l'ajout de couleur dans le plastique ?", a: ["melange maitre", "colorant", "pigment", "couleur"], r: "Le mélange maître (ou colorant)." },
        { q: "MATÉRIAUX : Quelle résine est la plus utilisée en moulage au contact ?", a: ["polyester"], r: "La résine Polyester." },
        { q: "MATÉRIAUX : Quel plastique est souvent transparent (type Plexiglas) ?", a: ["pmma", "metacrylate"], r: "Le PMMA." },
        { q: "MATÉRIAUX : Quel sigle désigne le Polyéthylène Haute Densité ?", a: ["pehd"], r: "Le PEHD." },
        { q: "MATÉRIAUX : Quelle est la propriété d'un isolant électrique ?", a: ["conduit pas", "bloque", "courant", "electricite"], r: "Il ne laisse pas passer le courant." },
        { q: "MATÉRIAUX : Un matériau qui résiste aux chocs est dit...", a: ["tenace", "resilient", "solide", "choc"], r: "Tenace (ou résilient)." },
        { q: "MATÉRIAUX : Un matériau qui se casse sans se déformer est...", a: ["fragile", "cassant"], r: "Fragile." },
        { q: "MATÉRIAUX : Comment appelle-t-on la température de fusion ?", a: ["fond", "liquide", "fusion", "chaleur"], r: "La température où le solide devient liquide." },
        { q: "MATÉRIAUX : Quelle matière sent le styrène à l'état liquide ?", a: ["polyester", "resine"], r: "Le Polyester." },
        { q: "MATÉRIAUX : Qu'est-ce qu'un élastomère ?", a: ["caoutchouc", "elastique", "pneu"], r: "Un matériau élastique (type caoutchouc)." },
        { q: "MATÉRIAUX : Que signifie 'hygroscopique' ?", a: ["humidite", "eau", "absorbe", "boit", "air"], r: "Qui absorbe l'humidité de l'air." },
        { q: "MATÉRIAUX : Unité de la masse volumique ?", a: ["g/cm3", "kg/m3", "densite"], r: "g/cm³ ou kg/m³." },
        { q: "MATÉRIAUX : Lequel est le plus léger : l'acier ou le plastique ?", a: ["plastique", "pvc", "pe"], r: "Le plastique (densité plus faible)." },
        { q: "MATÉRIAUX : Qu'est-ce qu'une résine époxy ?", a: ["thermodurcissable", "td", "epoxy", "colle"], r: "Une résine thermodurcissable haute performance." },
        { q: "MATÉRIAUX : Pourquoi sèche-t-on certaines matières avant usage ?", a: ["humidite", "eau", "defaut", "bulles", "etuve"], r: "Pour enlever l'humidité qui crée des défauts." },
        { q: "MATÉRIAUX : Qu'est-ce qu'un additif ?", a: ["ameliorer", "ajouter", "plus", "uv", "aide"], r: "Un produit ajouté pour améliorer une propriété (ex: anti-UV)." }
    ],
premiere: [
        // --- INJECTION PLASTURGIE ---
        { q: "INJECTION : Comment appelle-t-on la vis qui pousse la matière ?", a: ["vis", "plastification", "vis d'injection", "vis de plastification"], r: "La vis de plastification." },
        { q: "INJECTION : Quel organe chauffe les granulés dans le fourreau ?", a: ["colliers", "chauffant", "resistances", "chauffage"], r: "Les colliers chauffants." },
        { q: "INJECTION : Nom de la partie où l'on verse les granulés ?", a: ["tremie", "bac", "entonnoir"], r: "La trémie." },
        { q: "INJECTION : Qu'est-ce que le point de commutation ?", a: ["passage", "pression", "bascule", "commutation"], r: "Le passage de l'injection à la pression de maintien." },
        { q: "INJECTION : À quoi sert la pression de maintien ?", a: ["retrait", "remplir", "compactage", "pression", "finir"], r: "À compenser le retrait de la matière en refroidissant." },
        { q: "INJECTION : Comment appelle-t-on le temps de refroidissement ?", a: ["refroidissement", "refroidir", "froid", "solidifier"], r: "Le temps nécessaire pour que la pièce se solidifie." },
        { q: "INJECTION : Qu'est-ce qu'une carotte d'injection ?", a: ["dechet", "canal", "carotte", "alimentation"], r: "La matière solidifiée dans le canal d'alimentation." },
        { q: "INJECTION : Comment s'appelle l'opération de sortir la pièce du moule ?", a: ["ejection", "sortir", "demoulage", "ejecter"], r: "L'éjection." },
        { q: "INJECTION : Quel défaut crée un manque de matière ?", a: ["incomplete", "manque", "pas finie", "vide"], r: "Une pièce incomplète." },
        { q: "INJECTION : Qu'est-ce qu'une bavure ?", a: ["fuite", "joint", "deborde", "bavure", "surplus"], r: "De la matière qui s'échappe au plan de joint." },
        { q: "INJECTION : Pourquoi faut-il étuver certaines matières ?", a: ["humidite", "bulle", "eau", "etuve", "secher"], r: "Pour enlever l'humidité (éviter les bulles/traces)." },
        { q: "INJECTION : Qu'est-ce que la dose (ou course de dosage) ?", a: ["volume", "quantite", "dose", "course", "dosage"], r: "La quantité de matière préparée pour un cycle." },
        { q: "INJECTION : À quoi sert le clapet en bout de vis ?", a: ["retour", "anti-retour", "clapet", "bloquer"], r: "À empêcher la matière de remonter pendant l'injection." },
        { q: "INJECTION : Comment appelle-t-on la partie mobile de la presse ?", a: ["plateau mobile", "partie mobile", "cote mobile"], r: "Le plateau mobile." },
        { q: "INJECTION : Force nécessaire pour tenir le moule fermé ?", a: ["force de verrouillage", "fermeture", "verrouillage", "pression"], r: "La force de verrouillage." },
        { q: "INJECTION : Qu'est-ce qu'un canal chaud ?", a: ["pas de carotte", "chauffe", "liquide", "canal chaud"], r: "Un système qui garde la matière liquide dans le moule (pas de carotte)." },
        { q: "INJECTION : Quel est le rôle des éjecteurs ?", a: ["pousser", "sortir", "ejecter", "virer"], r: "Pousser la pièce hors de l'empreinte." },
        { q: "INJECTION : Qu'est-ce que le temps de cycle ?", a: ["total", "duree", "cadence", "temps", "cycle"], r: "Le temps total pour fabriquer une pièce." },
        { q: "INJECTION : Pourquoi lubrifier les colonnes de la presse ?", a: ["frottement", "usure", "graisser", "glisser", "huile"], r: "Pour limiter l'usure et faciliter le mouvement." },
        { q: "INJECTION : Qu'est-ce qu'une trace d'infusion (en injection) ?", a: ["aspect", "brulure", "noir", "brun", "crame"], r: "Une trace brune souvent due à un excès de chaleur." },
        { q: "INJECTION : Rôle du régulateur thermique ?", a: ["temperature", "moule", "eau", "chauffer", "refroidir"], r: "Maintenir le moule à une température stable." },
        { q: "INJECTION : Qu'est-ce que le matelas de sécurité ?", a: ["reserve", "fin de vis", "matelas", "securite"], r: "La matière restant en bout de vis après injection." },
        { q: "INJECTION : Quel sigle désigne le Polycarbonate ?", a: ["pc"], r: "Le PC." },
        { q: "INJECTION : Quel sigle désigne l'Acrylonitrile Butadiène Styrène ?", a: ["abs"], r: "L'ABS." },
        { q: "INJECTION : Qu'est-ce que la plastification ?", a: ["fondre", "malaxer", "plastifier", "fondue"], r: "L'action de fondre et malaxer la matière." },
        { q: "INJECTION : Pourquoi purger le fourreau ?", a: ["nettoyer", "changement", "purger", "propre", "couleur"], r: "Pour changer de matière ou de couleur sans pollution." },
        { q: "INJECTION : Quel est le risque d'une température trop haute ?", a: ["degradation", "brulure", "gaz", "cramer", "abimer"], r: "La dégradation thermique de la matière." },
        { q: "INJECTION : À quoi servent les évents dans l'empreinte ?", a: ["air", "gaz", "vide", "evacuer", "event"], r: "À évacuer l'air comprimé par l'arrivée du plastique." },
        { q: "INJECTION : Qu'est-ce qu'un moule multi-empreintes ?", a: ["plusieurs", "pieces", "empreintes", "multi"], r: "Un moule qui produit plusieurs pièces par cycle." },
        { q: "INJECTION : Pourquoi utiliser un robot sur une presse ?", a: ["cadence", "securite", "manipulation", "automatique", "prendre"], r: "Pour automatiser la sortie des pièces." },

        // --- CALCULS PREMIÈRE ---
        { q: "COMPOSITES : Une pièce de 4 m² avec un tissu de 200 g/m². Poids total de fibre ?", a: ["800"], r: "800g (4 * 200)." },
        { q: "COMPOSITES : Une pièce de 0,5 m² avec un mat de 450 g/m². Poids total de fibre ?", a: ["225"], r: "225g (0,5 * 450)." },
        { q: "PROD : Une presse produit 4 pièces par cycle. Le cycle dure 30s. Combien de pièces en 1 minute ?", a: ["8"], r: "8 pièces." },
        { q: "INJECTION : Une pièce pèse 45g et la carotte 5g. Quel est le poids total injecté ?", a: ["50"], r: "50g." },
        { q: "CALCUL : Un moule rectangulaire fait 1,5m de long et 2m de large. Quelle est sa surface ?", a: ["3"], r: "3 m²." },
        { q: "COMPOSITES : On a 500g de fibre. On veut un taux de résine de 50%. Quelle masse de résine faut-il ?", a: ["500"], r: "500g (autant de résine que de fibre)." },

        // --- COMPOSITES : INFUSION & RTM ---
        { q: "INFUSION : Quel est le rôle de la pompe à vide ?", a: ["aspiration", "vide", "pompe", "aspirer"], r: "Créer une dépression pour aspirer la résine." },
        { q: "INFUSION : À quoi sert le filet drainant ?", a: ["diffuser", "vitesse", "filet", "circuler", "drainant"], r: "À faciliter la circulation de la résine sur toute la surface." },
        { q: "INFUSION : Pourquoi utilise-t-on un sac à vide ?", a: ["etancheite", "pression", "sac", "etanche", "vide"], r: "Pour créer une zone étanche et utiliser la pression atmosphérique." },
        { q: "INFUSION : Qu'est-ce que le 'piège à résine' ?", a: ["protection", "pompe", "piege", "bocal", "trop-plein"], r: "Un bocal qui récupère le trop-plein pour protéger la pompe." },
        { q: "INFUSION : Qu'est-ce que le front de résine ?", a: ["avancee", "front", "progression", "limite"], r: "La limite visible de progression de la résine dans les fibres." },
        { q: "INFUSION : Rôle de la bride de vide ?", a: ["connecter", "tuyau", "bride", "vide", "raccord"], r: "Relier le tuyau de vide au sac étanche." },
        { q: "INFUSION : Pourquoi faire un test de vide (drop test) ?", a: ["fuite", "etancheite", "test", "air", "vide"], r: "Pour vérifier qu'il n'y a aucune entrée d'air avant d'injecter." },
        { q: "INFUSION : Quel est l'avantage de l'infusion sur le contact ?", a: ["sante", "vapeurs", "poids", "bulles", "odeur", "qualite"], r: "Moins de vapeurs toxiques et meilleur ratio fibre/résine." },
        { q: "COMPOSITES : Qu'est-ce que la polymérisation ?", a: ["durcir", "reaction", "cuisson", "polymeriser", "solide"], r: "La réaction chimique qui durcit la résine." },
        { q: "RTM : Quelle est la différence majeure avec l'infusion ?", a: ["moule ferme", "contre-moule", "rigide", "deux faces"], r: "On utilise un contre-moule rigide au lieu d'un sac souple." },
        { q: "COMPOSITES : Qu'est-ce que le Tg (Température de transition vitreuse) ?", a: ["ramollissement", "mou", "transition", "chaleur"], r: "La température où le composite commence à se ramollir." },
        { q: "INFUSION : À quoi sert le peel-ply ?", a: ["arrachage", "collage", "tissu", "propre", "peel"], r: "Tissu d'arrachage pour laisser une surface rugueuse et propre." },
        { q: "INFUSION : Qu'est-ce qu'un drain oméga ?", a: ["profilé", "resine", "omega", "canal", "amenee"], r: "Un canal qui distribue la résine rapidement sur de grandes longueurs." },
        { q: "INFUSION : Quel est le rôle du film perforé ?", a: ["separation", "resine", "perfore", "trous", "laisser passer"], r: "Permettre à l'excès de résine d'aller vers le drain." },
        { q: "COMPOSITES : Pourquoi étuver une pièce après démoulage ?", a: ["post-cuisson", "cuisson", "four", "etuve", "solidite"], r: "Pour terminer la polymérisation et augmenter la résistance (post-cuisson)." },
        { q: "COMPOSITES : Qu'est-ce qu'une âme en mousse ?", a: ["sandwich", "leger", "mousse", "ame", "pvc", "pet"], r: "Un matériau léger placé entre deux peaux (ex: PVC, PET)." },
        { q: "INFUSION : Comment appelle-t-on le tuyau qui amène la résine ?", a: ["ligne d injection", "amenee", "tuyau", "entree"], r: "La ligne d'injection." },
        { q: "INFUSION : Comment appelle-t-on le tuyau relié à la pompe ?", a: ["ligne de vide", "aspiration", "vide", "sortie"], r: "La ligne de vide." },
        { q: "COMPOSITES : Risque d'une infusion trop rapide ?", a: ["bulles", "zones seches", "air", "vite", "manque"], r: "Emprisonner de l'air avant que les fibres ne soient mouillées." },
        { q: "COMPOSITES : Pourquoi utiliser du balsa en sandwich ?", a: ["compression", "leger", "bois", "balsa", "sandwich"], r: "Pour sa grande résistance à la compression et sa légèreté." },
        { q: "COMPOSITES : Qu'est-ce que le 'pontage' en mise sous vide ?", a: ["vide", "angle", "pontage", "pont", "air"], r: "Quand le sac ne touche pas le fond d'un angle (risque de casse)." },
        { q: "COMPOSITES : Comment vérifier l'étanchéité ?", a: ["vacuometre", "vide", "mesure", "aiguille"], r: "Avec un vacuomètre (mesure de la dépression)." },
        { q: "COMPOSITES : Quelle résine utilise-t-on souvent en infusion ?", a: ["epoxy", "vinylester", "liquide", "fluide"], r: "L'époxy ou la vinylester (faible viscosité)." },
        { q: "COMPOSITES : Qu'est-ce que la viscosité ?", a: ["fluidite", "epais", "viscosite", "coulant", "miel"], r: "La résistance à l'écoulement d'un liquide (ex: miel = visqueux)." },
        { q: "COMPOSITES : Pourquoi la viscosité est importante en infusion ?", a: ["vitesse", "impregner", "circuler", "coule"], r: "La résine doit être fluide pour bien circuler dans les fibres." },
        { q: "RTM : Pourquoi injecter sous pression ?", a: ["rapidite", "cadence", "vite", "pression"], r: "Pour remplir le moule fermé beaucoup plus vite." },
        { q: "COMPOSITES : Qu'est-ce un renfort multi-axial ?", a: ["plusieurs sens", "directions", "tissu", "biaxial"], r: "Un tissu avec des fibres orientées dans plusieurs directions cousues ensemble." },
        { q: "COMPOSITES : Pourquoi le carbone coûte-t-il plus cher ?", a: ["fabrication", "performance", "cher", "energie"], r: "Sa fabrication est complexe et énergivore." },
        { q: "INFUSION : Que faire si le sac se perce pendant l'aspiration ?", a: ["mastic", "coller", "boucher", "joint", "fuite"], r: "Rechercher la fuite et boucher avec du mastic (joint)." },
        { q: "COMPOSITES : Qu'est-ce qu'une pièce 'monolithique' ?", a: ["pas de sandwich", "fibres", "seul", "couches"], r: "Une pièce composée uniquement de couches de fibres (pas d'âme)." },

        // --- MAINTENANCE & QUALITÉ ---
        { q: "MAINTENANCE : Qu'est-ce que la maintenance préventive ?", a: ["anticiper", "entretien", "avant", "eviter"], r: "Intervenir avant la panne pour l'éviter." },
        { q: "MAINTENANCE : Qu'est-ce que la maintenance curative ?", a: ["panne", "reparer", "apres", "casse", "mort"], r: "Réparer une machine qui est déjà tombée en panne." },
        { q: "QUALITÉ : Quel outil mesure au 100ème de millimètre (0,01) ?", a: ["palmer", "micrometre", "0.01"], r: "Le micromètre (Palmer)." },
        { q: "QUALITÉ : À quoi sert une pige ?", a: ["trou", "diametre", "verifier", "pige", "calibre"], r: "À vérifier le diamètre d'un trou." },
        { q: "MAINTENANCE : Pourquoi nettoyer les moules régulièrement ?", a: ["vie", "aspect", "encrassement", "propre", "brillance"], r: "Pour prolonger leur vie et garantir un bon aspect de pièce." },
        { q: "MAINTENANCE : Que signifie graisser un palier ?", a: ["frottement", "huile", "graisse", "glisser"], r: "Réduire les frottements pour éviter la chauffe et l'usure." },
        { q: "QUALITÉ : Qu'est-ce qu'un certificat de conformité ?", a: ["preuve", "papier", "ok", "conforme", "certificat"], r: "Un document qui prouve que la pièce respecte le plan." },
        { q: "QUALITÉ : À quoi sert un comparateur ?", a: ["ecart", "mesurer", "forme", "comparer"], r: "À mesurer des petits écarts de forme ou de position." },
        { q: "MAINTENANCE : Qu'est-ce qu'un capteur ?", a: ["information", "detecter", "capteur", "signal", "info"], r: "Un composant qui envoie une info à la machine (ex: température)." },
        { q: "MAINTENANCE : Pourquoi vérifier le niveau d'huile ?", a: ["lubrification", "casse", "huile", "graissage"], r: "Pour éviter que la pompe ou le moteur ne serre." },
        { q: "QUALITÉ : Qu'est-ce qu'une tolérance sur un plan ?", a: ["marge", "erreur", "plus ou moins", "ecart", "tolerance"], r: "L'écart maximal autorisé sur une dimension." },
        { q: "MAINTENANCE : À quoi sert un disjoncteur ?", a: ["securite electrique", "couper", "courant", "protection"], r: "À protéger le circuit électrique en cas de surchauffe." },
        { q: "QUALITÉ : Comment appelle-t-on le premier échantillon produit ?", a: ["eprouvette", "tete de serie", "premier", "prototype"], r: "La tête de série ou échantillon initial." },
        { q: "MAINTENANCE : Que signifie purger un circuit pneumatique ?", a: ["eau", "air", "purger", "vider", "condensat"], r: "Enlever l'eau de condensation dans les tuyaux." },
        { q: "QUALITÉ : Qu'est-ce que la rugosité ?", a: ["etat de surface", "lisse", "rugueux", "rugosite", "grain"], r: "Le niveau de 'rugosité' ou de lissage d'une surface." },
        { q: "MAINTENANCE : Pourquoi changer les filtres à air ?", a: ["debit", "propre", "air", "filtre", "poussiere"], r: "Pour assurer un bon refroidissement et une air propre." },
        { q: "QUALITÉ : Quel est le rôle d'un calibre 'Entre/N'entre pas' ?", a: ["trier", "verifier", "rapide", "controle", "calibre"], r: "Vérifier très vite si une dimension est dans la tolérance." },
        { q: "MAINTENANCE : Qui peut intervenir sur l'électricité ?", a: ["habilite", "electricien", "pro", "autorise"], r: "Une personne ayant l'habilitation électrique." },
        { q: "QUALITÉ : Pourquoi archiver les fiches de suivi ?", a: ["tracabilite", "suivi", "preuve", "archives", "savoir"], r: "Pour la traçabilité (savoir quand et comment a été faite la pièce)." },
        { q: "MAINTENANCE : Quel outil pour serrer au bon couple ?", a: ["cle dynamometrique", "couple", "serrage", "cle"], r: "La clé dynamométrique." },

        // --- LECTURE DE PLAN & DESSIN ---
        { q: "PLAN : Que signifie un trait interrompu court ?", a: ["cache", "invisible", "derriere", "pointille"], r: "Une arête ou un contour caché." },
        { q: "PLAN : Que représente un trait mixte fin (pointillé long/court) ?", a: ["axe", "milieu", "symetrie"], r: "Un axe de symétrie ou de révolution." },
        { q: "PLAN : Qu'est-ce qu'une vue en coupe ?", a: ["interieur", "dedans", "couper", "coupe", "tranche"], r: "Une vue qui montre l'intérieur de la pièce." },
        { q: "PLAN : À quoi sert l'échelle ?", a: ["taille", "proportion", "agrandir", "reduire", "echelle"], r: "À connaître le rapport entre le dessin et la réalité." },
        { q: "PLAN : Où trouve-t-on le nom de la pièce et la matière ?", a: ["cartouche", "bas", "tableau", "infos"], r: "Dans le cartouche (en bas du plan)." },
        { q: "PLAN : Qu'est-ce qu'une nomenclature ?", a: ["liste", "pieces", "tableau", "composants"], r: "La liste de tous les composants d'un ensemble." },
        { q: "PLAN : Que signifie le symbole 'Ø' ?", a: ["diametre", "rond", "cercle"], r: "Le diamètre." },
        { q: "PLAN : Qu'est-ce qu'une cotation ?", a: ["dimensions", "chiffres", "cotes", "mesures"], r: "L'ensemble des chiffres indiquant les dimensions." },
        { q: "PLAN : À quoi servent les hachures ?", a: ["coupe", "matiere", "hachures", "zone"], r: "À indiquer une zone coupée." },
        { q: "PLAN : Qu'est-ce qu'une vue de face ?", a: ["devant", "face", "avant"], r: "La vue principale montrant l'avant de l'objet." },
        { q: "PLAN : Dans quel sens projette-t-on les vues en France ?", a: ["europeen", "europe", "france"], r: "Le système européen." },
        { q: "PLAN : Que signifie 'R5' sur un dessin ?", a: ["rayon", "arrondi"], r: "Un rayon de 5 mm." },
        { q: "PLAN : À quoi sert un schéma cinématique ?", a: ["mouvement", "bouge", "mecanisme", "liaisons"], r: "À comprendre comment bouge le mécanisme." },
        { q: "PLAN : Qu'est-ce qu'un éclaté ?", a: ["montage", "demonte", "eclate", "vue"], r: "Une vue montrant les pièces séparées pour le montage." },
        { q: "PLAN : Que signifie une tolérance ±0.1 ?", a: ["precision", "marge", "ecart", "plus ou moins"], r: "La cote peut varier de 0,1 mm en plus ou en moins." },
        { q: "PLAN : Comment indique-t-on un filetage ?", a: ["trait fin", "filetage", "vis"], r: "Par un trait fin interrompu ou un cercle partiel." },
        { q: "PLAN : Qu'est-ce qu'une projection orthogonale ?", a: ["vues", "faces", "projection", "dessin"], r: "La représentation de l'objet sur plusieurs plans (face, dessus...)." },
        { q: "PLAN : Pourquoi le cartouche contient-il un indice de révision ?", a: ["modification", "version", "changement", "maj"], r: "Pour savoir si c'est la version la plus récente du plan." },
        { q: "PLAN : Que signifie 'Echelle 2:1' ?", a: ["agrandi", "double", "plus grand"], r: "Le dessin est deux fois plus grand que la réalité." },
        { q: "PLAN : Quel outil informatique utilise-t-on pour dessiner ?", a: ["cao", "dao", "ordinateur", "logiciel", "solidworks"], r: "La CAO (Conception Assistée par Ordinateur)." }
],
    terminale: [
        // --- RHÉOLOGIE ET RÉGLAGE AVANCÉ ---
        { q: "RHÉOLOGIE : Qu'est-ce que la viscosité apparente ?", a: ["ecoulement", "vitesse", "epais", "fluide", "resistance"], r: "La résistance à l'écoulement sous une contrainte donnée." },
        { q: "INJECTION : À quoi sert l'étude de remplissage (Moldflow) ?", a: ["simuler", "equilibrer", "defauts", "flux", "logiciel", "remplissage"], r: "À simuler l'injection pour éviter les défauts avant de fabriquer le moule." },
        { q: "RHÉOLOGIE : Qu'est-ce qu'un fluide pseudoplastique ?", a: ["viscosite baisse", "vitesse", "cisaillement", "fluide"], r: "Un fluide dont la viscosité diminue quand la vitesse d'écoulement augmente." },
        { q: "RÉGLAGE : Quel est l'effet d'une contre-pression trop élevée ?", a: ["degradation", "chauffe", "cisaillement", "casse", "trop"], r: "Augmentation du cisaillement et risque de dégradation de la matière." },
        { q: "RÉGLAGE : Pourquoi limiter la vitesse de rotation de vis ?", a: ["brulure", "cisaillement", "echauffement", "cramer", "abimer"], r: "Pour éviter de brûler la matière par frottement excessif." },
        { q: "INJECTION : Qu'est-ce que le volume d'injection ?", a: ["surface", "course", "volume", "quantite"], r: "C'est la section de la vis multipliée par la course d'injection." },
        { q: "RHÉOLOGIE : Qu'est-ce que l'indice de fluidité (MFI) ?", a: ["debit", "ecoulement", "mfi", "fluide", "indice"], r: "La quantité de matière qui s'écoule à travers une filière normalisée en 10 min." },
        { q: "RÉGLAGE : Comment corriger une pièce qui présente des retassures ?", a: ["maintien", "pression", "temps", "augmenter", "plus"], r: "Augmenter la pression ou le temps de maintien." },
        { q: "RÉGLAGE : Comment corriger des bavures ?", a: ["verrouillage", "fermeture", "moins", "pression", "baisser"], r: "Augmenter la force de verrouillage ou baisser la pression d'injection." },
        { q: "RHÉOLOGIE : Quel est l'impact de la température sur la viscosité ?", a: ["baisse", "fluide", "coule mieux", "moins"], r: "Plus la température monte, plus la viscosité baisse (le plastique devient plus fluide)." },
        { q: "INJECTION : Qu'est-ce qu'un cisaillement ?", a: ["frottement", "vitesse", "cisaille", "parois"], r: "Le frottement des molécules entre elles ou contre les parois." },
        { q: "RÉGLAGE : Qu'est-ce que la décompression (suçage) ?", a: ["recule", "vis", "bave", "sucage", "aspiration"], r: "Le léger recul de la vis après dosage pour éviter que la buse ne bave." },
        { q: "INJECTION : À quoi sert un clapet à bille par rapport à un clapet à bague ?", a: ["etancheite", "precis", "dosage", "bille"], r: "À assurer une meilleure étanchéité pour les petites doses." },
        { q: "RÉGLAGE : Pourquoi stabiliser le temps de dosage ?", a: ["homogene", "cycle", "regulier", "fondue"], r: "Pour garantir que chaque dose est fondue de la même manière." },
        { q: "RHÉOLOGIE : Qu'est-ce que le retrait moule ?", a: ["diminution", "taille", "retrait", "retrecit"], r: "La réduction des dimensions de la pièce par rapport au moule après refroidissement." },
        { q: "INJECTION : Qu'est-ce qu'un moule à tiroirs ?", a: ["contre-depouille", "mobile", "tiroir", "complexe"], r: "Un moule avec des parties mobiles pour démouler des formes complexes." },
        { q: "RHÉOLOGIE : Quel plastique a le plus fort retrait : PE ou PC ?", a: ["pe"], r: "Le PE (semi-cristallin)." },
        { q: "INJECTION : Qu'est-ce qu'un polymère semi-cristallin ?", a: ["organise", "opaque", "cristaux", "structure"], r: "Un polymère dont les chaînes s'organisent en cristaux au refroidissement." },
        { q: "INJECTION : Qu'est-ce qu'un polymère amorphe ?", a: ["desordre", "transparent", "vitreux"], r: "Un polymère dont les chaînes restent en désordre (souvent transparent)." },
        { q: "RÉGLAGE : Qu'est-ce que la pression de commutation ?", a: ["pic", "fin injection", "bascule", "passage"], r: "La pression atteinte au moment où l'on passe en maintien." },
        { q: "INJECTION : Quel est le rôle d'une buse obturable ?", a: ["fermer", "pression", "obturateur", "boucher"], r: "Empêcher la matière de sortir pendant le dosage ou la décompression." },
        { q: "INJECTION : Pourquoi utiliser des isolants sur les plateaux ?", a: ["chaleur", "moule", "perte", "isolation"], r: "Pour éviter que la chaleur du moule ne se perde dans la presse." },
        { q: "RHÉOLOGIE : Qu'est-ce que la cristallinité ?", a: ["taux", "cristaux", "pourcentage", "organisation"], r: "Le pourcentage de zones organisées dans un polymère semi-cristallin." },
        { q: "INJECTION : Qu'est-ce que l'effet Diesel ?", a: ["brulure", "air", "inflammation", "noir", "explosion"], r: "L'inflammation de l'air comprimé dans une zone mal ventilée du moule." },
        { q: "RÉGLAGE : Influence d'un refroidissement trop court ?", a: ["deformation", "dimensions", "chaud", "mou"], r: "La pièce se déforme car elle est encore trop molle au démoulage." },
        { q: "INJECTION : Comment détecter une fuite au clapet ?", a: ["matelas", "recul", "diminue", "clapet"], r: "Si le matelas diminue anormalement pendant le maintien." },
        { q: "RHÉOLOGIE : Quel est l'impact de l'humidité sur le Polyamide (PA) ?", a: ["dimensions", "souplesse", "eau", "absorbe"], r: "Il absorbe l'eau, ce qui change ses dimensions et sa souplesse." },
        { q: "RÉGLAGE : À quoi sert le profil de vitesse d'injection ?", a: ["remplissage", "jets", "vitesse", "brulure"], r: "À optimiser le remplissage et éviter les jets de matière ou les brûlures." },
        { q: "INJECTION : Qu'est-ce qu'une ligne de soudure ?", a: ["jonction", "flux", "rencontre", "marque"], r: "L'endroit où deux fronts de matière se rejoignent." },
        { q: "RÉGLAGE : Pourquoi chauffer le moule au-delà de 100°C pour certains plastiques ?", a: ["cristallisation", "aspect", "peek", "pps", "chaud"], r: "Pour permettre une bonne cristallisation (ex: PEEK, PPS)." },

        // --- COMPOSITES HAUTES PERFORMANCES ---
        { q: "COMPOSITES : Qu'est-ce que l'autoclave ?", a: ["pression", "chaleur", "four", "cuve"], r: "Un four sous pression utilisé pour compacter les pièces aéronautiques." },
        { q: "COMPOSITES : Avantage du nid d'abeille (Nomex) ?", a: ["poids", "raideur", "leger", "sandwich", "alveole"], r: "Extrêmement léger et très rigide en compression." },
        { q: "COMPOSITES : Pourquoi utiliser de la fibre de carbone HR ?", a: ["haute resistance", "solide", "rupture", "hr"], r: "Pour obtenir une résistance à la rupture maximale." },
        { q: "COMPOSITES : Pourquoi utiliser de la fibre de carbone HM ?", a: ["haut module", "rigide", "elasticite", "hm"], r: "Pour obtenir une rigidité (module d'élasticité) maximale." },
        { q: "COMPOSITES : Qu'est-ce que la post-cuisson ?", a: ["stabiliser", "tg", "chauffe", "cuisson"], r: "Une chauffe prolongée pour stabiliser les propriétés de la résine." },
        { q: "COMPOSITES : Qu'est-ce qu'un drapage robotisé (AFP) ?", a: ["placement", "automatique", "robot", "ruban"], r: "La pose de rubans de carbone par un bras robotisé." },
        { q: "COMPOSITES : Pourquoi contrôler le taux de vide ?", a: ["porosite", "bulles", "air", "vide"], r: "Pour garantir qu'il n'y a aucune micro-bulle affaiblissant la pièce." },
        { q: "COMPOSITES : Quel est le rôle du film de protection sur les pré-imprégnés ?", a: ["propre", "colle", "proteger", "separer"], r: "Empêcher les couches de coller entre elles avant le drapage." },
        { q: "COMPOSITES : Pourquoi stocker les pré-imprégnés au congélateur ?", a: ["vie", "reaction", "froid", "congelateur", "stopper"], r: "Pour stopper la réaction chimique de la résine (-18°C)." },
        { q: "COMPOSITES : Qu'est-ce que la vie hors froid ?", a: ["temps", "ambiante", "dehors", "froid"], r: "Le temps maximum autorisé pour un pré-imprégné à température ambiante." },
        { q: "COMPOSITES : À quoi sert une pyramide de vide ?", a: ["drainage", "sac", "air", "pompe"], r: "À assurer un chemin pour l'air vers la pompe sur toute l'épaisseur." },
        { q: "COMPOSITES : Quel est le défaut de 'marche' dans un sandwich ?", a: ["ecrasement", "vide", "glissement", "marche"], r: "Un manque de pression ou un glissement de l'âme pendant la cuisson." },
        { q: "COMPOSITES : Pourquoi chanfreiner les bords d'une âme mousse ?", a: ["progressif", "vide", "pente", "angle"], r: "Pour que les peaux épousent la forme sans créer de vide d'air." },
        { q: "COMPOSITES : Qu'est-ce qu'une résine phénolique ?", a: ["feu", "fumee", "securite", "avion"], r: "Une résine qui résiste très bien au feu et dégage peu de fumées." },
        { q: "COMPOSITES : Qu'est-ce qu'un essai de pelage ?", a: ["collage", "separer", "peaux", "arracher"], r: "Un test pour vérifier la force du collage entre la peau et l'âme." },
        { q: "COMPOSITES : Pourquoi utiliser un laser de projection ?", a: ["placement", "aide", "guide", "laser"], r: "Pour guider l'opérateur sur la position exacte des plis de tissu." },
        { q: "COMPOSITES : Qu'est-ce que le 'springback' ?", a: ["retour", "forme", "ressort", "deformation"], r: "La déformation de la pièce qui s'ouvre ou se ferme après démoulage." },
        { q: "COMPOSITES : Rôle du feutre de drainage (breather) ?", a: ["pompage", "air", "feutre", "drainage", "boire"], r: "Permettre à l'air de circuler partout sous le sac à vide." },
        { q: "COMPOSITES : Qu'est-ce qu'un cycle de cuisson ?", a: ["montee", "palier", "descente", "temperature", "pression"], r: "Le programme de température et pression appliqué à la pièce." },
        { q: "COMPOSITES : Pourquoi contrôler la vitesse de montée en température ?", a: ["homogene", "exothermie", "tensions", "lentement"], r: "Pour éviter les tensions internes ou une réaction chimique trop violente." },
        { q: "COMPOSITES : Qu'est-ce qu'un outillage d'Invar ?", a: ["dilatation", "acier", "alliage", "chaleur"], r: "Un alliage métallique qui ne bouge pas à la chaleur (même dilatation que le carbone)." },
        { q: "COMPOSITES : Comment détecter un défaut interne ?", a: ["ultrasons", "radio", "cnd", "controle", "scanner"], r: "Par contrôle non destructif (CND) comme les ultrasons." },
        { q: "COMPOSITES : Pourquoi utiliser une résine Cyanate Ester ?", a: ["spatial", "temperature", "espace", "stable"], r: "Pour sa très haute tenue en température et sa stabilité dans l'espace." },
        { q: "COMPOSITES : Qu'est-ce qu'un pli de drainage ?", a: ["air", "evacuer", "sortie", "tissu"], r: "Une bande de tissu placée pour aider l'air à sortir de la pièce." },
        { q: "COMPOSITES : Quel est l'intérêt du placement de fibres par rapport au tissage ?", a: ["droites", "performant", "alignees"], r: "Les fibres ne sont pas courbées (pas d'embuitage), donc plus performantes." },
        { q: "COMPOSITES : Qu'est-ce que le taux de fibre en volume (Vf) ?", a: ["pourcentage", "fibre", "volume", "vf"], r: "Le volume réel occupé par les fibres dans la pièce finie." },
        { q: "COMPOSITES : Pourquoi le compactage intermédiaire est-il nécessaire ?", a: ["epaisseur", "air", "plier", "compactage"], r: "Pour enlever l'air entre les plis au fur et à mesure du drapage." },
        { q: "COMPOSITES : Qu'est-ce qu'une résine BMI ?", a: ["haute temperature", "bmi", "200"], r: "Une résine pour des usages à plus de 200°C." },
        { q: "COMPOSITES : Rôle de l'ensimage sur une fibre ?", a: ["protection", "liaison", "coller", "couche"], r: "Une couche chimique qui protège la fibre et l'aide à coller à la résine." },
        { q: "COMPOSITES : Quel est l'inconvénient majeur du carbone vis-à-vis de l'aluminium ?", a: ["corrosion", "rouille", "contact", "galvanique"], r: "Il peut faire rouiller l'alu s'ils sont en contact direct (couple électrolytique)." },

        // --- GESTION DE PROD ET LEAN ---
        { q: "LEAN : Que signifie le sigle SMED ?", a: ["changement de moule", "rapide", "temps", "outil"], r: "Single Minute Exchange of Die (Changement rapide d'outillage)." },
        { q: "PROD : Qu'est-ce que le TRS ?", a: ["taux", "rendement", "efficacite", "trs"], r: "Taux de Rendement Synthétique (mesure de l'efficacité)." },
        { q: "LEAN : À quoi servent les 5S ?", a: ["ordre", "proprete", "organisation", "poste"], r: "À organiser le poste de travail pour gagner en efficacité." },
        { q: "PROD : Qu'est-ce que le 'juste à temps' (JAT) ?", a: ["stock", "zero", "flux tendu"], r: "Produire uniquement ce qui est commandé pour éviter les stocks." },
        { q: "LEAN : Qu'est-ce qu'un Muda ?", a: ["gaspillage", "perte", "inutile"], r: "Un gaspillage (temps, matière, mouvement)." },
        { q: "PROD : Qu'est-ce qu'un Ordre de Fabrication (OF) ?", a: ["document", "lancer", "ordre", "papier"], r: "Le document qui autorise le lancement d'une production." },
        { q: "PROD : À quoi sert un diagramme d'Ishikawa ?", a: ["causes", "probleme", "arête", "5m"], r: "À rechercher les causes d'un défaut (méthode des 5M)." },
        { q: "PROD : Qu'est-ce que la méthode des 5 Pourquoi ?", a: ["cause racine", "source", "pourquoi"], r: "Poser 5 fois la question pour trouver la source réelle d'un problème." },
        { q: "QUALITÉ : Qu'est-ce que le SPC (ou MSP) ?", a: ["statistique", "controle", "msp", "suivi"], r: "Le Maîtrise Statistique des Procédés pour surveiller la qualité." },
        { q: "PROD : Qu'est-ce qu'une non-conformité ?", a: ["defaut", "client", "mauvais", "refus"], r: "Une pièce ou un produit qui ne respecte pas le cahier des charges." },
        { q: "LEAN : Qu'est-ce que le Kanban ?", a: ["etiquette", "reapprovisionnement", "carte", "visuel"], r: "Un système visuel pour gérer les stocks et les commandes." },
        { q: "PROD : Qu'est-ce que la cadence ?", a: ["vitesse", "nombre", "rythme", "heure"], r: "Le nombre de pièces produites par unité de temps." },
        { q: "MAINTENANCE : Qu'est-ce que la TPM ?", a: ["maintenance", "preventive", "operateur", "propre"], r: "La maintenance préventive faite par les opérateurs eux-mêmes." },
        { q: "LEAN : Qu'est-ce qu'un Poka-Yoke ?", a: ["detrompeur", "anti-erreur", "tromper"], r: "Un système anti-erreur qui empêche de mal monter une pièce." },
        { q: "PROD : Différence entre temps de cycle et temps de passage ?", a: ["total", "fabrique", "attente", "transport"], r: "Le cycle est pour une pièce, le passage inclut les attentes et transports." },
        { q: "QUALITÉ : À quoi sert un échantillonnage ?", a: ["trier", "prelever", "quelques", "lot"], r: "À contrôler seulement quelques pièces pour juger tout un lot." },
        { q: "PROD : Qu'est-ce qu'un goulet d'étranglement ?", a: ["bloque", "lent", "bouchon", "freine"], r: "L'étape la plus lente de la ligne de production." },
        { q: "PROD : Qu'est-ce que la traçabilité ascendante ?", a: ["origine", "matiere", "lot", "remonter"], r: "Savoir de quel lot de matière provient une pièce finie." },
        { q: "LEAN : Qu'est-ce que le Gemba ?", a: ["terrain", "atelier", "action", "voir"], r: "L'endroit où se passe l'action (le terrain/l'atelier)." },
        { q: "PROD : À quoi sert un indicateur de performance (KPI) ?", a: ["mesurer", "objectif", "kpi", "chiffre"], r: "À savoir si on atteint les objectifs de production." },

        // --- CALCULS TERMINALE ---
        { q: "PROD : Sur une équipe de 8h, la machine a produit pendant 6h. Quel est le taux de disponibilité ?", a: ["75", "75%"], r: "75% (6/8 * 100)." },
        { q: "QUALITÉ : Sur 1000 pièces, 20 sont non-conformes. Quel est le taux de rebut ?", a: ["2", "2%"], r: "2%." },
        { q: "INJECTION : Volume pièce = 60 cm3. Section vis = 10 cm2. Quelle est la course de dosage ?", a: ["6", "6cm"], r: "6 cm (Volume / Section)." },
        { q: "INJECTION : Volume pièce = 120 cm3. Section vis = 20 cm2. Quelle est la course de dosage ?", a: ["6", "6cm"], r: "6 cm." },
        { q: "INJECTION : Surface projetée = 200 cm2. Pression = 400 bars. Quelle force de verrouillage en kg ?", a: ["80000", "80 000"], r: "80 000 kg (200 * 400)." },
        { q: "PROD : Le temps de cycle est de 20s. Combien de cycles sont réalisés en 1 heure ?", a: ["180"], r: "180 cycles (3600 / 20)." },
        { q: "CALCUL : Une pièce pèse 120g. La densité est de 1,2. Quel est son volume en cm3 ?", a: ["100"], r: "100 cm3 (Masse / Densité)." },

        // --- HSE ET ENVIRONNEMENT AVANCÉ ---
        { q: "HSE : Qu'est-ce qu'un ATEX ?", a: ["atmosphere explosive", "atex", "explosion"], r: "Une zone où l'air peut devenir explosif (vapeurs de solvants)." },
        { q: "HSE : Quel est l'impact du styrène sur le système nerveux ?", a: ["vertige", "somnolence", "neurotoxique", "cerveau"], r: "Il peut provoquer des vertiges, des maux de tête et est neurotoxique." },
        { q: "ENVIRONNEMENT : Qu'est-ce que l'Analyse de Cycle de Vie (ACV) ?", a: ["bilan", "impact", "ecologie", "acv", "vie"], r: "L'étude de l'impact écologique d'un produit de sa naissance à sa mort." },
        { q: "ENVIRONNEMENT : Qu'est-ce qu'un polymère biosourcé ?", a: ["plante", "naturel", "renouvelable", "bio", "mais"], r: "Un plastique fabriqué à partir de ressources renouvelables (ex: maïs)." },
        { q: "HSE : Pourquoi porter un masque à adduction d'air ?", a: ["respirer", "toxique", "air sain", "tuyau"], r: "Pour respirer un air sain indépendant de l'atelier pollué." },
        { q: "HSE : Qu'est-ce que le document unique (DUERP) ?", a: ["risques", "inventaire", "duerp", "papier"], r: "Le document qui liste tous les risques de l'entreprise pour la santé." },
        { q: "ENVIRONNEMENT : Différence entre biodégradable et compostable ?", a: ["vitesse", "residu", "compost", "decomposition"], r: "Compostable signifie qu'il se décompose rapidement sans résidus toxiques." },
        { q: "HSE : Quel est le risque lié aux nanotubes de carbone ?", a: ["poumons", "amiante", "nanotube", "fibres"], r: "Leurs fibres ultra-fines peuvent pénétrer profondément dans les poumons." },
        { q: "ENVIRONNEMENT : Qu'est-ce que le recyclage chimique ?", a: ["molecule", "monomere", "chimie", "decompose"], r: "Redécomposer le plastique en molécules de base pour refaire du plastique neuf." },
        { q: "HSE : Pourquoi la résine époxy est-elle sensibilisante ?", a: ["allergie", "peau", "eczema", "sensibilisant"], r: "Elle peut provoquer des allergies cutanées graves et définitives." },
        { q: "HSE : Comment gérer un départ de feu sur une presse ?", a: ["extincteur co2", "couper", "courant", "electrique"], r: "Couper l'électricité et utiliser un extincteur CO2." },
        { q: "ENVIRONNEMENT : Qu'est-ce que l'écoconception ?", a: ["reduire", "design", "concevoir", "pollution"], r: "Concevoir un produit pour qu'il pollue le moins possible dès le départ." },
        { q: "HSE : Qu'est-ce qu'une maladie professionnelle ?", a: ["travail", "cause", "metier"], r: "Une maladie causée directement par les conditions de travail." },
        { q: "HSE : Rôle du CHSCT (ou CSE) ?", a: ["securite", "salaries", "syndicat", "conditions"], r: "Veiller à la sécurité et aux conditions de travail des employés." },
        { q: "HSE : Risque des rayons UV sur les résines ?", a: ["jaunissement", "degradation", "soleil", "uv"], r: "Ils cassent les chaînes polymères et dégradent les propriétés." },
        { q: "ENVIRONNEMENT : Qu'est-ce que la valorisation énergétique ?", a: ["bruler", "chaleur", "energie", "dechets"], r: "Brûler les déchets pour produire de l'électricité ou du chauffage." },
        { q: "HSE : Pourquoi interdire les bijoux en atelier ?", a: ["happe", "brulure", "conduction", "coincer"], r: "Risque de happement ou de court-circuit électrique." },
        { q: "HSE : Qu'est-ce qu'un accident du travail ?", a: ["blesse", "pendant", "travail", "accident"], r: "Un accident survenu par le fait ou à l'occasion du travail." },
        { q: "ENVIRONNEMENT : Pourquoi séparer les déchets composites des métaux ?", a: ["tri", "recyclage", "separation", "filiere"], r: "Parce qu'ils suivent des filières de traitement totalement différentes." },
        { q: "HSE : Que signifie le marquage CE ?", a: ["norme europeenne", "europe", "conforme", "securite"], r: "Le produit respecte les normes de sécurité européennes." }
  ]
};
// ==========================================
// MÉCANIQUE DU JEU
// ==========================================

function choisirNiveau(niveau) {
    niveauActuel = niveau;
    indexQuestion = 0;
    score = 0;
    timerGlobal = 0;

    document.getElementById("selection-niveau").style.display = "none";
    document.getElementById("jeu").style.display = "block";
    
    lancerTimer();
    afficherQuestion();
}

function lancerTimer() {
    // On réinitialise l'intervalle s'il existait déjà
    if (intervalTimer) clearInterval(intervalTimer);
    
    intervalTimer = setInterval(() => {
        timerGlobal++;
        const m = Math.floor(timerGlobal / 60);
        const s = timerGlobal % 60;
        // On ajoute un '0' devant les secondes si < 10
        const secondesAffichees = s < 10 ? "0" + s : s;
        document.getElementById("timer").innerText = `Temps : ${m}m ${secondesAffichees}s`;
    }, 1000);
}

function afficherQuestion() {
    const q = questions[niveauActuel][indexQuestion];
    document.getElementById("question").innerText = q.q;
    document.getElementById("input-reponse").value = "";
    document.getElementById("progression").innerText = `Question ${indexQuestion + 1} / ${questions[niveauActuel].length}`;
    
    // Focus sur l'input pour que le clavier s'ouvre vite (sur certains mobiles)
    document.getElementById("input-reponse").focus();
    
    sauvegarderPartie();
}

function verifierReponse() {
    const saisie = document.getElementById("input-reponse").value.toLowerCase().trim();
    const q = questions[niveauActuel][indexQuestion];

    // Fonction pour enlever les accents et faciliter la correction
    const normaliser = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const estCorrect = q.a.some(motCle => normaliser(saisie).includes(normaliser(motCle)));

    if (estCorrect) {
        score++;
        alert("✅ CORRECT !\n" + q.r);
    } else {
        alert("❌ DOMMAGE...\nLa réponse attendue était : " + q.r);
    }

    prochaineQuestion();
}

function prochaineQuestion() {
    indexQuestion++;
    if (indexQuestion < questions[niveauActuel].length) {
        afficherQuestion();
    } else {
        terminerQuiz();
    }
}

// ==========================================
// SAUVEGARDE (Local Storage)
// ==========================================

function sauvegarderPartie() {
    localStorage.setItem('quiz_niveau', niveauActuel);
    localStorage.setItem('quiz_index', indexQuestion);
    localStorage.setItem('quiz_score', score);
    localStorage.setItem('quiz_timer', timerGlobal);
}

function chargerPartie() {
    niveauActuel = localStorage.getItem('quiz_niveau');
    indexQuestion = parseInt(localStorage.getItem('quiz_index'));
    score = parseInt(localStorage.getItem('quiz_score'));
    timerGlobal = parseInt(localStorage.getItem('quiz_timer'));

    document.getElementById("selection-niveau").style.display = "none";
    document.getElementById("jeu").style.display = "block";
    
    lancerTimer();
    afficherQuestion();
}

// ==========================================
// FIN DE SESSION
// ==========================================

function terminerQuiz() {
    clearInterval(intervalTimer);
    localStorage.clear(); // On vide la mémoire car le quiz est fini

    const scoreFinal = `${score} / ${questions[niveauActuel].length}`;
    const m = Math.floor(timerGlobal / 60);
    const s = timerGlobal % 60;
    const tempsFinal = `${m}m ${s}s`;

    document.getElementById("jeu").innerHTML = `
        <div style="padding: 20px;">
            <h2>🏆 Objectif Atteint !</h2>
            <p>Tu as terminé le niveau <strong>${niveauActuel.toUpperCase()}</strong>.</p>
            <p style="font-size: 1.4em;">Score : <span style="color: #27ae60;">${scoreFinal}</span></p>
            <p>Temps total : ${tempsFinal}</p>
            <hr>
            <p>Note tes résultats et clique ci-dessous pour les transmettre :</p>
            <button class="btn-niveau" onclick="window.open('TON_LIEN_GOOGLE_FORM')">
                Envoyer mes résultats
            </button>
            <br><br>
            <button onclick="location.reload()" style="background: none; border: 1px solid #ccc; padding: 10px; border-radius: 5px; cursor: pointer;">
                Retour au menu
            </button>
        </div>
    `;
}
});


