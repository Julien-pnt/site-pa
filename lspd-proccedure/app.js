/* ═══════════════════════════════════════════════════════════════════════
   LSPD JUSTICE OS — APPLICATION LOGIC
   Zero-Typing Narrative Engine + Full ERP System
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // Migration douce des données enregistrées sous l'ancienne édition BCSO :
    // on recopie chaque clé vers son équivalent lspd_* puis on purge l'ancienne.
    try {
        [['bcso_claude_key', 'lspd_claude_key'],
         ['bcso_worker_url', 'lspd_worker_url'],
         ['bcso_roster', 'lspd_roster'],
         ['bcso_report_history', 'lspd_report_history'],
         ['bcso_claude_model', null]].forEach(([oldKey, newKey]) => {
            const v = localStorage.getItem(oldKey);
            if (v === null) return;
            if (newKey && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, v);
            localStorage.removeItem(oldKey);
        });
    } catch (e) { /* stockage indisponible */ }

    // ═══════════════════════════════════════════════════════════════════
    // DATABASE
    // ═══════════════════════════════════════════════════════════════════

    const DB = {
        // Indicatifs conformes au serveur LSPD : unité solo « Lincoln », binôme
        // « Adam », puis « Adam+N » par agent supplémentaire.
        units: [
            { code: 'Lincoln', desc: '1 Agent (solo)' },
            { code: 'Adam', desc: '2 Agents (binôme)' },
            { code: 'Adam+1', desc: '3 Agents' },
            { code: 'Adam+2', desc: '4 Agents' },
            { code: 'K-9', desc: 'Unité canine' },
            { code: 'Air', desc: 'Unité aérienne (ASD)' },
            { code: 'Marine', desc: 'Unité nautique' },
            { code: 'Moto', desc: 'Unité moto' },
            { code: 'Metro', desc: 'S.R.T / SWAT' }
        ],
        // Noms de rues officiels de GTA V (extraits des fichiers du jeu), déjà
        // dédupliqués et triés. Servent uniquement de suggestions d'autocomplétion
        // sur les champs « Lieu » — le champ reste en texte libre (lieux RP custom
        // autorisés). Utilisé pour peupler le <datalist> #gtaStreetsList.
        gtaStreets: [
            'Abattoir Ave', 'Abe Milton Pkwy', 'Ace Jones Dr', 'Adam\'s Apple Blvd', 'Aguja St',
            'Algonquin Blvd', 'Alhambra Dr', 'Alta Pl', 'Alta St', 'Amarillo Vista', 'Amarillo Way',
            'Americano Way', 'Armadillo Ave', 'Atlee St', 'Autopia Pkwy', 'Bait St', 'Banham Canyon Dr',
            'Barbareno Rd', 'Bay City Ave', 'Bay City Incline', 'Baytree Canyon Rd', 'Boulevard Del Perro',
            'Bridge St', 'Brouge Ave', 'Buccaneer Way', 'Buen Vino Rd', 'Caesars Place', 'Calafia Rd',
            'Calais Ave', 'Capital Blvd', 'Carcer Way', 'Carson Ave', 'Cascabel Ave', 'Cassidy Trail',
            'Cat-Claw Ave', 'Catfish View', 'Cavalry Blvd', 'Chianski Passage', 'Cholla Rd',
            'Cholla Springs Ave', 'Chum St', 'Chupacabra St', 'Clinton Ave', 'Cockingend Dr',
            'Conquistador St', 'Cortes St', 'Cougar Ave', 'Covenant Ave', 'Cox Way', 'Crusade Rd',
            'Davis Ave', 'Decker St', 'Del Perro Fwy', 'Didion Dr', 'Dorset Dr', 'Dorset Pl', 'Dry Dock St',
            'Duluoz Ave', 'Dunstable Dr', 'Dunstable Ln', 'Dutch London St', 'East Galileo Ave',
            'East Joshua Road', 'East Mirror Dr', 'Eastbourne Way', 'Eclipse Blvd', 'Edwood Way',
            'El Burro Blvd', 'El Gordo Dr', 'El Rancho Blvd', 'Elgin Ave', 'Elysian Fields Fwy',
            'Equality Way', 'Exceptionalists Way', 'Fantastic Pl', 'Fenwell Pl', 'Fort Zancudo Approach Rd',
            'Forum Dr', 'Fudge Ln', 'Galileo Park', 'Galileo Rd', 'Gentry Lane', 'Ginger St', 'Glory Way',
            'Goma St', 'Grapeseed Ave', 'Grapeseed Main St', 'Great Ocean Hwy', 'Greenwich Pkwy',
            'Greenwich Pl', 'Greenwich Way', 'Grove St', 'Hanger Way', 'Hangman Ave', 'Hardy Way',
            'Hawick Ave', 'Heritage Way', 'Hillcrest Ave', 'Hillcrest Ridge Access Rd', 'Imagination Court',
            'Ineseno Road', 'Innocence Blvd', 'Integrity Way', 'Invention Court', 'Jamestown St', 'Joad Ln',
            'Joshua Rd', 'Kimble Hill Dr', 'Kortz Dr', 'La Puerta Fwy', 'Labor Pl', 'Laguna Pl',
            'Lake Vinewood Dr', 'Lake Vinewood Est', 'Las Lagunas Blvd', 'Lesbos Ln', 'Liberty St',
            'Lindsay Circus', 'Little Bighorn Ave', 'Lolita Ave', 'Los Santos Freeway', 'Low Power St',
            'Macdonald St', 'Mad Wayne Thunder Dr', 'Magellan Ave', 'Marathon Ave', 'Marina Dr',
            'Marlowe Dr', 'Melanoma St', 'Meringue Ln', 'Meteor St', 'Milton Rd', 'Miriam Turner Overpass',
            'Mirror Park Blvd', 'Mirror Pl', 'Morningwood Blvd', 'Mountain View Dr', 'Movie Star Way',
            'Mt Haan Dr', 'Mt Haan Rd', 'Mt Vinewood Dr', 'Mutiny Rd', 'New Empire Way', 'Nikola Ave',
            'Nikola Pl', 'Niland Ave', 'Normandy Dr', 'North Archer Ave', 'North Calafia Way',
            'North Conker Ave', 'North Rockford Dr', 'North Sheldon Ave', 'Nowhere Rd', 'O\'Neil Way',
            'Occupation Ave', 'Olympic Fwy', 'Orchardville Ave', 'Paleto Blvd', 'Palomino Ave',
            'Palomino Fwy', 'Panorama Dr', 'Peaceful St', 'Perth St', 'Picture Perfect Drive', 'Plaice Pl',
            'Playa Vista', 'Popular St', 'Portola Dr', 'Power St', 'Procopio Dr', 'Procopio Promenade',
            'Prosperity St', 'Prosperity Street Promenade', 'Pyrite Ave', 'Raton Pass', 'Red Desert Ave',
            'Richman St', 'Rockford Dr', 'Route 68', 'Route 68 Approach', 'Roy Lowenstein Blvd', 'Rub St',
            'Sam Austin Dr', 'San Andreas Ave', 'San Vitus Blvd', 'Sandcastle Way', 'Seaview Rd',
            'Senora Fwy', 'Senora Rd', 'Senora Way', 'Shank St', 'Signal St', 'Sinner St', 'Sinners Passage',
            'Smoke Tree Rd', 'South Arsenal St', 'South Boulevard Del Perro', 'South Mo Milton Dr',
            'South Rockford Dr', 'South Shambles St', 'Spanish Ave', 'Steele Way', 'Strangeways Dr',
            'Strawberry Ave', 'Supply St', 'Sustancia Rd', 'Swiss St', 'Tackle St', 'Tangerine St',
            'Tongva Dr', 'Tower Way', 'Tug St', 'Union Rd', 'Utopia Gardens', 'Vespucci Blvd',
            'Vinewood Blvd', 'Vinewood Park Dr', 'Vitus St', 'Voodoo Place', 'West Eclipse Blvd',
            'West Galileo Ave', 'West Mirror Drive', 'Whispymound Dr', 'Wild Oats Dr', 'York St',
            'Zancudo Ave', 'Zancudo Barranca', 'Zancudo Grande Valley', 'Zancudo Rd'
        ],
        // Codes radio conformes au Manuel de Révision LSPD (Code 1 → 7, 4 Adam).
        statusCodes: [
            { code: 'Code 1', desc: 'Déplacement normal — sans gyrophare ni sirène' },
            { code: 'Code 2', desc: 'Prioritaire — gyrophare, sans sirène' },
            { code: 'Code 3', desc: 'Urgence — gyrophare + sirène' },
            { code: 'Code 3+', desc: 'Urgence maximale — gyro + sirène + vitesse max' },
            { code: 'Code 4', desc: 'Intervention terminée — retour en patrouille' },
            { code: 'Code 4 Adam', desc: 'Perte visuelle d\'un fuyard — lancer un BOLO' },
            { code: 'Code 5', desc: 'Surveillance de zone' },
            { code: 'Code 6', desc: 'Arrivée sur place' },
            { code: 'Code 7', desc: 'Pause patrouille' }
        ],
        // Types d'intervention (clés internes stables ; SEUL le libellé clair est
        // affiché à l'utilisateur — jamais la clé). Aucun code radio visible.
        tenCodes: {
            '10-31': 'Coups de feu',
            '10-32': 'Fusillade',
            '10-14': 'Escorte / Convoi',
            '10-27': 'Sujet recherché (BOLO)',
            '10-29': 'Vérification de mandat / dossier',
            '10-35': 'Demande de renfort',
            '10-37': 'Cambriolage',
            '10-38': 'Contrôle routier',
            '10-40': 'Braquage de supérette',
            '10-50': 'Accident de la circulation',
            '10-51': 'Accident grave',
            '10-52': 'Appel médical (EMS)',
            '10-55': 'Délit de fuite',
            '10-56': 'Refus d\'obtempérer',
            '10-57': 'Vol de véhicule',
            '10-60': 'Vente de stupéfiants',
            '10-61': 'Braquage de banque',
            '10-62': 'Braquage de bijouterie',
            '10-74': 'Racket / Smash and grab',
            'DV': 'Violences domestiques',
            'DOA': 'Scène de décès / DOA',
            'SPEC': 'Incident spécial'
        },
        // P4-8 — 10-Codes procéduraux (table officielle LSPD)
        procedural10Codes: {
            '10-1':  'Fréquence compromise',
            '10-2':  'Signal clair, bonne réception',
            '10-3':  'Retour/arrivée fréquence',
            '10-4':  'Bien reçu',
            '10-6':  'Occupé (sauf urgence)',
            '10-7':  'Indisponible (sauf urgence, radio coupée)',
            '10-8':  'Début de patrouille / service',
            '10-9':  'Répéter la dernière transmission',
            '10-10': 'Fin de patrouille / service',
            '10-12': 'Attente de dispatch',
            '10-15': 'Transport de suspect',
            '10-17': 'Refuel / Essence',
            '10-19': 'En route vers... (préciser localisation)',
            '10-20': 'Votre localisation',
            '10-22': 'Annuler / Ignorer la dernière transmission',
            '10-98': 'Retour en patrouille'
        },
        introMapping: {
            '10-31': 'Intervenant en urgence suite à un signalement de coups de feu dans le secteur,',
            '10-32': 'Intervenant en urgence, sirènes et gyrophares enclenchés, sur une fusillade active,',
            '10-37': 'Dépêchés sur les lieux suite au signalement d\'un cambriolage en cours,',
            '10-38': 'Lors d\'un contrôle routier de routine effectué sur un véhicule suspect,',
            '10-40': 'Alertés par le dispatch pour un braquage en cours dans une supérette,',
            '10-50': 'Arrivant sur les lieux d\'un accident de la circulation signalé par le dispatch,',
            '10-51': 'Intervenant en urgence absolue sur un accident grave — fin de poursuite — avec de potentielles victimes,',
            '10-52': 'Suite à un appel nécessitant une assistance médicale d\'urgence sur zone,',
            '10-55': 'Engageant la poursuite d\'un véhicule signalé en délit de fuite par des témoins,',
            '10-56': 'Lors d\'une tentative de contrôle routier s\'étant transformée en refus d\'obtempérer,',
            '10-57': 'Suite au signalement d\'un vol de véhicule confirmé par le dispatch,',
            '10-60': 'Suite à des informations confirmant une vente de stupéfiants en cours sur la voie publique,',
            '10-61': 'Intervenant en urgence absolue sur un braquage de banque en cours,',
            '10-62': 'Alertés pour un braquage de bijouterie avec suspects potentiellement armés,',
            '10-74': 'Alertés par le dispatch pour un racket avec destruction de vitrines (smash and grab),',
            '10-14': 'Mobilisés pour assurer l\'escorte d\'un convoi sur l\'itinéraire défini par le dispatch,',
            '10-27': 'Engagés à la recherche d\'un sujet activement recherché signalé dans le secteur,',
            '10-29': 'Procédant à une vérification de mandat et de dossier citoyen sur un individu contrôlé,',
            '10-35': 'Répondant en urgence à une demande de renfort émise par une unité sur le terrain,',
            'DV': 'Intervenant suite à un signalement de violences domestiques,',
            'DOA': 'Dépêchés sur la découverte d\'un corps sans vie,',
            'SPEC': 'Mobilisés pour la prise en charge d\'un incident spécial,'
        },
        // Transition phrases: "fromCode->toCode" => narrative text
        transitionPhrases: {
            '10-38->10-56': 'la situation a basculé en refus d\'obtempérer, le conducteur refusant de se conformer aux injonctions des agents',
            '10-38->10-55': 'le conducteur a pris la fuite, commettant un délit de fuite',
            '10-38->10-32': 'la situation a dégénéré en fusillade, le suspect ouvrant le feu sur les agents',
            '10-38->10-31': 'des coups de feu ont été entendus à proximité durant l\'intervention',
            '10-38->10-50': 'un accident de la circulation s\'est produit durant l\'intervention',
            '10-38->10-60': 'la découverte de stupéfiants a réorienté l\'intervention vers une affaire de vente de drogue',
            '10-56->10-32': 'le refus d\'obtempérer a dégénéré en fusillade, le suspect faisant usage d\'une arme à feu',
            '10-56->10-31': 'des coups de feu ont été tirés durant la poursuite',
            '10-56->10-50': 'la poursuite s\'est soldée par un accident de la circulation',
            '10-56->10-51': 'la poursuite s\'est soldée par un accident grave avec blessés potentiels',
            '10-56->10-55': 'le suspect a abandonné le véhicule, poursuivant sa fuite à pied',
            '10-55->10-32': 'le suspect en fuite a ouvert le feu, faisant basculer la situation en fusillade',
            '10-55->10-31': 'des coups de feu ont été entendus durant la poursuite',
            '10-55->10-50': 'un accident de la circulation est survenu durant la poursuite du véhicule en fuite',
            '10-55->10-56': 'le suspect a refusé de s\'arrêter malgré les injonctions répétées des agents',
            '10-40->10-56': 'un suspect a tenté de prendre la fuite, refusant d\'obtempérer aux injonctions',
            '10-40->10-32': 'les braqueurs ont ouvert le feu, transformant la situation en fusillade',
            '10-40->10-31': 'des coups de feu ont retenti durant l\'intervention',
            '10-40->10-55': 'un suspect a pris la fuite à bord d\'un véhicule',
            '10-61->10-56': 'un suspect a tenté de fuir les lieux en refusant d\'obtempérer',
            '10-61->10-32': 'les braqueurs ont ouvert le feu sur les agents, provoquant une fusillade',
            '10-61->10-55': 'un véhicule suspect a pris la fuite des lieux du braquage',
            '10-62->10-56': 'un suspect a refusé d\'obtempérer lors de l\'interpellation',
            '10-62->10-32': 'les suspects ont ouvert le feu, la situation a basculé en fusillade',
            '10-62->10-55': 'un véhicule impliqué a pris la fuite',
            '10-37->10-56': 'le suspect surpris sur les lieux a refusé d\'obtempérer',
            '10-37->10-55': 'le cambrioleur a pris la fuite en véhicule',
            '10-37->10-32': 'le suspect s\'est retranché et a ouvert le feu',
            '10-31->10-32': 'les coups de feu se sont intensifiés, dégénérant en fusillade active',
            '10-31->10-56': 'le tireur présumé a tenté de fuir en refusant d\'obtempérer',
            '10-31->10-55': 'un véhicule suspect a quitté la zone en délit de fuite',
            '10-32->10-56': 'à l\'issue de la fusillade, le suspect a tenté de prendre la fuite',
            '10-32->10-55': 'suite aux échanges de tirs, un véhicule suspect a pris la fuite',
            '10-50->10-55': 'le conducteur impliqué a pris la fuite des lieux de l\'accident',
            '10-50->10-56': 'le conducteur a refusé de coopérer et a pris la fuite',
            '10-57->10-56': 'le suspect au volant du véhicule volé a refusé d\'obtempérer',
            '10-57->10-55': 'le véhicule volé a pris la fuite',
            '10-57->10-32': 'le suspect du véhicule volé a ouvert le feu',
            '10-60->10-56': 'le vendeur a refusé d\'obtempérer lors de l\'interpellation',
            '10-60->10-55': 'le suspect a pris la fuite en véhicule',
            '10-60->10-32': 'le suspect a ouvert le feu sur les agents',
            '10-74->10-56': 'un suspect a refusé d\'obtempérer lors de l\'intervention',
            '10-74->10-55': 'un véhicule suspect a quitté les lieux en urgence',
            '10-74->10-32': 'les suspects ont ouvert le feu lors de l\'interpellation',
            '10-29->10-56': 'le citoyen contrôlé a refusé d\'obtempérer au moment de la vérification',
            '10-29->10-27': 'la vérification a révélé un mandat positif : le sujet était activement recherché',
            '10-29->10-35': 'la situation s\'est tendue, nécessitant une demande de renfort',
            '10-27->10-56': 'le sujet recherché a refusé l\'interpellation',
            '10-27->10-55': 'le sujet recherché a pris la fuite en véhicule',
            '10-27->10-32': 'le sujet recherché a ouvert le feu sur les agents',
            '10-14->10-35': 'le convoi a été attaqué, nécessitant une demande de renfort immédiat',
            '10-14->10-32': 'le convoi a été pris pour cible par des tirs nourris',
            '10-14->10-56': 'un véhicule a refusé d\'obtempérer au passage du convoi',
            '10-35->10-32': 'la situation a dégénéré en fusillade à l\'arrivée des renforts',
            '10-35->10-56': 'le suspect a refusé d\'obtempérer malgré l\'arrivée des renforts',
            '10-35->10-55': 'le suspect a pris la fuite en véhicule à l\'arrivée des renforts'
        },
        suspectScale: [
            'Aucun suspect identifié',
            'Un individu isolé',
            'Deux suspects identifiés',
            'Un groupe hostile de plusieurs individus',
            'Une organisation structurée de nombreux individus'
        ],
        shotsScale: [
            'Aucun échange de tirs',
            'Quelques détonations sporadiques',
            'Un échange de tirs soutenu',
            'Un échange de tirs de forte intensité'
        ],
        threatScale: [
            'Situation calme',
            'Niveau de menace modéré',
            'Menace élevée — situation dangereuse',
            'Menace critique — danger de mort immédiat'
        ],
        speedScale: [
            'Aucune poursuite',
            'Poursuite à vitesse modérée en agglomération',
            'Poursuite à haute vitesse sur route ouverte',
            'Poursuite extrême mettant en danger la sécurité publique'
        ],
        // ── GND-SPECIFIC DATA ──
        gndOperationTypes: [
            'Planque / Surveillance discrète',
            'Intervention sur point de deal',
            'Buy-Bust (Achat contrôlé)',
            'Raid / Perquisition',
            'Contrôle routier stupéfiants',
            'Démantèlement de laboratoire',
            'Filature de suspect',
            'Livraison contrôlée',
            'Opération conjointe inter-agences'
        ],
        gndSurveillanceMeans: [
            'Véhicule banalisé',
            'Point de surveillance fixe',
            'Agents en civil',
            'Jumelles / Optique longue portée',
            'Caméra de surveillance',
            'Drone de surveillance',
            'Écoute radio / Scanner'
        ],
        gndObservations: [
            'Échanges main à main observés',
            'Allers-retours suspects fréquents',
            'Guetteur(s) posté(s) aux alentours',
            'Véhicules en rotation suspecte',
            'Suspect dissimule des objets',
            'Transaction avec argent liquide visible',
            'Fumée / Odeur suspecte émanant du lieu',
            'Point de deal actif confirmé',
            'Suspect armé observé',
            'Contact avec individu fiché',
            'Conditionnement de produit en cours',
            'Communication radio/téléphone fréquente'
        ],
        gndInterventionTriggers: [
            'Transaction flagrante observée',
            'Suspect tente de quitter la zone',
            'Menace armée détectée',
            'Fenêtre d\'intervention optimale identifiée',
            'Ordre du superviseur GND',
            'Fin de la période de surveillance',
            'Suspect identifié formellement',
            'Quantité importante de produit visible'
        ],
        gndApproachMethods: [
            'Approche véhicule banalisé',
            'Approche pédestre en civil',
            'Encerclement du périmètre',
            'Intervention dynamique (raid)',
            'Blocage véhicule (box-in)',
            'Interception en mouvement',
            'Entrée forcée (bélier / breaching)',
            'Appui SRT / SWAT'
        ],
        gndIntelSources: [
            'Informateur confidentiel (CI)',
            'Surveillance terrain antérieure',
            'Renseignement inter-agences',
            'Plainte de riverains / Signalement civil',
            'Analyse téléphonique / Écoutes',
            'Dossier CID en cours',
            'Antécédents du suspect (fiche)',
            'Contrôle routier antérieur',
            'Réseaux sociaux / OSINT'
        ],
        gndOperationResults: [
            'Interpellation réussie',
            'Suspect en fuite — non interpellé',
            'Interpellation après poursuite',
            'Suspect neutralisé',
            'Reddition volontaire',
            'Opération avortée (compromis)',
            'Saisie effectuée sans interpellation',
            'Plusieurs interpellations simultanées'
        ],
        gndSurveillanceDurations: [
            'Moins de 30 minutes',
            '30 minutes à 1 heure',
            '1 à 2 heures',
            '2 à 4 heures',
            'Plus de 4 heures',
            'Surveillance sur plusieurs jours'
        ],

        penalCode: [
            {
                category: 'Contraventions',
                items: [
                    { name: 'Appel abusif / Spam bipeur', fine: 250, prison: '-', qtyUnit: 'spam' },
                    { name: 'Atteinte à la pudeur', fine: 200, prison: '-' },
                    { name: 'Conduite dangereuse mineur', fine: 300, prison: '-' },
                    { name: 'Diffusion de contenu offensant sur les réseaux sociaux', fine: 400, prison: '-', qtyUnit: 'post(s)' },
                    { name: 'Dissimulation du visage', fine: 100, prison: '-' },
                    { name: 'Document manquant / non conforme', fine: 500, prison: '-' },
                    { name: 'Emploi non déclaré', fine: 1000, prison: '-', qtyUnit: 'employé(s)' },
                    { name: 'Excès de vitesse 1-10 km/h', fine: 90, prison: '-' },
                    { name: 'Excès de vitesse 11-20 km/h', fine: 150, prison: '-' },
                    { name: 'Excès de vitesse 21-30 km/h', fine: 200, prison: '-' },
                    { name: 'Excès de vitesse 31-50 km/h', fine: 250, prison: '-' },
                    { name: 'Insultes graves / Injures (propos misogynes, sexistes, homophobes, racistes...)', fine: 700, prison: '-' },
                    { name: 'Ivresse sur la voie publique', fine: 75, prison: '-' },
                    { name: 'Non déclaration des impôts', fine: 200, prison: '-' },
                    { name: 'Non paiement des impôts', fine: 0, prison: '-' },
                    { name: 'Non port du casque', fine: 100, prison: '-' },
                    { name: 'Non présentation des papiers (ID, Permis)', fine: 200, prison: '-' },
                    { name: 'Non respect véhicule prioritaire', fine: 200, prison: '-' },
                    { name: 'Nuisance sonore', fine: 100, prison: '-' },
                    { name: 'Présence piétonne sur une autoroute', fine: 150, prison: '-' },
                    { name: 'Stationnement gênant', fine: 100, prison: '-' },
                    { name: 'Stationnement interdit', fine: 500, prison: '-' },
                    { name: 'Téléphone au volant', fine: 100, prison: '-' },
                    { name: 'Véhicule non réglementaire', fine: 350, prison: '-' },
                    { name: 'Violation de propriété privée', fine: 300, prison: '-' }
                ]
            },
            {
                category: 'Délits Mineurs',
                items: [
                    { name: 'Agression sur civil à mains nues', fine: 500, prison: '45717' },
                    { name: 'Agression sur citoyen à mains nues (PNJ)', fine: 200, prison: '45689' },
                    { name: 'Agression sur civil avec une arme blanche ou contondante', fine: 750, prison: '45779' },
                    { name: 'Arnaque / fraude à la carte bleu', fine: 400, prison: '45689' },
                    { name: 'Braquage à main armée de supérette', fine: 350, prison: '45689' },
                    { name: 'Braquage à main armée sur civil', fine: 900, prison: '45811' },
                    { name: 'Braquage d\'ATM', fine: 600, prison: '45689' },
                    { name: 'Cambriolage', fine: 350, prison: '45689' },
                    { name: 'Cambriolage de conteneur', fine: 350, prison: '45689' },
                    { name: 'Conduite dangereuse majeur', fine: 400, prison: '45689' },
                    { name: 'Conduite en état d\'ivresse / stupéfiant', fine: 150, prison: '45689' },
                    { name: 'Conduite sans permis', fine: 225, prison: '45689' },
                    { name: 'Conduite sous interdiction de permis', fine: 350, prison: '45689' },
                    { name: 'Course de rue illégale — Participation', fine: 350, prison: '45689' },
                    { name: 'Course de rue illégale — Organisation', fine: 550, prison: '45689' },
                    { name: 'Cyberharcèlement (propos pornographiques, racistes, injures)', fine: 750, prison: '45718' },
                    { name: 'Dégradation de biens privé', fine: 300, prison: '45689', qtyUnit: 'unité(s)' },
                    { name: 'Dégradation de biens public', fine: 300, prison: '45689', qtyUnit: 'unité(s)' },
                    { name: 'Dégradation de matériels public (Ex: Véh LSPD)', fine: 700, prison: '45689', qtyUnit: 'unité(s)' },
                    { name: 'Diffusion de contenu illicite sur les réseaux sociaux', fine: 800, prison: '45778', qtyUnit: 'post(s)' },
                    { name: 'Discrimination à l\'embauche', fine: 1500, prison: '45689' },
                    { name: 'Entrée par effraction', fine: 600, prison: '45717' },
                    { name: 'Entrave à une opération de police / enquête / justice / services publics', fine: 1000, prison: '45811' },
                    { name: 'Excès de vitesse 51+ km/h', fine: 500, prison: '45689' },
                    { name: 'Exhibition d\'armes', fine: 1000, prison: '45689', qtyUnit: 'arme(s)' },
                    { name: 'Canular téléphonique', fine: 350, prison: '45689' },
                    { name: 'Concurrence déloyale', fine: 0, prison: '45689' },
                    { name: 'Franchissement d\'un périmètre de sécurité', fine: 300, prison: '45689' },
                    { name: 'Gofast', fine: 650, prison: '45689' },
                    { name: 'Graffiti / Tag illégal', fine: 50, prison: '45689' },
                    { name: 'Harcèlement', fine: 700, prison: '45749' },
                    { name: 'Incitation à la haine', fine: 700, prison: '45717' },
                    { name: 'Maltraitance animale', fine: 800, prison: '45778' },
                    { name: 'Manifestation illégale', fine: 300, prison: '45717' },
                    { name: 'Menaces de mort / Menaces graves', fine: 1000, prison: '45717' },
                    { name: 'Mise en danger de la vie d\'autrui', fine: 500, prison: '45717' },
                    { name: 'Non conformité du règlement intérieur', fine: 1000, prison: '45717' },
                    { name: 'Non présentation à une convocation de police', fine: 1000, prison: '2j' },
                    { name: 'Non respect des règles de sécurité au travail', fine: 1000, prison: '45717' },
                    { name: 'Outrage grave à agent', fine: 500, prison: '1j' },
                    { name: 'Participation à une émeute', fine: 300, prison: '45689' },
                    { name: 'Possession d\'argent liquide > 2K sans justificatif', fine: 200, prison: '45689' },
                    { name: 'Possession d\'arme blanche', fine: 300, prison: '45689', qtyUnit: 'arme(s)' },
                    { name: 'Possession d\'arme illégale artisanale', fine: 2400, prison: '45717', qtyUnit: 'arme(s)' },
                    { name: 'Possession d\'arme illégale légère', fine: 4000, prison: '45779', qtyUnit: 'arme(s)' },
                    { name: 'Possession d\'héroïne', fine: 10, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de cannabis', fine: 3, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de cocaïne', fine: 10, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de crack', fine: 8, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession d\'ecstasy', fine: 8, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de Fentanyl', fine: 8, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de MDMA', fine: 8, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de Méthamphétamine', fine: 8, prison: '45717', qtyUnit: 'pochon(s)' },
                    { name: 'Possession de graines / produits transformables en stupéfiants (- de 1000)', fine: 5, prison: '45717', qtyUnit: 'graine(s)' },
                    { name: 'Possession de munitions non autorisées', fine: 10, prison: '45717', qtyUnit: 'munition(s)' },
                    { name: 'Possession du Kevlar sans autorisation', fine: 1000, prison: '45779' },
                    { name: 'Production de cannabis (- de 30 pots)', fine: 30, prison: '45779', qtyUnit: 'pot(s)' },
                    { name: 'Recel d\'objet volé', fine: 20, prison: '45689', qtyUnit: 'objet(s)' },
                    { name: 'Récidive délit mineur', fine: 600, prison: '45779' },
                    { name: 'Refus d\'obtempérer mineur', fine: 100, prison: '45689' },
                    { name: 'Refus d\'obtempérer majeur', fine: 500, prison: '45689' },
                    { name: 'Smash and Grab', fine: 150, prison: '45689' },
                    { name: 'Survol / Navigation en zone interdite', fine: 1400, prison: '2j' },
                    { name: 'Travail dissimulé', fine: 2500, prison: '2j', qtyUnit: 'employé(s)' },
                    { name: 'Trouble à l\'ordre public', fine: 200, prison: '45689' },
                    { name: 'Vente de drogue', fine: 250, prison: '45689', qtyUnit: 'pochon(s)' },
                    { name: 'Vol à l\'arraché / Vol de sac à main / Racket', fine: 150, prison: '45689' },
                    { name: 'Vol de véhicule / Carjacking', fine: 200, prison: '45689' },
                    { name: 'Vol de véhicule d\'entreprise', fine: 500, prison: '2j' },
                    { name: 'Vol de véhicule Gouv/LSPD/EMS', fine: 2000, prison: '3j' },
                    { name: 'Vol d\'équipement entreprise (hors véhicules)', fine: 500, prison: '45689', qtyUnit: 'objet(s)' }
                ]
            },
            {
                category: 'Délits Majeurs',
                items: [
                    { name: 'Abus de biens sociaux', fine: 1200, prison: '45689' },
                    { name: 'Abus de confiance', fine: 500, prison: '45689' },
                    { name: 'Abus de pouvoir', fine: 1500, prison: '45689' },
                    { name: 'Agression envers un membre du DOJ', fine: 2500, prison: '45779' },
                    { name: 'Agression sur agent (employé d\'état ou police)', fine: 5000, prison: '45812' },
                    { name: 'Agression sur agent avec arme à feu', fine: 7000, prison: '45936' },
                    { name: 'Agression sur civil avec une arme à feu', fine: 2500, prison: '45812' },
                    { name: 'Braquage d\'entreprise ou hypermarché', fine: 2000, prison: '45717' },
                    { name: 'Braquage de Bijouterie', fine: 2500, prison: '45779' },
                    { name: 'Braquage de Brinks', fine: 3000, prison: '45717' },
                    { name: 'Braquage de Convoi (armes / drogues)', fine: 2000, prison: '45779' },
                    { name: 'Braquage de Fleeca', fine: 3000, prison: '45811' },
                    { name: 'Braquage de Train', fine: 2500, prison: '45717' },
                    { name: 'Chantage', fine: 500, prison: '45689' },
                    { name: 'Détournement de fonds (variable)', fine: 0, prison: '45749' },
                    { name: 'Détournement de fonds (amende unique)', fine: 3000, prison: '-' },
                    { name: 'Diffamation', fine: 1000, prison: '45689' },
                    { name: 'Discrimination', fine: 1000, prison: '45689' },
                    { name: 'Empoisonnement', fine: 2000, prison: '45779' },
                    { name: 'Entreposage d\'armes illégales artisanales (≥ 3)', fine: 700, prison: '1j', qtyUnit: 'arme(s)' },
                    { name: 'Entreposage d\'armes illégales légères (≥ 3)', fine: 1000, prison: '2j', qtyUnit: 'arme(s)' },
                    { name: 'Entreposage d\'armes illégales lourdes (≥ 3)', fine: 4000, prison: '45779', qtyUnit: 'arme(s)' },
                    { name: 'Entreposage d\'armes illégales de guerre (≥ 3)', fine: 6000, prison: '45811', qtyUnit: 'arme(s)' },
                    { name: 'Extorsion / Escroquerie / Racket', fine: 700, prison: '45689' },
                    { name: 'Multiples amendes impayées', fine: 5, prison: '1j', qtyUnit: 'amende(s)' },
                    { name: 'Non assistance à personne en danger', fine: 500, prison: '45748' },
                    { name: 'Non déclaration d\'un délit', fine: 400, prison: '45689' },
                    { name: 'Non déclaration d\'un crime', fine: 1000, prison: '45689' },
                    { name: 'Non respect de présence au TIG', fine: 1500, prison: 'TIG' },
                    { name: 'Non respect d\'injonction ou contrôle judiciaire', fine: 3000, prison: '45689' },
                    { name: 'Outrage envers un membre du DOJ', fine: 1600, prison: '1j' },
                    { name: 'Parjure / Faux témoignage / Fausse accusation', fine: 1200, prison: '45717' },
                    { name: 'Participation à une fusillade', fine: 1000, prison: '45717' },
                    { name: 'Participation à une fusillade contre FDO', fine: 5000, prison: '45779' },
                    { name: 'Plantation illicite (+30 pots)', fine: 1500, prison: '45689' },
                    { name: 'Possession d\'armes illégales lourdes', fine: 5000, prison: '45811', qtyUnit: 'arme(s)' },
                    { name: 'Possession d\'armes incendiaires', fine: 800, prison: '45779', qtyUnit: 'arme(s)' },
                    { name: 'Prise d\'otage sur agent de l\'État', fine: 10000, prison: '45935' },
                    { name: 'Prise d\'otage sur civil', fine: 7000, prison: '45935' },
                    { name: 'Prise d\'otage tous confondus (otage supplémentaire)', fine: 1500, prison: '-' },
                    { name: 'Production / fabrication de drogue', fine: 2000, prison: '45717' },
                    { name: 'Publicité mensongère', fine: 700, prison: '45689' },
                    { name: 'Récidive délit majeur', fine: 1500, prison: '45779' },
                    { name: 'Refus d\'accès aux locaux ou coffres professionnels', fine: 5000, prison: '45811' },
                    { name: 'Refus de comparaître', fine: 5500, prison: '45811' },
                    { name: 'Transport de drogue (en tout genre)', fine: 3000, prison: '45779' },
                    { name: 'Usage de fausses plaques d\'immatriculation', fine: 1000, prison: '45717' },
                    { name: 'Usage de faux', fine: 3000, prison: '45811' },
                    { name: 'Usurpation d\'identité / fonction', fine: 1250, prison: '45689' },
                    { name: 'Violation des lois de l\'immigration', fine: 3500, prison: '45717' },
                    { name: 'Violation du secret pro / Droit de réserve', fine: 6000, prison: '45811' },
                    { name: 'Vol de matériel FDO', fine: 12000, prison: '45779', qtyUnit: 'munition(s)' }
                ]
            },
            {
                category: 'Crimes',
                items: [
                    { name: 'Agression sexuelle (viol, débordement HRP)', fine: 0, prison: 'X' },
                    { name: 'Apologie du terrorisme', fine: 1000000, prison: '45811' },
                    { name: 'Assassinat (meurtre prémédité)', fine: 50000, prison: 'Prison à vie' },
                    { name: 'Association de malfaiteurs', fine: 3000, prison: '45811' },
                    { name: 'Attaque Gouvernementale', fine: 150000, prison: 'Prison à vie' },
                    { name: 'Attaque Poste de Police', fine: 100000, prison: 'Prison à vie' },
                    { name: 'Attentat', fine: 25000, prison: '46300' },
                    { name: 'Blanchiment', fine: 10000, prison: '45811' },
                    { name: 'Braquage d\'un Convoi pénitentiaire', fine: 30000, prison: '45779' },
                    { name: 'Braquage de la Banque Pacifique', fine: 9000, prison: '45779' },
                    { name: 'Cavale', fine: 6000, prison: '45717' },
                    { name: 'Corruption', fine: 15000, prison: '45717' },
                    { name: 'Destruction / dissimulation de preuve', fine: 6000, prison: '45811' },
                    { name: 'Détention/stockage de drogue (≥ 750 pochons)', fine: 4000, prison: '2j + 1j/750 pochons', qtyUnit: 'pochon(s)', qtyPrison: { base: 2, per: 750 } },
                    { name: 'Divulgation d\'information / secret d\'État', fine: 25000, prison: '45811' },
                    { name: 'Évasion / Organisation d\'évasion', fine: 70000, prison: 'Prison à vie' },
                    { name: 'Fabrication d\'armes', fine: 15000, prison: '1-4 ans' },
                    { name: 'Fraude fiscale (variable)', fine: 0, prison: '2j + 1j/10 000$', qtyUnit: '$', qtyPrison: { base: 2, per: 10000 } },
                    { name: 'Fraude fiscale (amende unique)', fine: 3000, prison: '-' },
                    { name: 'Haute Trahison', fine: 1000000, prison: 'Prison à vie' },
                    { name: 'Homicide involontaire', fine: 20000, prison: '3-6 ans' },
                    { name: 'Importation / exportation de drogue (≥ 750 pochons)', fine: 7500, prison: '2j + 1j/750 pochons', qtyUnit: 'pochon(s)', qtyPrison: { base: 2, per: 750 } },
                    { name: 'Kidnapping / séquestration', fine: 10000, prison: '2-5 ans' },
                    { name: 'Mandat criminel', fine: 7000, prison: '3-6 ans' },
                    { name: 'Meurtre sur agent de l\'état', fine: 80000, prison: 'Prison à vie', qtyUnit: 'meurtre(s)' },
                    { name: 'Meurtre sur civil', fine: 30000, prison: '5-10 ans', qtyUnit: 'meurtre(s)' },
                    { name: 'Meurtre sur Gouverneur', fine: 1000000, prison: 'Prison à vie' },
                    { name: 'Piratage de données des services publics', fine: 3000, prison: '1-2 ans' },
                    { name: 'Possession d\'arme de guerre', fine: 15000, prison: '2-5 ans' },
                    { name: 'Prise d\'otage sur membre du gouvernement/mairie', fine: 40000, prison: '15-20 ans' },
                    { name: 'Prise d\'otage sur membre du gouv/mairie (otage supplémentaire)', fine: 5000, prison: '-' },
                    { name: 'Tentative de meurtre sur civil', fine: 15000, prison: '3-6 ans' },
                    { name: 'Tentative de meurtre sur agent de l\'état', fine: 40000, prison: '3-6 ans' },
                    { name: 'Tentative de meurtre sur Gouverneur', fine: 100000, prison: '3-6 ans' },
                    { name: 'Terrorisme', fine: 1000000, prison: 'Prison à vie' },
                    { name: 'Torture', fine: 5000, prison: '2-5 ans' },
                    { name: 'Trafic d\'armes (4 ou plus)', fine: 30000, prison: '2-5 ans' },
                    { name: 'Trafic de drogue (≥ 750 pochons)', fine: 8000, prison: '2j + 1j/750 pochons', qtyUnit: 'pochon(s)', qtyPrison: { base: 2, per: 750 } }
                ]
            }
        ]
    };

    // ═══════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        reports: 0,
        arrests: 0,
        drugWeight: 0,
        totalFines: 0,
        // Agent roster (persisted in localStorage)
        roster: [],
        // Selected agents per module (arrays of roster indices)
        selectedAgents: {
            standard: [],
            patrol: [],
            narcotics: [],
            cid: [],
            interrogation: [],
            ois: []
        },
        // Tag selections
        patrol: {
            unit: null,
            status: null,
            tenCode: null,
            tenCodes: [],
            tags: { suspect_state: [], impact_detail: [], agent_state: [], suspect_obs: [], behavior: [], aggressor: [], aggression_origin: [], suspect_flight: [], pursuit_end: [], force: [], tests: [], search_person: [], search_vehicle: [], miranda: [], medical_end: [] },
            pursuitEndLocation: '',
            anatomicalZones: [],
            vehicleColor: [],
            vehicleState: [],
            evidence: [],
            ammoTypes: []
        },
        narcotics: {
            unit: null,
            operationType: null,
            drugs: [],
            packaging: [],
            gang: [],
            weapons: [],
            surveillanceMeans: [],
            observations: [],
            interventionTriggers: [],
            approachMethods: [],
            intelSources: [],
            operationResults: [],
            surveillanceDuration: null,
            roles: []
        },
        cid: {
            crimeType: [],
            ballistics: [],
            fingerprints: [],
            victims: [],
            warrant: []
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function $(sel, ctx = document) { return ctx.querySelector(sel); }
    function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

    function showToast(msg, type = 'success') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copié dans le presse-papiers !');
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('Copié dans le presse-papiers !');
        });
    }

    function renderReportOutput(outputId, report) {
        const output = $(`#${outputId}`);
        output.innerHTML = '';
        const pre = document.createElement('span');
        pre.textContent = sanitizeRadioCodes(report);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-outline copy-btn';
        copyBtn.textContent = 'Copier';
        copyBtn.addEventListener('click', () => copyToClipboard(pre.textContent));

        const aiBtn = document.createElement('button');
        aiBtn.className = 'btn ai-enhance-btn';
        aiBtn.innerHTML = '✦ Améliorer avec Claude AI';
        aiBtn.addEventListener('click', () => enhanceWithClaude(outputId, pre));

        output.appendChild(copyBtn);
        output.appendChild(aiBtn);
        output.appendChild(pre);
    }

    function formatNow() {
        const d = new Date();
        return d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    }

    function setDatetimeNow(inputId) {
        const el = $(`#${inputId}`);
        if (el && !el.value) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            el.value = now.toISOString().slice(0, 16);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CLAUDE AI — API KEY MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function loadApiKey() {
        try { return localStorage.getItem('lspd_claude_key') || ''; } catch (e) { return ''; }
    }

    function saveApiKey(key) {
        try { localStorage.setItem('lspd_claude_key', key); } catch (e) { /* ignore */ }
    }

    function loadModelPref() {
        try { return localStorage.getItem('lspd_claude_model') || 'claude-sonnet-5'; } catch (e) { return 'claude-sonnet-5'; }
    }

    function saveModelPref(model) {
        try { localStorage.setItem('lspd_claude_model', model); } catch (e) { /* ignore */ }
    }

    // Normalise une URL de Worker : ajoute le schéma « https:// » s'il manque.
    // Sans schéma, fetch() résout l'URL comme un chemin relatif à la page courante
    // (ex. « domaine.workers.dev » → 127.0.0.1:5500/domaine.workers.dev) au lieu
    // d'attaquer le Worker. On applique la normalisation à la fois à la sauvegarde
    // ET à la lecture, pour rattraper aussi les valeurs déjà stockées sans schéma.
    function normalizeWorkerUrl(url) {
        const trimmed = (url || '').trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return 'https://' + trimmed.replace(/^\/+/, '');
    }

    function loadWorkerUrl() {
        try { return normalizeWorkerUrl(localStorage.getItem('lspd_worker_url') || ''); } catch (e) { return ''; }
    }

    function saveWorkerUrl(url) {
        try { localStorage.setItem('lspd_worker_url', normalizeWorkerUrl(url)); } catch (e) { /* ignore */ }
    }

    // ── Settings modal ──
    function openSettingsModal() {
        $('#settingsApiKeyInput').value = loadApiKey();
        $('#settingsWorkerUrl').value = loadWorkerUrl();
        $('#settingsModelSelect').value = loadModelPref();
        $('#settingsModal').classList.add('active');
    }

    $('#btnOpenSettings').addEventListener('click', openSettingsModal);

    $('#btnCloseSettings').addEventListener('click', () => $('#settingsModal').classList.remove('active'));

    function refreshAiIndicator() {
        const btn = $('#btnOpenSettings');
        if (!btn) return;
        const hasKey = !!loadApiKey();
        const hasWorker = !!loadWorkerUrl();
        btn.classList.toggle('ai-active', hasKey && hasWorker);
        // Update all AI mode labels: show warning indicator when no key configured
        $$('.ai-mode-label').forEach(label => {
            label.classList.toggle('no-key', !hasKey || !hasWorker);
        });
    }

    // Warn user when they toggle AI mode without a key configured
    document.addEventListener('click', e => {
        const check = e.target.closest('.ai-mode-check');
        if (!check) return;
        if (check.checked && (!loadApiKey() || !loadWorkerUrl())) {
            check.checked = false;
            showToast('Configurez votre clé API et l\'URL Worker dans ⚙ Claude AI.', 'error');
            openSettingsModal();
        }
    });

    $('#settingsModal').addEventListener('click', e => {
        if (e.target === $('#settingsModal')) $('#settingsModal').classList.remove('active');
    });

    $('#btnToggleKeyVisibility').addEventListener('click', () => {
        const inp = $('#settingsApiKeyInput');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    $('#btnSaveApiKey').addEventListener('click', () => {
        const key = $('#settingsApiKeyInput').value.trim();
        const workerUrl = normalizeWorkerUrl($('#settingsWorkerUrl').value);
        // Validation : si une URL est fournie, elle doit être analysable après
        // normalisation — sinon on avertit clairement plutôt que d'échouer en
        // silence au moment du fetch. Une URL vide reste permise (IA désactivée).
        if (workerUrl) {
            let valid = false;
            try { valid = /^https?:$/.test(new URL(workerUrl).protocol); } catch (e) { valid = false; }
            if (!valid) {
                showToast('URL du Worker invalide. Exemple : lspd-proxy.mon-compte.workers.dev', 'error');
                return; // ne pas enregistrer ni fermer la modale
            }
        }
        const model = $('#settingsModelSelect').value;
        saveApiKey(key);
        saveModelPref(model);
        saveWorkerUrl(workerUrl);
        $('#settingsWorkerUrl').value = workerUrl; // refléter la valeur normalisée
        refreshAiIndicator();
        $('#settingsModal').classList.remove('active');
        showToast(key ? 'Paramètres Claude enregistrés.' : 'Clé API supprimée.');
    });

    $('#btnDeleteApiKey').addEventListener('click', () => {
        saveApiKey('');
        $('#settingsApiKeyInput').value = '';
        refreshAiIndicator();
        showToast('Clé API supprimée.', 'warning');
    });

    // ── Enhance report with Claude ──
    async function enhanceWithClaude(outputId, preElement) {
        const apiKey = loadApiKey();
        if (!apiKey) {
            showToast('Configurez votre clé API Claude via ⚙ Claude AI dans la barre latérale.', 'error');
            openSettingsModal();
            return;
        }

        const currentReport = preElement.textContent;
        if (!currentReport.trim()) {
            showToast('Aucun rapport à améliorer.', 'error');
            return;
        }

        const output = $(`#${outputId}`);
        const aiBtn = output.querySelector('.ai-enhance-btn');
        if (!aiBtn) return;

        aiBtn.disabled = true;
        aiBtn.innerHTML = 'Génération en cours...';
        aiBtn.classList.add('ai-loading');

        const workerUrl = loadWorkerUrl();
        if (!workerUrl) {
            aiBtn.disabled = false;
            aiBtn.innerHTML = '✦ Améliorer avec Claude AI';
            aiBtn.classList.remove('ai-loading');
            showToast('Configurez l\'URL du Worker Cloudflare dans ⚙ Claude AI.', 'error');
            openSettingsModal();
            return;
        }

        const model = loadModelPref();

        const systemPrompt = "Tu es un greffier expert pour le LSPD. Ta mission est de rédiger un rapport de police officiel, fluide, chronologique et détaillé EXCLUSIVEMENT à partir des options cochées (Modules 1 à 5) qui te sont fournies en notes brutes par l'officier.\n\nCONSIGNES DE RÉDACTION ABSOLUES :\n1. AUTOMATE SILENCIEUX : Ne génère aucune salutation, aucun avis, ni conclusion. Recrache uniquement le rapport.\n2. SYNTHÈSE NARRATIVE : Ne fais pas de liste. Transforme les données des modules en un récit procédural professionnel. Relie logiquement les événements (ex: relier le braquage à la poursuite, l'accident à la fuite à pied).\n3. FORMATAGE CLAIR : Structure le rapport avec des sections claires adaptées à la situation (ex: CONTEXTE, DÉROULEMENT DES FAITS, BILAN MATÉRIEL ET MÉDICAL, FOUILLES ET SAISIES, ÉTAT ET COMPORTEMENT).\n4. EXPLOITATION TOTALE : Mentionne précisément les tactiques d'interception (PIT, Herses) et les comportements routiers. Détaille les accidents, l'état des civils et dégâts. En cas de fusillade ou braquage, exploite toutes les données (armes, initiateur, otages). Pour les saisies, précise le matériel de trafic et justifie légalement la fouille.\n5. COMPORTEMENT ET DROITS : Mentionne l'attitude du suspect et son état d'altération (alcool/stups) pour orienter la décision du juge.\n6. INTÉGRITÉ LÉGALE : Utilise un jargon policier froid, factuel et irréprochable. N'invente jamais de faits non cochés.\n7. CODES RADIO INTERDITS : N'utilise JAMAIS de codes radio dans le rapport (10-31, 10-56, Code 3, Code 99, Code ROBERT, etc.). Décris systématiquement les faits en langage clair (ex: « refus d'obtempérer », « fusillade », « intervention urgente sirènes enclenchées »).";

        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: currentReport }]
                })
            });

            if (!response.ok) {
                let errMsg = `Erreur API ${response.status}`;
                try { const errData = await response.json(); errMsg = errData.error?.message || errMsg; } catch (_) { /* ignore */ }
                throw new Error(errMsg);
            }

            const data = await response.json();
            const enhanced = data.content && data.content[0] && data.content[0].text;
            if (!enhanced) throw new Error('Réponse vide reçue de l\'API.');

            preElement.textContent = sanitizeRadioCodes(enhanced);
            aiBtn.classList.remove('ai-loading');
            aiBtn.classList.add('ai-done');
            aiBtn.innerHTML = '✓ Amélioré par Claude AI';
            showToast('Rapport amélioré par Claude AI !');
        } catch (err) {
            aiBtn.disabled = false;
            aiBtn.innerHTML = '✦ Améliorer avec Claude AI';
            aiBtn.classList.remove('ai-loading');
            showToast('Erreur IA : ' + err.message, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CLOCK
    // ═══════════════════════════════════════════════════════════════════

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        $('#liveClock').textContent = `${h}:${m}:${s}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ═══════════════════════════════════════════════════════════════════
    // AGENT ROSTER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    // Roster par défaut du LSPD — import en masse (grade + nom complet).
    // Le matricule est laissé vide : champ optionnel, jamais utilisé comme
    // identifiant (la sélection d'agents repose sur l'index dans state.roster).
    const DEFAULT_ROSTER = [
        { grade: "Commander", name: "GREER Franklin" },
        { grade: "Captain I", name: "REED Samuel" },
        { grade: "Lieutenant I", name: "O'CONNEL Dean" },
        { grade: "Lieutenant I", name: "MONROE Tyler" },
        { grade: "Lieutenant I", name: "MAYFIELD James" },
        { grade: "Detective III", name: "RHYNE Cassius" },
        { grade: "Detective II", name: "ROBERTSON Jimmy" },
        { grade: "Sergeant I", name: "GRAVES Logan" },
        { grade: "Sergeant I", name: "MCCALL Raphaël" },
        { grade: "Sergeant I", name: "LANGFORD Ryker" },
        { grade: "Detective I", name: "LAM Harry Joseph" },
        { grade: "Detective I", name: "BAXTER Ethan" },
        { grade: "Detective I", name: "KIM Jae Seung" },
        { grade: "Detective I", name: "MCKINLEY JR. Nathan" },
        { grade: "Detective I", name: "KINGSLEY O'CONNOR Léon" },
        { grade: "Police Officer III+1 (SLO)", name: "HAÜLT Dirk" },
        { grade: "Police Officer III+1 (SLO)", name: "KEYES Emmett" },
        { grade: "Police Officer III", name: "OSMOND Rhett" },
        { grade: "Police Officer III", name: "GRAVES Zahra" },
        { grade: "Police Officer III", name: "LYNCH Randall" },
        { grade: "Police Officer III", name: "REED Elijah" },
        { grade: "Police Officer III", name: "COLE Ethan" },
        { grade: "Police Officer III", name: "MCCALL Phoenix" },
        { grade: "Police Officer III", name: "ESTRELLA SIERRA Elvira C." },
        { grade: "Police Officer II", name: "CHEN Li Wen" },
        { grade: "Police Officer II", name: "WEST May Love" },
        { grade: "Police Officer II", name: "GRAHAM Mason" },
        { grade: "Police Officer II", name: "LENS Sean" },
        { grade: "Police Officer II", name: "CALDWELL James" },
        { grade: "Police Officer II", name: "KREIS Conrad" },
        { grade: "Police Officer II", name: "WEBB Kade" },
        { grade: "Police Officer II", name: "PARKS Bao" },
        { grade: "Police Officer II", name: "JOHNSON Owen" },
        { grade: "Police Officer II", name: "CRUZ Rosa" },
        { grade: "Police Officer II", name: "ALI Omar" },
        { grade: "Police Officer II", name: "BOOTH Alicia" },
        { grade: "Police Officer II", name: "MCCOY Jesse" },
        { grade: "Police Officer II", name: "WHITE Joe" },
        { grade: "Police Officer II", name: "BRIGGS Marcus" },
        { grade: "Police Officer II", name: "LYNCHER Donovan" },
        { grade: "Police Officer II", name: "WAYNE Ethan" },
        { grade: "Police Officer II", name: "KANE Carolina" },
        { grade: "Police Officer II", name: "PRESCOTT Nolan" },
        { grade: "Police Officer II", name: "MENDES Camélia" },
        { grade: "Police Officer II", name: "LANGFORD Dallas" },
        { grade: "Police Officer II", name: "KANE Zaïre" },
        { grade: "Police Officer II", name: "SOLERO Sydney" },
        { grade: "Police Officer II", name: "REEVES Kaelen" },
        { grade: "Police Officer II", name: "DAVIS Blacke" },
        { grade: "Police Officer II", name: "SPEIRS Chester" },
        { grade: "Police Officer II", name: "TELLER Hayden" },
        { grade: "Police Officer II", name: "BISHOP Nick" },
        { grade: "Police Officer I", name: "KENNEDY Frank Jackson" },
        { grade: "Police Officer I", name: "MONROE June" },
        { grade: "Police Officer I", name: "MENDES Ignacio" },
        { grade: "Police Officer I", name: "ORTEGA Isaac" },
        { grade: "Police Officer I", name: "ORTEGA Elias" },
        { grade: "Police Officer I", name: "MARTINEZ Javier" },
        { grade: "Police Officer I", name: "ORTEGA Noah" }
    ];

    // Amorçage unique du roster par défaut : fusion sans écraser les agents
    // déjà présents, dédoublonnage par nom, et sans ressusciter un agent que
    // l'utilisateur aurait supprimé (drapeau localStorage posé une seule fois).
    function seedDefaultRoster() {
        let alreadySeeded = false;
        try { alreadySeeded = !!localStorage.getItem('lspd_roster_seeded_v1'); } catch (e) { /* localStorage indispo */ }
        if (alreadySeeded) return;
        const existing = new Set(state.roster.map(a => (a.name || '').trim().toLowerCase()));
        let added = 0;
        DEFAULT_ROSTER.forEach(a => {
            const key = (a.name || '').trim().toLowerCase();
            if (!key || existing.has(key)) return;
            state.roster.push({ grade: (a.grade || 'Officier').slice(0, 50), name: a.name.slice(0, 100), matricule: '' });
            existing.add(key);
            added++;
        });
        try { localStorage.setItem('lspd_roster_seeded_v1', '1'); } catch (e) { /* ignore */ }
        if (added) saveRoster();
    }

    function loadRoster() {
        try {
            const saved = localStorage.getItem('lspd_roster');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    state.roster = parsed
                        .filter(a => a && typeof a === 'object' && !Array.isArray(a))
                        .map(a => ({
                            grade: typeof a.grade === 'string' ? a.grade.slice(0, 50) : 'Officier',
                            name: typeof a.name === 'string' ? a.name.slice(0, 100) : '',
                            matricule: typeof a.matricule === 'string' ? a.matricule.slice(0, 20) : ''
                        }))
                        .filter(a => a.name.length > 0);
                }
            }
        } catch (e) { state.roster = []; }
        seedDefaultRoster();
    }

    function saveRoster() {
        try {
            localStorage.setItem('lspd_roster', JSON.stringify(state.roster));
        } catch (e) { /* ignore */ }
    }

    function renderRosterList() {
        const list = $('#rosterList');
        list.innerHTML = '';
        if (state.roster.length === 0) {
            list.innerHTML = '<div class="roster-selector-empty">Aucun agent enregistré. Ajoutez des agents ci-dessus.</div>';
            return;
        }
        state.roster.forEach((agent, idx) => {
            const row = document.createElement('div');
            row.className = 'roster-agent';
            row.innerHTML = `
                <div class="roster-agent-info">
                    <span class="roster-agent-grade">${escapeHtml(agent.grade)}</span>
                    <span class="roster-agent-name">${escapeHtml(agent.name)}</span>
                    <span class="roster-agent-matricule">${escapeHtml(agent.matricule)}</span>
                </div>
                <button class="roster-agent-remove" data-idx="${idx}" title="Supprimer">&times;</button>
            `;
            row.querySelector('.roster-agent-remove').addEventListener('click', () => {
                state.roster.splice(idx, 1);
                saveRoster();
                renderRosterList();
                refreshAllRosterSelectors();
            });
            list.appendChild(row);
        });
    }

    const _escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const _escapeRe = /[&<>"']/g;
    function escapeHtml(str) {
        return String(str || '').replace(_escapeRe, c => _escapeMap[c]);
    }

    function addAgentToRoster() {
        if (state.roster.length >= 200) { showToast('Roster limité à 200 agents maximum.', 'error'); return; }
        const grade = $('#rosterNewGrade').value.trim().slice(0, 50);
        const name = $('#rosterNewName').value.trim().slice(0, 100);
        const matricule = $('#rosterNewMatricule').value.trim().slice(0, 20);
        if (!name) { showToast('Veuillez saisir au moins le nom de l\'agent.', 'error'); return; }
        state.roster.push({ grade: grade || 'Officier', name, matricule: matricule || '' });
        saveRoster();
        renderRosterList();
        refreshAllRosterSelectors();
        $('#rosterNewGrade').value = '';
        $('#rosterNewName').value = '';
        $('#rosterNewMatricule').value = '';
        showToast(`Agent "${name}" ajouté au roster.`);
    }

    $('#btnAddAgent').addEventListener('click', addAgentToRoster);
    // Allow Enter key in roster inputs
    ['rosterNewGrade', 'rosterNewName', 'rosterNewMatricule'].forEach(id => {
        $(`#${id}`).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addAgentToRoster(); } });
    });

    // Normalisation pour la recherche : minuscules + suppression des accents
    // (NFD décompose « é » en « e » + diacritique, qu'on retire). Ainsi « raphael »
    // retrouve « Raphaël ».
    function rosterNormalize(str) {
        return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    // Referme un sélecteur (retour à l'état chips) + réinitialise sa recherche.
    function closeRosterSelector(container) {
        container.classList.remove('open');
        const input = container.querySelector('.roster-search-input');
        if (input) input.value = '';
        container.querySelectorAll('.roster-grid .tag-btn').forEach(b => { b.style.display = ''; });
        const nr = container.querySelector('.roster-no-results');
        if (nr) nr.hidden = true;
    }

    // Gestionnaire global installé une seule fois : referme tout sélecteur ouvert
    // au clic EN DEHORS de son conteneur (test sel.contains(e.target), pour ne pas
    // se refermer au clic sur un bouton de la grille) ou sur Échap.
    let rosterDismissInstalled = false;
    function installRosterDismiss() {
        if (rosterDismissInstalled) return;
        rosterDismissInstalled = true;
        document.addEventListener('click', e => {
            document.querySelectorAll('.roster-selector.open').forEach(sel => {
                if (!sel.contains(e.target)) closeRosterSelector(sel);
            });
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.roster-selector.open').forEach(closeRosterSelector);
            }
        });
    }

    function buildRosterSelector(containerId, moduleKey) {
        const container = $(`#${containerId}`);
        if (!container) return;
        installRosterDismiss();
        container.innerHTML = '';
        container.classList.remove('has-search', 'open');
        if (state.roster.length === 0) {
            container.innerHTML = '<span class="roster-selector-empty">Ajoutez des agents depuis le Dashboard.</span>';
            return;
        }
        container.classList.add('has-search');

        // Barre de recherche : toujours visible, c'est le point d'entrée qui ouvre
        // la grille (reconstruite → vide, donc réinitialisée).
        const bar = document.createElement('div');
        bar.className = 'roster-search-bar';
        bar.innerHTML = '<span class="roster-search-icon" aria-hidden="true">⌕</span>';
        const search = document.createElement('input');
        search.type = 'text';
        search.className = 'roster-search-input';
        search.placeholder = 'Rechercher un agent...';
        search.autocomplete = 'off';
        bar.appendChild(search);
        container.appendChild(bar);

        // État fermé : chips des agents sélectionnés.
        const chipsEl = document.createElement('div');
        chipsEl.className = 'roster-chips';
        container.appendChild(chipsEl);

        // État ouvert : grille complète (masquée par CSS tant que .open est absent).
        const grid = document.createElement('div');
        grid.className = 'roster-grid';
        container.appendChild(grid);

        const noRes = document.createElement('div');
        noRes.className = 'roster-no-results';
        noRes.textContent = 'Aucun agent trouvé';
        noRes.hidden = true;
        container.appendChild(noRes);

        // Chips = reflet de state.selectedAgents[moduleKey]. Le ✕ désélectionne
        // directement (met à jour le state, le bouton de grille et les chips).
        function renderChips() {
            chipsEl.innerHTML = '';
            const sel = state.selectedAgents[moduleKey].filter(i => i < state.roster.length);
            if (sel.length === 0) {
                chipsEl.innerHTML = '<span class="roster-selector-empty">Aucun agent sélectionné — cliquez sur la recherche pour en ajouter.</span>';
                return;
            }
            sel.forEach(idx => {
                const agent = state.roster[idx];
                const chip = document.createElement('span');
                chip.className = 'roster-chip';
                chip.innerHTML = `<span class="agent-grade">${escapeHtml(agent.grade)}</span> ${escapeHtml(agent.name)}`;
                const x = document.createElement('button');
                x.type = 'button';
                x.className = 'roster-chip-x';
                x.setAttribute('aria-label', 'Retirer ' + agent.name);
                x.textContent = '✕';
                x.addEventListener('click', () => {
                    const i = state.selectedAgents[moduleKey].indexOf(idx);
                    if (i > -1) state.selectedAgents[moduleKey].splice(i, 1);
                    const gb = grid.querySelector(`.tag-btn[data-idx="${idx}"]`);
                    if (gb) gb.classList.remove('active');
                    renderChips();
                });
                chip.appendChild(x);
                chipsEl.appendChild(chip);
            });
        }

        state.roster.forEach((agent, idx) => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn';
            btn.dataset.idx = idx;
            if (state.selectedAgents[moduleKey].includes(idx)) btn.classList.add('active');
            btn.innerHTML = `<span class="agent-grade">${escapeHtml(agent.grade)}</span> ${escapeHtml(agent.name)}${agent.matricule ? ' ' + escapeHtml(agent.matricule) : ''}`;
            // Clé de recherche : grade + nom + matricule, normalisés.
            btn.dataset.search = rosterNormalize(`${agent.grade} ${agent.name} ${agent.matricule || ''}`);
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    if (!state.selectedAgents[moduleKey].includes(idx)) state.selectedAgents[moduleKey].push(idx);
                } else {
                    const i = state.selectedAgents[moduleKey].indexOf(idx);
                    if (i > -1) state.selectedAgents[moduleKey].splice(i, 1);
                }
                renderChips();
            });
            grid.appendChild(btn);
        });

        // Filtrage temps réel sur nom + grade (masquage, sans retirer du DOM).
        function applyFilter(raw) {
            const q = rosterNormalize(raw.trim());
            let visible = 0;
            grid.querySelectorAll('.tag-btn').forEach(b => {
                const match = !q || b.dataset.search.indexOf(q) !== -1;
                b.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            noRes.hidden = visible !== 0;
        }

        // Ouverture : au focus/clic sur la recherche → grille visible, recherche
        // repartie de zéro (tous les agents affichés). La sélection est conservée.
        function openSelector() {
            if (container.classList.contains('open')) return;
            search.value = '';
            applyFilter('');
            container.classList.add('open');
        }
        search.addEventListener('focus', openSelector);
        bar.addEventListener('click', () => search.focus());
        search.addEventListener('input', () => applyFilter(search.value));

        renderChips();
    }

    function refreshAllRosterSelectors() {
        // Clean up stale indices
        ['standard', 'patrol', 'narcotics', 'cid', 'interrogation'].forEach(key => {
            state.selectedAgents[key] = state.selectedAgents[key].filter(i => i < state.roster.length);
        });
        if ($('#rfRoster')) buildRosterSelector('rfRoster', 'standard');
        buildRosterSelector('patrolRoster', 'patrol');
        buildRosterSelector('narcRoster', 'narcotics');
        buildRosterSelector('cidRoster', 'cid');
        buildRosterSelector('interroRoster', 'interrogation');
    }

    function getSelectedAgentNames(moduleKey) {
        return state.selectedAgents[moduleKey]
            .filter(i => i < state.roster.length)
            .map(i => {
                const a = state.roster[i];
                return `${a.grade} ${a.name}${a.matricule ? ' (' + a.matricule + ')' : ''}`;
            });
    }

    function getSelectedAgentsText(moduleKey) {
        const names = getSelectedAgentNames(moduleKey);
        return names.length > 0 ? names.join(', ') : 'Agent non spécifié';
    }

    // ═══════════════════════════════════════════════════════════════════
    // LSPD REPORT TEMPLATE — PRIORITÉ 0 (format de sortie officiel)
    // Template strict appliqué aux modules Patrouille, GND et CID.
    // ═══════════════════════════════════════════════════════════════════

    function lspdPad2(n) { return String(n).padStart(2, '0'); }

    function lspdFormatDate(dateInput) {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return '';
        return `${lspdPad2(d.getDate())}/${lspdPad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    }

    function lspdFormatTime(dateInput) {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return '';
        return `${lspdPad2(d.getHours())}h${lspdPad2(d.getMinutes())}`;
    }

    function lspdJoinFr(items) {
        const arr = items.filter(x => x !== '' && x != null);
        if (arr.length === 0) return '';
        if (arr.length === 1) return String(arr[0]);
        return arr.slice(0, -1).join(', ') + ' et ' + arr[arr.length - 1];
    }

    function lspdTitleCase(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/(^|[\s'\-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
    }

    function lspdSuspectFullName(suspect) {
        if (!suspect) return '';
        const fn = lspdTitleCase((suspect.firstname || '').trim());
        const ln = lspdTitleCase((suspect.lastname || '').trim());
        return `${fn} ${ln}`.trim();
    }

    // « Monsieur Mosley Zayron » — le rapport désigne le mis en cause par sa
    // civilité, pas par son seul état civil.
    function lspdSuspectCivilName(suspect) {
        const full = lspdSuspectFullName(suspect);
        if (!full) return '';
        return `${suspect.gender === 'Féminin' ? 'Madame' : 'Monsieur'} ${full}`;
    }

    // Récupère les véhicules du module Patrouille au format ligne unique.
    // Pour les modules sans formulaire véhicule (GND/CID), retourne « Non communiqué. ».
    function lspdFormatVehiclePatrol() {
        const v = getVehicleData();
        if (!v.model && !v.plate && (!v.color || v.color.length === 0) && (!v.state || v.state.length === 0)) {
            return 'Non communiqué.';
        }
        const parts = [];
        if (v.model) parts.push(v.model);
        if (v.color && v.color.length > 0) parts.push(v.color.join('/').toLowerCase());
        if (v.plate) parts.push(`plaque ${v.plate}`);
        if (v.state && v.state.length > 0) parts.push(v.state.join(', ').toLowerCase());
        return parts.join(', ') + '.';
    }

    // Lit les charges cochées + leur attribution multi-suspect (data-suspects
    // sur la checkbox). Renvoie { all, bySuspect } où bySuspect[i] = liste
    // d'infractions {name, qty, total} pour le suspect d'index i.
    function lspdCollectInfractions(penalContainerId, suspectCount) {
        const all = [];
        const bySuspect = {};
        const total = Math.max(suspectCount, 1);
        for (let i = 0; i < total; i++) bySuspect[i] = [];
        $$(`#${penalContainerId} input[type="checkbox"]:checked`).forEach(cb => {
            const catIdx = parseInt(cb.dataset.cat);
            const itemIdx = parseInt(cb.dataset.item);
            const qty = parseInt(cb.dataset.qty) || 1;
            const item = DB.penalCode[catIdx] && DB.penalCode[catIdx].items[itemIdx];
            if (!item) return;
            const calcFine = (item.fine || 0) * qty;
            const entry = { name: item.name, qty, total: calcFine, qtyUnit: item.qtyUnit || '' };
            all.push(entry);
            const attr = (cb.dataset.suspects || '').trim();
            let targets;
            if (!attr || total <= 1) {
                targets = []; for (let i = 0; i < total; i++) targets.push(i);
            } else {
                targets = attr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && bySuspect[n]);
                if (targets.length === 0) { targets = []; for (let i = 0; i < total; i++) targets.push(i); }
            }
            targets.forEach(idx => bySuspect[idx].push(entry));
        });
        return { all, bySuspect };
    }

    function lspdFormatInfractionsList(infractions) {
        if (!infractions || infractions.length === 0) return 'Néant';
        // « juste le délit » : nom clair de l'infraction + montant. La quantité
        // n'est rappelée que si elle est supérieure à 1 (sinon pas de « x1 » parasite).
        return infractions.map(i => {
            const qtyStr = i.qty > 1 ? ` (×${i.qty}${i.qtyUnit ? ' ' + i.qtyUnit : ''})` : '';
            return `- ${i.name}${qtyStr} — ${i.total}$`;
        }).join('\n');
    }

    function lspdTotalFine(infractions) {
        return (infractions || []).reduce((sum, i) => sum + (i.total || 0), 0);
    }

    // Construit UN bloc rapport conforme au template officiel.
    // ═══════════════════════════════════════════════════════════════════
    // FORMAT DE RAPPORT UNIFIÉ — en-tête « Informations : » + phrase d'ouverture
    // obligatoire, partagés par TOUS les modules d'intervention (standard,
    // patrol, GND, CID). Une seule source de vérité, pas de duplication.
    // ═══════════════════════════════════════════════════════════════════

    // Nom de famille = mot(s) tout en majuscules dans « NOM Prénom » (parsing
    // par détection des majuscules, décision validée). Ex. « OSMOND Rhett » →
    // « OSMOND » ; « ESTRELLA SIERRA Elvira C. » → « ESTRELLA SIERRA ».
    function lspdOfficerSurname(name) {
        const caps = String(name || '').match(/\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’-]+\b/g);
        return (caps && caps.length) ? caps.join(' ') : String(name || '').trim();
    }
    // « GRADE NOM Prénom » (ordre validé : nom de famille en premier, tel que
    // le roster le stocke déjà).
    function lspdOfficerFull(a) {
        return `${(a && a.grade) || 'Officier'} ${(a && a.name) || ''}`.trim();
    }
    // Agents sélectionnés (objets {grade,name,matricule}) pour un module.
    function lspdSelectedRoster(moduleKey) {
        return (state.selectedAgents[moduleKey] || [])
            .filter(i => i < state.roster.length)
            .map(i => state.roster[i]);
    }
    // « du GRADE NOM Prénom, du … et du … » — composition d'une patrouille.
    function lspdPatrolComposition(agents) {
        const parts = (agents || []).map(a => 'du ' + lspdOfficerFull(a));
        if (parts.length === 0) return "de l'unité en service";
        if (parts.length === 1) return parts[0];
        return parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
    }
    // Phrase d'ouverture OBLIGATOIRE, commune à tous les modules.
    // Rédigée à la 3e personne et à l'imparfait, comme le modèle de rapport
    // du DOJ : l'unité « effectuait » une patrouille « lorsqu'elle a constaté ».
    // La formulation dépend de l'origine de l'intervention, car constater une
    // infraction soi-même et répondre à un appel ne se racontent pas pareil.
    const ORIGINE_AMORCE = {
        'Constatation directe en patrouille': "effectuait une patrouille de routine",
        'Appel du dispatch': "a été requise par le dispatch",
        "Renfort d'une autre unité": "s'est portée en renfort d'une unité déjà engagée",
        'Contrôle programmé': "procédait à un contrôle programmé"
    };

    function lspdBuildIntro(date, time, agents, motif, opts) {
        const o = opts || {};
        const composition = lspdPatrolComposition(agents);
        const origine = o.origine || 'Constatation directe en patrouille';
        const amorce = ORIGINE_AMORCE[origine] || ORIGINE_AMORCE['Constatation directe en patrouille'];
        const constat = (o.constatation || '').trim();
        // L'indicatif désigne l'unité avant sa composition : « L'unité 14A56,
        // composée du … ». Sans indicatif, la formule reste « l'unité composée … ».
        const sujet = o.indicatif ? `l'unité ${o.indicatif}, composée ${composition},` : `l'unité composée ${composition}`;

        let s = `Le ${date}, aux alentours de ${time}, ${sujet} ${amorce}`;

        if (origine === 'Appel du dispatch' || origine === "Renfort d'une autre unité") {
            s += ` pour ${motif || 'une intervention'}`;
            if (o.demandeur) s += `, à la demande ${deElide(o.demandeur)}`;
            s += '.';
            if (constat) s += ` Sur place, elle a constaté ${constat}.`;
            return s;
        }
        s += constat
            ? ` lorsqu'elle a constaté ${constat}.`
            : ` lorsqu'elle a été amenée à intervenir pour ${motif || 'une intervention'}.`;
        return s;
    }
    // Seconde patrouille agissant en parallèle (composition + action différentes).
    function lspdSecondPatrolSentence(agents, action) {
        if (!agents || !agents.length || !action) return '';
        return `Simultanément, la patrouille composée ${lspdPatrolComposition(agents)} a ${action}.`;
    }
    // En-tête commun. Champs optionnels absents → « NEANT » (comme la référence).
    function lspdBuildReportHeader(d) {
        let h = 'Informations :\n\n';
        h += `Date et heure des faits : Le ${d.date} vers ${d.time}\n`;
        h += `Lieu des faits : ${d.location || 'NEANT'}\n`;
        h += `Heure d'interpellation : ${d.arrestTime || 'NEANT'}\n`;
        h += `Procureur en charge : ${d.prosecutor || 'NEANT'}\n`;
        h += (d.titreCorps || 'Corps du rapport :') + '\n\n';
        return h;
    }

    function lspdBuildReportBlock(opts) {
        const header = lspdBuildReportHeader({
            date: opts.date, time: opts.time, location: opts.location,
            arrestTime: opts.arrestTime, prosecutor: opts.prosecutor,
            titreCorps: opts.titreCorps,
            sanction: opts.sanction, reglementSanction: opts.reglementSanction
        });
        // Ouverture : phrase obligatoire commune à tous les modules.
        const intro = lspdBuildIntro(opts.date, opts.time, opts.agents || [], opts.motif, {
            origine: opts.origine,
            constatation: opts.constatation,
            indicatif: opts.indicatif,
            demandeur: opts.demandeur
        });
        // L'ouverture est un paragraphe à part entière : le récit qui suit
        // est lui-même découpé en paragraphes, un par temps fort.
        let body = [intro, opts.narrative].filter(t => t && t.trim()).join('\n\n').trim();
        if (opts.vehicleStr && opts.vehicleStr !== 'Non communiqué.') {
            body += `\n\nVéhicule impliqué : ${opts.vehicleStr.replace(/\.\s*$/, '')}.`;
        }
        if (opts.infractions && opts.infractions.length) {
            body += `\n\nCharges retenues :\n${lspdFormatInfractionsList(opts.infractions)}\n\nAmende totale : ${lspdTotalFine(opts.infractions)}$`;
        }
        return sanitizeRadioCodes(header + body);
    }

    // Assemble plusieurs blocs (un par suspect) séparés par une ligne vide
    // et un séparateur ───────────.
    function lspdJoinBlocks(blocks) {
        return blocks.filter(Boolean).join('\n\n───────────\n\n');
    }

    // ─── Purge des codes radio du rapport final ───
    // Le rapport remis au commandement / DOJ est rédigé en langage clair :
    // aucun 10-code, status code ou code spécial ne doit y subsister, même
    // via un tag cliqué, une note libre ou une édition manuelle de l'aperçu.
    const STATUS_PLAIN = {
        '2': 'intervention urgente sans sirènes',
        '3': 'intervention urgente avec sirènes',
        '4': 'situation sous contrôle',
        '4-adam': 'situation sous contrôle, sans renforts',
        '5': 'surveillance discrète',
        '6': 'intervention en cours',
        '99': 'urgence générale'
    };
    function sanitizeRadioCodes(text) {
        if (!text) return text;
        let t = String(text);
        // Libellés spéciaux → équivalent en clair
        t = t.replace(/agent down/gi, 'agent à terre');
        t = t.replace(/code\s*robert\s*(?:—|–|-)\s*/gi, '');
        t = t.replace(/code\s*sam\s*(?:—|–|-)\s*/gi, '');
        // « (10-XX) » / « (Code X) » entre parenthèses → suppression pure
        t = t.replace(/\s*\(\s*(?:10-\d{1,2}|code\s*(?:\d{1,3}|4-adam|robert|sam))\s*\)/gi, '');
        // 10-codes nus → signification en clair (première lettre en minuscule)
        t = t.replace(/\b10-\d{1,2}\b/g, m => {
            const desc = DB.tenCodes[m] || DB.procedural10Codes[m];
            return desc ? desc.charAt(0).toLowerCase() + desc.slice(1) : '';
        });
        // Status codes nus → signification en clair
        t = t.replace(/\bcode\s*(4-adam|2|3|4|5|6|99)\b/gi, (m, c) => STATUS_PLAIN[c.toLowerCase()] || '');
        // Nettoyage typographique des résidus (on préserve l'espace
        // avant « : ; ! ? », conforme à la typographie française)
        t = t.replace(/\(\s*\)/g, '');
        t = t.replace(/[ \t]{2,}/g, ' ');
        t = t.replace(/ +([,.])/g, '$1');
        return t;
    }

    // ─── Narrative builder pragmatique (passé composé, 1 paragraphe) ───
    // Style administratif. Reformule les tags en phrases continues.
    function lspdBuildOpsModulesProse() {
        const getActive = (id) => {
            const c = document.getElementById(id);
            return c ? [...c.querySelectorAll('.tag-btn.active')].map(b => b.dataset.tag) : [];
        };
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };
        const sent = [];

        // Module 1 — Refus d'obtempérer & Course-poursuite
        const m1d = getActive('m1Danger');
        const m1i = getActive('m1Interception');
        const m1a = getActive('m1Arret');
        const m1s = getActive('m1Suite');
        const m1f = getActive('m1Fuite');
        if (m1d.length || m1i.length || m1a.length || m1s.length || m1f.length) {
            const parts = [];
            if (m1d.length) parts.push(`Durant la course-poursuite, le conducteur a adopté un comportement dangereux : ${m1d.join(', ').toLowerCase()}`);
            else parts.push(`Une course-poursuite a été engagée`);
            if (m1i.length) parts.push(`les techniques d'interception suivantes ont été employées : ${m1i.join(', ').toLowerCase()}`);
            if (m1a.length) parts.push(`le véhicule s'est finalement immobilisé (${m1a.join(', ').toLowerCase()})`);
            if (m1s.length) parts.push(`dans l'immédiat : ${m1s.join(', ').toLowerCase()}`);
            if (m1f.length) parts.push(`issue de la fuite à pied : ${m1f.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 2 — Accidents & Dommages Collatéraux
        const m2c = getActive('m2Collision');
        const m2p = getVal('m2NbPietons');
        const m2n = getVal('m2NbConducteurs');
        const m2e = getActive('m2EtatCivils');
        const m2dg = getActive('m2Degats');
        if (m2c.length || (m2p && m2p !== '0') || (m2n && m2n !== '0') || m2e.length || m2dg.length) {
            const parts = [];
            parts.push(m2c.length
                ? `Un accident de la circulation a été constaté (collision de type ${m2c.join(', ').toLowerCase()})`
                : `Un accident de la circulation a été constaté`);
            if (m2p && m2p !== '0') parts.push(`${m2p} piéton(s) percuté(s)`);
            if (m2n && m2n !== '0') parts.push(`${m2n} conducteur(s) civil(s) impliqué(s)`);
            if (m2e.length) parts.push(`état des civils touchés : ${m2e.join(', ').toLowerCase()}`);
            if (m2dg.length) parts.push(`dégâts matériels publics relevés : ${m2dg.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 3 — Fusillade & Violences Armées
        const m3i = getActive('m3Initiateur');
        const m3a = getActive('m3Agression');
        const m3ar = getActive('m3Armes');
        const m3b = getActive('m3BilanLSPD');
        if (m3i.length || m3a.length || m3ar.length || m3b.length) {
            const parts = [];
            parts.push(m3i.length
                ? `Des violences armées ont éclaté, initiées par : ${m3i.join(', ').toLowerCase()}`
                : `Des violences armées ont éclaté`);
            if (m3a.length) parts.push(`type d'agression : ${m3a.join(', ').toLowerCase()}`);
            if (m3ar.length) parts.push(`armes en cause : ${m3ar.join(', ').toLowerCase()}`);
            if (m3b.length) parts.push(`bilan côté LSPD : ${m3b.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 4 — Braquages & Prises d'otages
        const m4c = getActive('m4Cible');
        const m4nb = getVal('m4NbOtages');
        const m4t = getActive('m4TypeOtages');
        const m4bi = getActive('m4BilanOtages');
        const m4de = getActive('m4Demandes');
        const m4fu = getActive('m4Fuite');
        if (m4c.length || m4nb || m4t.length || m4bi.length || m4de.length || m4fu.length) {
            const parts = [];
            parts.push(m4c.length
                ? `Un braquage a été perpétré contre : ${m4c.join(', ').toLowerCase()}`
                : `Un braquage a été perpétré`);
            if (m4nb) parts.push(`${m4nb} otage(s) recensé(s)${m4t.length ? ` (${m4t.join(', ').toLowerCase()})` : ''}`);
            else if (m4t.length) parts.push(`otages : ${m4t.join(', ').toLowerCase()}`);
            if (m4bi.length) parts.push(`bilan des otages : ${m4bi.join(', ').toLowerCase()}`);
            if (m4de.length) parts.push(`revendications des suspects : ${m4de.join(', ').toLowerCase()}`);
            if (m4fu.length) parts.push(`modalité de fuite : ${m4fu.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 5 — Stupéfiants, Contrebande & Perquisitions
        const m5n = getActive('m5Nature');
        const m5dr = getActive('m5Drogue');
        const m5ag = getVal('m5ArgentSale');
        const m5m = getActive('m5Materiel');
        const m5p = getActive('m5Perquisition');
        if (m5n.length || m5dr.length || (m5ag && m5ag !== '0') || m5m.length || m5p.length) {
            const parts = [];
            parts.push(m5n.length
                ? `Une infraction à la législation sur les stupéfiants a été caractérisée (${m5n.join(', ').toLowerCase()})`
                : `Une infraction à la législation sur les stupéfiants a été caractérisée`);
            if (m5dr.length) parts.push(`produits en cause : ${m5dr.join(', ').toLowerCase()}`);
            if (m5ag && m5ag !== '0') parts.push(`${m5ag}$ d'argent sale saisi`);
            if (m5m.length) parts.push(`matériel de trafic saisi : ${m5m.join(', ').toLowerCase()}`);
            if (m5p.length) parts.push(`résultat de la perquisition : ${m5p.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 6 — Violences Domestiques & Personnes Vulnérables
        const m6t = getActive('m6Trigger');
        if (m6t.length) {
            const parts = [`L'unité est intervenue dans le cadre d'un signalement de ${m6t.join(', ').toLowerCase()}`];
            const m6v = getActive('m6Victime');
            if (m6v.length) parts.push(`la victime a été identifiée comme ${m6v.join(', ').toLowerCase()}`);
            const m6n = getActive('m6Nature');
            if (m6n.length) parts.push(`la nature des faits relevait de ${m6n.join(', ').toLowerCase()}`);
            const m6e = getActive('m6Etat');
            if (m6e.length) parts.push(`l'état de la victime a été évalué comme ${m6e.join(', ').toLowerCase()}`);
            const m6w = getActive('m6Temoins');
            if (m6w.length) parts.push(`témoins présents : ${m6w.join(', ').toLowerCase()}`);
            const m6d = getActive('m6Desescalade');
            if (m6d.length) parts.push(`des mesures de désescalade ont été employées (${m6d.join(', ').toLowerCase()})`);
            const m6i = getActive('m6Issue');
            if (m6i.length) parts.push(`l'intervention s'est conclue par : ${m6i.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 7 — Scène de Décès / DOA
        const m7t = getActive('m7Trigger');
        if (m7t.length) {
            const parts = [`Une scène de décès a été constatée (${m7t.join(', ').toLowerCase()})`];
            const m7e = getActive('m7Etat');
            if (m7e.length) parts.push(`état du corps : ${m7e.join(', ').toLowerCase()}`);
            const m7h = getActive('m7Heure');
            if (m7h.length) parts.push(`heure estimée du décès : ${m7h.join(', ').toLowerCase()}`);
            const m7s = getActive('m7Scene');
            if (m7s.length) {
                let s = `scène : ${m7s.join(', ').toLowerCase()}`;
                const j = getVal('m7SceneJustif');
                if (j && m7s.includes('Scène non préservée')) s += ` (${j})`;
                parts.push(s);
            }
            const m7c = getActive('m7Coroner');
            if (m7c.length) parts.push(`coroner : ${m7c.join(', ').toLowerCase()}`);
            const m7f = getActive('m7Famille');
            if (m7f.length) parts.push(`famille : ${m7f.join(', ').toLowerCase()}`);
            const m7ci = getActive('m7Cid');
            if (m7ci.length) parts.push(`transmission CID : ${m7ci.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        // Module 8 — Incidents Spéciaux
        const m8t = getActive('m8Trigger');
        if (m8t.length) {
            const parts = [`Un incident spécial a été pris en charge (${m8t.join(', ').toLowerCase()})`];
            const m8p = getVal('m8Perimetre');
            if (m8p && m8p !== '0') parts.push(`un périmètre de sécurité de ${m8p} mètres a été établi`);
            const m8e = getActive('m8Evac');
            if (m8e.length) {
                let s = `civils évacués : ${m8e.join(', ').toLowerCase()}`;
                const n = getVal('m8EvacNb');
                if (n && n !== '0') s += ` (${n} personnes)`;
                parts.push(s);
            }
            const m8u = getActive('m8Units');
            if (m8u.length) parts.push(`unités spécialisées engagées : ${m8u.join(', ').toLowerCase()}`);
            const m8i = getActive('m8Issue');
            if (m8i.length) parts.push(`issue : ${m8i.join(', ').toLowerCase()}`);
            sent.push(parts.join(' ; ') + '.');
        }

        return sent.join(' ');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PALPATION DE SÉCURITÉ / FOUILLE — deux régimes, deux récits
    //
    // La palpation (Titre IV, ch. 2) est une mesure de sûreté : on dit ce
    // qu'elle cherchait à écarter. La fouille (ch. 1) est une mesure de
    // preuve : on dit sur quelle base elle a été entreprise, et ce qu'elle
    // a produit est inventorié puis placé sous scellés.
    // ═══════════════════════════════════════════════════════════════════

    const MOTIF_PALPATION_PROSE = {
        "Comportement laissant craindre le port d'une arme": "son comportement laissant craindre le port d'une arme",
        'Individu signalé comme armé': "l'intéressé ayant été signalé comme armé",
        "Contexte d'intervention à risque (coups de feu, braquage)": "le contexte de l'intervention faisant craindre la présence d'une arme",
        'Sécurité des agents préalablement au transport': "par mesure de sûreté préalablement au transport",
        'Objet suspect apparent sur la personne': "un objet suspect étant apparent sur sa personne",
        'Aucun motif particulier — palpation systématique': ''
    };

    const MOTIF_FOUILLE_PROSE = {
        "Fouille incidente à l'arrestation": "de manière incidente à l'arrestation",
        'Suspicion raisonnable de détention de preuves': "sur la base de suspicions raisonnables de détention de preuves",
        "Consentement exprès de l'individu": "avec le consentement exprès de l'intéressé",
        "Exécution d'un mandat de perquisition": "en exécution d'un mandat de perquisition",
        "Antécédents judiciaires de l'individu": "au regard des antécédents judiciaires de l'intéressé"
    };

    // Les libellés de la grille des saisies sont des constats (« Arme à feu
    // saisie ») et non des groupes nominaux : ils ne peuvent pas être insérés
    // tels quels après « la saisie de ».
    const EVIDENCE_PROSE = {
        'Arme à feu saisie': 'une arme à feu',
        'Arme(s) blanche(s) saisie(s)': 'une arme blanche',
        'Munitions saisies': 'des munitions',
        'Argent liquide non déclaré': "une somme d'argent liquide non déclarée",
        'Faux documents / Pièces falsifiées': 'des documents falsifiés',
        "Matériel d'effraction": "du matériel d'effraction",
        'Téléphone crypté / Prepaid': 'un téléphone crypté',
        'Téléphone à usage unique / Burner': 'un téléphone à usage unique',
        'Masque de ski / Cagoule': 'une cagoule',
        'Balaclava / Tenue de cambriolage': 'une tenue de cambriolage',
        'Gilet pare-balles illégal': 'un gilet pare-balles illégal',
        "Fausse plaque d'immatriculation": "une fausse plaque d'immatriculation",
        'Clés de véhicule volé': 'des clés de véhicule volé',
        'Outil de crochetage': "un outil de crochetage",
        'Liens de contention': 'des liens de contention',
        'Radio criminelle / Oreillette': 'une radio criminelle',
        'Plans du site / Bâtiment': 'des plans du site'
    };

    // « Complicité avérée » figure dans la même grille mais ne désigne pas un
    // objet : elle n'a rien à faire dans une phrase de saisie.
    const EVIDENCE_NON_OBJET = /complicité/i;

    function evidenceProse(tag) {
        if (EVIDENCE_PROSE[tag]) return EVIDENCE_PROSE[tag];
        return withArticle(String(tag).replace(/\s*saisie?e?s?\s*$/i, '').trim().toLowerCase());
    }

    // Liste des éléments saisis en patrouille, enrichie du modèle et du
    // numéro de série de l'arme ainsi que du calibre des munitions.
    function patrolSaisies() {
        const brut = (state.patrol.evidence || []).filter(t => !EVIDENCE_NON_OBJET.test(t));
        const modele = ($('#patrolFirearmModelCustom') && $('#patrolFirearmModelCustom').value.trim()) || '';
        const serie = ($('#patrolFirearmSerial') && $('#patrolFirearmSerial').value.trim()) || '';
        const calibres = state.patrol.ammoTypes || [];

        return brut.map(tag => {
            if (/arme à feu/i.test(tag) && modele) {
                return `une arme de type ${modele}${serie ? ` (identifiant : ${serie})` : ''}`;
            }
            if (/munitions/i.test(tag) && calibres.length) {
                return `des munitions de calibre ${lspdJoinFr(calibres)}`;
            }
            return evidenceProse(tag);
        });
    }

    // `objets` : libellés des éléments saisis. `feminin` accorde les pronoms.
    function controleLines(moduleKey, suspRef, objets, feminin) {
        const cf = k => complianceGet(moduleKey, k);
        const nature = cf('natureControle');
        if (!nature || nature === 'Aucune palpation ni fouille') return [];

        const auteur = cf('auteurControle');
        const liste = (objets || []).filter(Boolean).map(o => String(o).trim());
        const saisie = liste.length ? lspdJoinFr(liste) : '';
        const soi = feminin ? 'elle-même' : 'lui-même';
        const lines = [];

        const palpation = /Palpation/.test(nature);
        const fouille = /[Ff]ouille/.test(nature);

        if (palpation) {
            // Une palpation qui aboutit à une saisie se raconte par son
            // résultat ; sinon par la vérification qu'elle opérait.
            if (saisie && !fouille) {
                lines.push(`La palpation de sécurité${auteur ? `, réalisée par ${auteur},` : ''}`
                    + ` a permis la saisie sur ${suspRef} ${deElide(saisie)}.`);
            } else {
                const motif = MOTIF_PALPATION_PROSE[cf('motifPalpation')] || '';
                let s = `Une palpation de sécurité a été réalisée sur ${suspRef}`;
                if (auteur) s += ` par ${auteur}`;
                if (motif) s += `, ${motif}`;
                s += `, afin de vérifier l'absence de tout objet dangereux pour ${soi} ou pour autrui.`;
                lines.push(s);
            }
            if (/abri/i.test(cf('discretionPalpation'))) {
                lines.push("Elle a été effectuée à l'abri du regard du public.");
            }
        }

        if (fouille) {
            const motif = MOTIF_FOUILLE_PROSE[cf('motifFouille')] || '';
            let s = palpation ? 'Une fouille a ensuite été réalisée' : `Une fouille a été réalisée sur ${suspRef}`;
            if (auteur && !palpation) s += ` par ${auteur}`;
            if (motif) s += ` ${motif}`;
            lines.push(s + '.');
            if (saisie) {
                lines.push(`Elle a permis la saisie ${deElide(saisie)}.`);
                lines.push("L'ensemble a fait l'objet d'un inventaire détaillé et d'un placement sous scellés.");
            }
        } else if (palpation && saisie) {
            lines.push("L'élément saisi a été placé sous scellés.");
        }

        return lines;
    }

    // Moyens de contrainte → groupe nominal utilisable dans une phrase.
    // Les libellés de tags sont écrits du point de vue de l'interface
    // (« Les agents ont riposté par arme à feu ») et ne peuvent pas être
    // recopiés tels quels dans le récit sans répéter le sujet.
    const FORCE_PROSE = {
        'Injonctions verbales effectuées': 'injonctions verbales',
        'Maîtrise physique / Plaquage au sol': 'une maîtrise physique par plaquage au sol',
        'Déploiement de gaz OC par les agents': 'gaz lacrymogène de type OC',
        'Déploiement du Taser par les agents': "un pistolet à impulsion électrique",
        'Usage du bâton télescopique par les agents': 'un bâton télescopique de défense',
        "Déploiement de l'unité K-9": "l'appui de l'unité cynophile",
        'Les agents ont riposté par arme à feu (tirs de riposte)': 'leur arme de service, en riposte aux tirs essuyés',
        'Tir de neutralisation ciblé par les agents': 'un tir de neutralisation ciblé',
        'Tir de sommation effectué par les agents': 'un tir de sommation',
        "Déploiement d'arme lourde demandé": "une arme d'appui, dont le déploiement a été sollicité",
        'Déploiement de beanbag demandé': 'un lanceur de balles souples'
    };

    // Issue de la poursuite → phrase de conclusion du paragraphe.
    const ISSUE_POURSUITE_PROSE = {
        'Collision du véhicule suspect avec le véhicule de service':
            "Le conducteur n'a pas été en mesure d'éviter l'obstacle et est entré en collision avec le véhicule de service, ce qui a provoqué l'immobilisation définitive de son véhicule.",
        'Immobilisation sans collision':
            "Le véhicule suspect a pu être immobilisé sans qu'aucun choc ne survienne.",
        'Sortie de route du véhicule suspect':
            "Le véhicule suspect a quitté la chaussée et s'est immobilisé hors de la voie de circulation.",
        'Abandon du véhicule et fuite à pied':
            "Le conducteur a abandonné son véhicule et poursuivi sa fuite à pied.",
        'Arrêt volontaire du conducteur':
            "Le conducteur a fini par obtempérer et immobiliser volontairement son véhicule."
    };

    const VERIF_PLAQUE_PROSE = {
        "Effectuée — véhicule appartenant à l'intéressé":
            "il s'est avéré que le véhicule appartenait bien à l'intéressé",
        "Effectuée — véhicule n'appartenant pas à l'intéressé":
            "il s'est avéré que le véhicule n'appartenait pas à l'intéressé",
        'Effectuée — véhicule signalé volé':
            "il s'est avéré que le véhicule faisait l'objet d'un signalement pour vol"
    };

    const VERIF_CASIER_PROSE = {
        'Effectuée — aucun antécédent': "n'a fait apparaître aucun antécédent",
        'Effectuée — antécédents relevés': 'a fait apparaître des antécédents judiciaires',
        "Effectuée — mandat d'arrêt actif": "a révélé l'existence d'un mandat d'arrêt actif"
    };

    // Récit de patrouille — rédigé en PARAGRAPHES, un par temps fort de
    // l'intervention, dans l'ordre chronologique réel :
    //
    //   1. poursuite engagée et renfort      5. usage de la force
    //   2. fin de poursuite et interception   6. prise en charge médicale
    //   3. interpellation et identification   7. notification des droits
    //   4. vérifications et constatations     8. fouille puis transport
    //
    // L'ouverture (constatation initiale) est portée en amont par
    // lspdBuildIntro, appelée depuis lspdBuildReportBlock.
    function lspdBuildPatrolNarrative(suspect, locationLabel) {
        const tags = state.patrol.tags;
        const cf = k => complianceGet('patrol', k);
        const paras = [];
        const push = (arr) => { const t = arr.filter(Boolean).join(' ').trim(); if (t) paras.push(t); };

        const suspRef = (suspect && suspect.lastname)
            ? `${suspect.gender === 'Féminin' ? 'Madame' : 'Monsieur'} ${lspdTitleCase(suspect.lastname)}`
            : "l'individu mis en cause";
        const suspName = suspect ? lspdSuspectCivilName(suspect) : '';

        // Usage de la force : rapporté dans le paragraphe d'interpellation,
        // comme le modèle. La justification exigée par les Art. 121 et 123
        // reste consignée, elle n'a simplement pas de paragraphe propre.
        function forceLines(ref) {
            const force = tags.force || [];
            if (!force.length) return [];
            const lines = [];
            const moyens = force.map(t => FORCE_PROSE[t] || t.toLowerCase());
            lines.push(`Afin de maîtriser ${ref}, les agents ont fait usage ${deElide(lspdJoinFr(moyens))}.`);
            const justif = cf('justificationForce');
            if (justif) lines.push(`Cet usage a été rendu nécessaire par ${justif}.`);
            const sommation = cf('sommation');
            if (sommation.indexOf('Oui') === 0) lines.push('Un avertissement clair avait été adressé au préalable.');
            else if (sommation.indexOf('circonstances') !== -1) lines.push("Les circonstances n'ont pas permis d'adresser un avertissement préalable.");
            const suspState = tags.suspect_state || [];
            if (suspState.length) lines.push(`L'état final constaté est le suivant : ${suspState[suspState.length - 1].toLowerCase()}.`);
            const agState = (tags.agent_state || []).filter(x => x !== 'Aucun agent blessé');
            if (agState.length) lines.push(`Côté agents du LSPD : ${agState.join(', ').toLowerCase()}.`);
            return lines;
        }

        // Fouille : rattachée au paragraphe des droits, l'Art. 4-1-4 imposant
        // que ceux-ci soient énoncés préalablement.
        let fouilleRendue = false;
        function fouilleLines() {
            const feminin = !!(suspect && suspect.gender === 'Féminin');
            const lignes = controleLines('patrol', suspRef, patrolSaisies(), feminin);
            if (lignes.length) {
                const gsr = cf('resultatGsr');
                if (gsr && gsr !== 'Non effectué') {
                    lignes.push(`Un test de résidus de poudre a également été réalisé sur ${suspRef} ;`
                        + ` il s'est révélé ${gsr.toLowerCase()}.`);
                }
                const preuve = cf('preuveMaterielle');
                if (preuve) lignes.push(`Les faits sont matériellement établis par ${preuve}.`);
                return lignes;
            }
            // Repli sur les tags historiques si le régime n'est pas renseigné.
            const sp = tags.search_person || [];
            const sv = tags.search_vehicle || [];
            if (!sp.length && !sv.length) return [];
            const lines = [`Une fouille a été effectuée sur les bases suivantes : ${[...sp, ...sv].join(', ').toLowerCase()}.`];
            const evidence = state.patrol.evidence || [];
            if (evidence.length) {
                lines.push(`Elle a permis la saisie des éléments suivants : ${evidence.join(', ').toLowerCase()}.`);
                lines.push("L'ensemble a fait l'objet d'un inventaire détaillé et d'une mise sous scellés.");
            }
            return lines;
        }

        // ─── 0. Arrivée sur les lieux : constat, dispositif, négociation ───
        {
            const p = [];
            const constat = cf('constatArrivee');
            const surv = cf('surveillance');
            if (surv) {
                p.push(`Arrivés sur zone, les agents ont procédé à ${surv}.`);
            }
            if (constat) {
                p.push(`À leur arrivée sur les lieux, les agents ont constaté ${constat}.`);
            }
            const dispositif = cf('dispositifSecurite');
            if (dispositif) p.push(`Un dispositif de sécurité a immédiatement été mis en place : ${dispositif}.`);
            const nego = cf('negociation');
            if (nego) p.push(`Des négociations ont été entamées par ${nego}.`);
            push(p);
        }

        // ─── 1. Poursuite engagée, renfort sollicité ───
        const flight = tags.suspect_flight || [];
        const pursuit = flight.length > 0 || (tags.pursuit_end || []).length > 0
            || (state.patrol.tenCodes || []).some(c => c === '10-56' || c === '10-55');
        const renfort = cf('uniteRenfort');

        if (pursuit) {
            const p = ["L'unité a immédiatement entrepris de prendre le véhicule en chasse et a sollicité du renfort par radio."];
            if (renfort) p.push(`L'unité composée ${renfort} s'est jointe à la poursuite.`);
            flight.forEach(f => p.push(`${f.replace(/\.$/, '')}.`));
            push(p);
        } else if (renfort) {
            push([`L'unité composée ${renfort} est intervenue en appui sur les lieux.`]);
        }

        // ─── 2. Fin de poursuite : lieu, manœuvre, issue ───
        const secteur = cf('secteur');
        const lieuFin = cf('lieuFinPoursuite');
        const manoeuvre = cf('manoeuvreInterception');
        const issue = cf('issuePoursuite');

        if (pursuit && (secteur || lieuFin || manoeuvre || issue)) {
            const p = [];
            if (secteur || lieuFin) {
                let s = 'Celle-ci a pris fin';
                if (secteur) s += ` dans le secteur de ${secteur}`;
                if (lieuFin) s += `, à hauteur de ${lieuFin}`;
                p.push(s + '.');
            }
            if (manoeuvre) {
                p.push(`${manoeuvre.charAt(0).toUpperCase() + manoeuvre.slice(1).replace(/\.$/, '')} afin de bloquer la progression du véhicule suspect.`);
            }
            p.push(ISSUE_POURSUITE_PROSE[issue] || '');
            push(p);
        } else if (!pursuit && secteur) {
            push([`Les faits se sont déroulés dans le secteur de ${secteur}.`]);
        }

        // ─── 3. Interpellation et identification ───
        {
            const p = [];
            const moyen = cf('moyenInterpellation');
            const parQuoi = moyen ? ` au moyen ${deElide(moyen)}` : ' par les unités présentes sur place';
            p.push(pursuit
                ? `Les occupants ont aussitôt été interpellés${parQuoi}.`
                : `L'individu a été interpellé sur place${parQuoi}.`);
            if (suspName) {
                // L'état civil complet n'entre au récit que si l'agent a
                // renseigné la nationalité : certains rapports le détaillent
                // (« né le …, de nationalité américaine »), d'autres se
                // limitent au nom. La date de naissance reste de toute façon
                // portée par l'en-tête, comme l'exige l'Art. 2-2-7.
                const nat = cf('nationaliteSuspect');
                const dob = (suspect && suspect.dob) ? `, né le ${suspect.dob}` : '';
                const etatCivil = nat ? `${dob}, de nationalité ${nat}` : '';
                p.push(pursuit
                    ? `${suspName}${etatCivil} a été identifié comme étant le conducteur du véhicule.`
                    : `Le mis en cause a été identifié comme étant ${suspName}${etatCivil}.`);
            }
            const obs = tags.suspect_obs || [];
            if (obs.length) p.push(`Il a été constaté chez ${suspRef} les éléments suivants : ${obs.join(', ').toLowerCase()}.`);
            const behavior = tags.behavior || [];
            if (behavior.length) p.push(`Le comportement adopté par ${suspRef} a été le suivant : ${behavior.join(', ').toLowerCase()}.`);
            const aggressor = tags.aggressor || [];
            const origin = tags.aggression_origin || [];
            if (aggressor.length) {
                let s = aggressor.join('. ').toLowerCase();
                if (origin.length) s += ` (${origin.join(', ')})`;
                p.push(`${s.charAt(0).toUpperCase() + s.slice(1)}.`);
            }
            p.push.apply(p, forceLines(suspRef));
            push(p);
        }

        // ─── 4. Vérifications ───
        {
            const p = [];
            const plaque = cf('verifPlaque');
            if (plaque && plaque.indexOf('Non effectuée') === -1) {
                p.push(`Après vérification effectuée sur la plaque d'immatriculation, ${VERIF_PLAQUE_PROSE[plaque] || 'les éléments recueillis ont été versés à la procédure'}.`);
            }
            const casier = cf('verifCasier');
            if (casier && casier.indexOf('Non effectuée') === -1) {
                p.push(`La consultation du casier judiciaire ${VERIF_CASIER_PROSE[casier] || "n'a rien révélé de particulier"}.`);
            }
            const tests = tags.tests || [];
            if (tests.length) p.push(`Les dépistages réalisés ont donné les résultats suivants : ${tests.join(', ').toLowerCase()}.`);
            push(p);
        }

        // ─── 6. Prise en charge médicale ───
        {
            const nature = cf('natureBlessure');
            const etab = cf('etablissement');
            const hEvac = cf('heureEvacuation');
            const hSortie = cf('heureSortieMedicale');
            if (nature || hEvac || etab) {
                const p = [];
                let s = nature ? `Présentant ${withArticle(nature)}, ${suspRef}` : suspRef;
                s += ' a été pris en charge par les services du LSFD et évacué vers ';
                s += etab ? `le ${etab}` : 'le centre hospitalier';
                s += hEvac ? ` à ${fmtH(hEvac)}.` : '.';
                p.push(s);
                if (hSortie) {
                    p.push(`Sa sortie a été prononcée à ${fmtH(hSortie)}, après autorisation expresse du corps médical de l'établissement.`);
                }
                const med = (tags.medical_end || []).filter(m => !/transport centre hospitalier/i.test(m));
                if (med.length) p.push(`Conclusion médicale : ${med.join(', ').toLowerCase()}.`);
                push(p);
            } else {
                const med = tags.medical_end || [];
                if (med.length) push([`Conclusion médicale et procédurale : ${med.join(', ').toLowerCase()}.`]);
            }
        }

        // ─── 7. Notification des droits ───
        {
            const miranda = tags.miranda || [];
            const hDroits = cf('heureDroits');
            const reaction = cf('reactionDroits');
            const evacue = !!cf('heureEvacuation');
            if (miranda.length || hDroits) {
                const p = [];
                if (evacue) p.push("Les agents se sont alors rendus sur place afin de reprendre en charge l'individu.");
                if (hDroits) p.push(`Ses droits lui ont été notifiés à ${fmtH(hDroits)}.`);
                else if (miranda.includes('Droits Miranda lus et compris')) p.push(`Les avertissements Miranda ont été lus à ${suspRef}.`);

                if (/pas été en mesure/i.test(reaction)) {
                    // Notification impossible sur place : le rapport doit dire
                    // pourquoi, puis à quelle heure elle a effectivement eu lieu.
                    const motif = cf('motifDroitsDifferes');
                    p.length = 0;
                    p.push(`Ses droits n'ont pas pu lui être notifiés sur place`
                        + (motif ? `, ${suspRef} étant ${motif.toLowerCase().replace(/^[^—]*—\s*/, '')}` : '')
                        + '.');
                    const hDiff = cf('heureDroitsDifferes');
                    if (hDiff) {
                        p.push(`Ils lui ont été lus et compris à ${fmtH(hDiff)},`
                            + ' après autorisation du corps médical.');
                    }
                } else if (reaction) {
                    p.push(`${suspName || suspRef} ${reaction.charAt(0).toLowerCase() + reaction.slice(1)}.`);
                } else {
                    if (miranda.includes('Droits Miranda lus et compris')) p.push(`${suspRef} a déclaré les avoir compris.`);
                    if (miranda.includes('Demande un avocat')) p.push(`${suspRef} a expressément sollicité l'assistance d'un avocat.`);
                }
                if (miranda.includes('Invoque le droit au silence')) p.push(`${suspRef} a invoqué son droit au silence.`);
                if (miranda.includes('Passe aux aveux spontanés')) p.push(`${suspRef} est passé aux aveux spontanés.`);
                p.push.apply(p, fouilleLines());
                push(p);
                fouilleRendue = true;
            }
        }

        // ─── 8. Fouille (si elle n'a pas suivi la notification des droits) ───
        if (!fouilleRendue) push(fouilleLines());
        {
            const hTransport = cf('heureTransport');
            const dest = cf('destinationTransport');
            if (hTransport || dest) {
                let s = `L'intéressé a ensuite été transporté`;
                if (dest) s += ` vers ${destinationPhrase(dest)}`;
                if (hTransport) s += ` à ${fmtH(hTransport)}`;
                push([s + " afin d'y poursuivre la procédure."]);
            }
        }

        const opsProse = lspdBuildOpsModulesProse();
        if (opsProse) push([opsProse]);

        const notes = $('#patrolNotes') ? $('#patrolNotes').value.trim() : '';
        if (notes) push([notes.replace(/\s*\n+\s*/g, ' ')]);

        return paras.join('\n\n');
    }

    function lspdBuildNarcNarrative(suspect, locationLabel, opType) {
        const sentences = [];
        // Ouverture portée par la phrase obligatoire (lspdBuildIntro) en amont.
        const intel = state.narcotics.intelSources || [];
        if (intel.length) sentences.push(`L'opération s'appuyait sur les sources de renseignement suivantes : ${intel.join(', ').toLowerCase()}.`);
        const intelDetail = ($('#narcIntelDetail') && $('#narcIntelDetail').value.trim()) || '';
        if (intelDetail) sentences.push(intelDetail.replace(/\s*\n+\s*/g, ' '));
        const surv = state.narcotics.surveillanceMeans || [];
        if (surv.length) sentences.push(`Une phase de surveillance discrète a été mise en place via : ${surv.join(', ').toLowerCase()}.`);
        const obs = state.narcotics.observations || [];
        if (obs.length) sentences.push(`Au cours de cette surveillance, nous avons observé : ${obs.join(', ').toLowerCase()}.`);
        const triggers = state.narcotics.interventionTriggers || [];
        if (triggers.length) sentences.push(`L'intervention a été déclenchée suite à : ${triggers.join(', ').toLowerCase()}.`);
        const approach = state.narcotics.approachMethods || [];
        if (approach.length) sentences.push(`Méthode d'approche : ${approach.join(', ').toLowerCase()}.`);
        const results = state.narcotics.operationResults || [];
        if (results.length) sentences.push(`Résultat de l'opération : ${results.join(', ').toLowerCase()}.`);
        const suspName = suspect ? lspdSuspectFullName(suspect) : '';
        if (suspName) sentences.push(`Le mis en cause a été identifié comme étant ${suspName}.`);
        const weight = $('#narcWeight') ? ($('#narcWeight').value || '0') : '0';
        const money = $('#narcMoney') ? ($('#narcMoney').value || '0') : '0';
        if (parseInt(weight) > 0 || (state.narcotics.drugs || []).length) {
            sentences.push(`Saisie : ${(state.narcotics.drugs || []).join(', ') || 'stupéfiants'}, ${weight} grammes au total.`);
        }
        if (parseInt(money) > 0) sentences.push(`Argent liquide saisi : ${parseInt(money)}$.`);
        const notes = ($('#narcNotes') && $('#narcNotes').value.trim()) || '';
        if (notes) sentences.push(notes.replace(/\s*\n+\s*/g, ' '));
        return sentences.join(' ');
    }

    function lspdBuildCidNarrative(suspect, locationLabel) {
        const sentences = [];
        const crimeType = (state.cid && state.cid.crimeType) || [];
        // Ouverture portée par la phrase obligatoire (lspdBuildIntro) en amont.
        const ballistics = (state.cid && state.cid.ballistics) || [];
        if (ballistics.length) sentences.push(`L'analyse balistique préliminaire a révélé : ${ballistics.join(', ').toLowerCase()}.`);
        const shellCount = $('#cidShellCount') ? ($('#cidShellCount').value || '0') : '0';
        if (parseInt(shellCount) > 0) sentences.push(`${shellCount} douilles ont été récupérées et placées sous scellés.`);
        const fp = (state.cid && state.cid.fingerprints) || [];
        if (fp.length) sentences.push(`Empreintes : ${fp.join(', ').toLowerCase()}.`);
        const vict = (state.cid && state.cid.victims) || [];
        if (vict.length) sentences.push(`Bilan victimes : ${vict.join(', ').toLowerCase()}.`);
        const warrant = (state.cid && state.cid.warrant) || [];
        if (warrant.length && !warrant.includes('Aucun mandat nécessaire')) {
            const judge = $('#cidJudge') ? $('#cidJudge').value.trim() : '';
            const target = $('#cidWarrantTarget') ? $('#cidWarrantTarget').value.trim() : '';
            let s = `Mandat sollicité : ${warrant.join(', ').toLowerCase()}`;
            if (judge) s += `, signé par ${judge}`;
            if (target) s += `, ciblant ${target}`;
            sentences.push(`${s}.`);
        }
        const suspName = suspect ? lspdSuspectFullName(suspect) : '';
        if (suspName) sentences.push(`Le mis en cause a été identifié comme étant ${suspName}.`);
        return sentences.join(' ');
    }

    // ─── Sélecteur multi-suspect sur les charges (visible si ≥ 2 suspects) ───
    function lspdSuspectsForPenal(penalContainerId) {
        // Mappage container charges → container fiches suspects
        const map = {
            'patrolPenalInfractions': 'patrolSuspectCards',
            'narcPenalInfractions': 'narcSuspectCards'
        };
        const cardsId = map[penalContainerId];
        if (!cardsId) return [];
        const data = getSuspectsData(cardsId);
        // On ne propose que les fiches dont le rôle est « Suspect »
        return data.map((s, i) => ({ idx: i, role: s.role, label: lspdSuspectFullName(s) || `Suspect #${i + 1}` }))
                   .filter(s => (s.role || 'Suspect') === 'Suspect');
    }

    function lspdRenderPenalSuspectChips(penalContainerId) {
        const container = $(`#${penalContainerId}`);
        if (!container) return;
        const suspects = lspdSuspectsForPenal(penalContainerId);
        $$('.penal-row.checked', container).forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            const qtyRow = row.nextElementSibling;
            if (!qtyRow || !qtyRow.classList.contains('penal-qty-row')) return;
            let chipsRow = qtyRow.querySelector('.penal-suspects-chips');
            if (suspects.length < 2) {
                if (chipsRow) chipsRow.remove();
                if (cb) cb.dataset.suspects = '';
                return;
            }
            if (!chipsRow) {
                chipsRow = document.createElement('div');
                chipsRow.className = 'penal-suspects-chips';
                qtyRow.appendChild(chipsRow);
            }
            const current = (cb.dataset.suspects || '').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            const noneSelected = current.length === 0;
            chipsRow.innerHTML = `<span class="chip-label">Suspect(s) :</span>` + suspects.map(s => {
                const isOn = noneSelected || current.includes(s.idx);
                return `<button type="button" class="suspect-chip${isOn ? ' active' : ''}" data-suspect-idx="${s.idx}">${escapeHtml(s.label)}</button>`;
            }).join('');
            chipsRow.querySelectorAll('.suspect-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                    const active = [...chipsRow.querySelectorAll('.suspect-chip.active')]
                        .map(b => parseInt(b.dataset.suspectIdx));
                    cb.dataset.suspects = active.length === suspects.length ? '' : active.join(',');
                });
            });
        });
        // Cleanup chips on rows whose checkbox is now unchecked
        $$('.penal-row:not(.checked)', container).forEach(row => {
            const qtyRow = row.nextElementSibling;
            if (qtyRow) {
                const c = qtyRow.querySelector('.penal-suspects-chips');
                if (c) c.remove();
            }
        });
    }

    function lspdRefreshAllPenalChips() {
        lspdRenderPenalSuspectChips('patrolPenalInfractions');
        lspdRenderPenalSuspectChips('narcPenalInfractions');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUSPECT CARD MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function createSuspectCardHTML(num) {
        return `
            <div class="suspect-card" data-suspect="${num}">
                <div class="suspect-card-header">
                    <span class="suspect-card-number">Suspect #${num + 1}</span>
                    <button class="qa-remove suspect-remove" title="Supprimer">&times;</button>
                </div>
                <div class="form-grid">
                    <div class="form-group full-width"><label>Rôle</label><div class="tag-selector suspect-role"><button class="tag-btn active" data-tag="Suspect">Suspect</button><button class="tag-btn" data-tag="Victime armée">Victime armée</button><button class="tag-btn" data-tag="Victime non armée">Victime non armée</button><button class="tag-btn" data-tag="Dommage collatéral">Dommage collatéral</button></div></div>
                    <div class="form-group full-width suspect-victim-status-wrap" style="display:none;"><label>Statut / Lien avec l'incident</label><select class="suspect-victim-status"><option value="">-- Sélectionner --</option><option value="Cible directe / Victime principale">Cible directe / Victime principale</option><option value="Dommage collatéral : Passager du suspect">Dommage collatéral : Passager du suspect</option><option value="Dommage collatéral : Piéton innocent">Dommage collatéral : Piéton innocent</option><option value="Dommage collatéral : Occupant d'un autre véhicule">Dommage collatéral : Occupant d'un autre véhicule</option></select></div>
                    <div class="form-group"><label>Prénom(s)</label><input type="text" class="suspect-firstname" placeholder="Ex: Marcus"></div>
                    <div class="form-group"><label>Nom de famille <span style="font-weight:400;font-size:0.7rem;color:var(--text-muted)">(MAJUSCULES)</span></label><input type="text" class="suspect-lastname" placeholder="Ex: JOHNSON"></div>
                    <div class="form-group"><label>Date de Naissance</label><input type="text" class="suspect-dob" placeholder="JJ/MM/AAAA"></div>
                    <div class="form-group"><label>Sexe</label><div class="tag-selector suspect-gender"><button class="tag-btn" data-tag="Masculin">Masculin</button><button class="tag-btn" data-tag="Féminin">Féminin</button></div></div>
                    <div class="form-group"><label>Téléphone</label><input type="text" class="suspect-phone" placeholder="555-XXXX"></div>
                    <div class="form-group full-width"><label>Description Physique</label><div class="tag-selector suspect-description">
                        <button class="tag-btn" data-tag="Caucasien">Caucasien</button>
                        <button class="tag-btn" data-tag="Afro-américain">Afro-américain</button>
                        <button class="tag-btn" data-tag="Hispanique">Hispanique</button>
                        <button class="tag-btn" data-tag="Asiatique">Asiatique</button>
                        <button class="tag-btn" data-tag="Corpulence mince">Mince</button>
                        <button class="tag-btn" data-tag="Corpulence moyenne">Moyen</button>
                        <button class="tag-btn" data-tag="Corpulence forte">Fort</button>
                        <button class="tag-btn" data-tag="Tatouages visibles">Tatouages</button>
                        <button class="tag-btn" data-tag="Cicatrices visibles">Cicatrices</button>
                        <button class="tag-btn" data-tag="Portant un masque">Masqué</button>
                        <button class="tag-btn" data-tag="Capuche / Hoodie">Capuche</button>
                        <button class="tag-btn" data-tag="Vêtements sombres">Vêtements sombres</button>
                        <button class="tag-btn" data-tag="Vêtements clairs">Vêtements clairs</button>
                    </div></div>
                    <div class="form-group full-width"><label>État de Santé</label><div class="tag-selector suspect-health">
                        <button class="tag-btn" data-tag="Indemne">Indemne</button>
                        <button class="tag-btn" data-tag="En état de choc">En état de choc</button>
                        <button class="tag-btn" data-tag="Blessure par balle (GSW)">GSW</button>
                        <button class="tag-btn" data-tag="Blessure à l'arme blanche">Arme blanche</button>
                        <button class="tag-btn" data-tag="Traumatisme / Coups">Trauma / Coups</button>
                        <button class="tag-btn" data-tag="Inconscient">Inconscient</button>
                        <button class="tag-btn" data-tag="Décédé">Décédé</button>
                    </div></div>
                    <div class="form-group full-width"><label>Fin Médicale</label><div class="tag-selector suspect-medical-end">
                        <button class="tag-btn" data-tag="Refus de soins">Refus de soins</button>
                        <button class="tag-btn" data-tag="Soins EMS sur place">EMS sur place</button>
                        <button class="tag-btn" data-tag="Transport Centre Hospitalier">Transport Hôpital</button>
                        <button class="tag-btn" data-tag="Apte à l'incarcération">Apte incarcération</button>
                        <button class="tag-btn" data-tag="Maintenu en observation">Observation</button>
                    </div></div>
                    <div class="form-group full-width suspect-bodymap-wrap" style="display:none;"><label>Zones Blessées</label>
                        <div class="suspect-bodymap-row">
                            <div class="suspect-bodymap">
                                <svg class="body-map-svg-mini" viewBox="0 0 200 480" xmlns="http://www.w3.org/2000/svg">
                                    <defs><linearGradient id="bgMini${num}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#243a5e"/><stop offset="100%" stop-color="#16243f"/></linearGradient></defs>
                                    <ellipse cx="100" cy="38" rx="26" ry="32" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <rect x="90" y="68" width="20" height="16" rx="4" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1"/>
                                    <path d="M56 84 Q58 82 70 82 L90 82 L100 84 L110 82 L130 82 Q142 82 144 84 L148 100 Q150 108 148 116 L144 130 L144 175 L140 195 Q138 200 130 202 L70 202 Q62 200 60 195 L56 175 L56 130 L52 116 Q50 108 52 100 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M70 202 L130 202 L128 252 Q125 267 120 272 L80 272 Q75 267 72 252 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M56 84 L48 88 Q38 94 32 120 L28 150 Q24 168 22 180 L20 196 Q18 202 22 204 L28 202 Q32 198 34 188 L38 162 Q40 147 44 132 L50 110 L56 96 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M20 196 L16 212 Q14 220 16 224 L22 226 Q26 224 28 218 L28 202 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1"/>
                                    <path d="M144 84 L152 88 Q162 94 168 120 L172 150 Q176 168 178 180 L180 196 Q182 202 178 204 L172 202 Q168 198 166 188 L162 162 Q160 147 156 132 L150 110 L144 96 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M180 196 L184 212 Q186 220 184 224 L178 226 Q174 224 172 218 L172 202 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1"/>
                                    <path d="M72 270 L98 270 L96 330 Q94 355 92 375 L74 375 Q72 355 72 330 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M102 270 L128 270 L128 330 Q128 355 126 375 L108 375 Q106 355 104 330 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M74 375 L92 375 L90 415 Q88 440 86 455 L82 462 Q78 466 72 464 L68 458 Q68 452 70 442 L74 415 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                    <path d="M108 375 L126 375 L126 415 Q128 440 130 455 L132 458 Q132 464 128 466 L118 462 Q114 455 112 442 L110 415 Z" fill="url(#bgMini${num})" stroke="#2c4470" stroke-width="1.5"/>
                                </svg>
                                <div class="body-zone-mini" data-zone="Tête" style="top:1%;left:32%;width:36%;height:12%;">Tête</div>
                                <div class="body-zone-mini" data-zone="Cou" style="top:13%;left:40%;width:20%;height:4%;">Cou</div>
                                <div class="body-zone-mini" data-zone="Torse" style="top:18%;left:32%;width:36%;height:18%;">Torse</div>
                                <div class="body-zone-mini" data-zone="Abdomen" style="top:40%;left:32%;width:36%;height:14%;">Abdomen</div>
                                <div class="body-zone-mini" data-zone="Bras gauche" style="top:20%;left:6%;width:20%;height:22%;">Bras G</div>
                                <div class="body-zone-mini" data-zone="Bras droit" style="top:20%;left:74%;width:20%;height:22%;">Bras D</div>
                                <div class="body-zone-mini" data-zone="Cuisse gauche" style="top:56%;left:28%;width:22%;height:18%;">Cuisse G</div>
                                <div class="body-zone-mini" data-zone="Cuisse droite" style="top:56%;left:50%;width:22%;height:18%;">Cuisse D</div>
                                <div class="body-zone-mini" data-zone="Jambe gauche" style="top:76%;left:28%;width:20%;height:22%;">Jambe G</div>
                                <div class="body-zone-mini" data-zone="Jambe droite" style="top:76%;left:52%;width:20%;height:22%;">Jambe D</div>
                            </div>
                            <div class="suspect-zones-list"></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function addSuspectCard(containerId) {
        const container = $(`#${containerId}`);
        const count = container.querySelectorAll('.suspect-card').length;
        const div = document.createElement('div');
        div.innerHTML = createSuspectCardHTML(count);
        const card = div.firstElementChild;
        card.querySelector('.suspect-remove').style.display = '';
        card.querySelector('.suspect-remove').addEventListener('click', () => {
            card.remove();
            renumberSuspectCards(containerId);
            syncOpsModules();
            if (typeof lspdRefreshAllPenalChips === 'function') lspdRefreshAllPenalChips();
            if (typeof lspdRefreshAllCompactSuspects === 'function') lspdRefreshAllCompactSuspects();
        });
        initSuspectCardTags(card);
        container.appendChild(card);
        if (typeof lspdRefreshAllPenalChips === 'function') lspdRefreshAllPenalChips();
        if (typeof lspdRefreshAllCompactSuspects === 'function') lspdRefreshAllCompactSuspects();
    }

    function renumberSuspectCards(containerId) {
        $$(`#${containerId} .suspect-card`).forEach((card, i) => {
            card.dataset.suspect = i;
            const roleBtn = card.querySelector('.suspect-role .tag-btn.active');
            const role = roleBtn ? roleBtn.dataset.tag : 'Suspect';
            const label = getCardLabelForRole(role);
            card.querySelector('.suspect-card-number').textContent = `${label} #${i + 1}`;
        });
    }

    function getCardLabelForRole(role) {
        if (role === 'Victime armée') return 'Victime';
        if (role === 'Victime non armée') return 'Victime';
        if (role === 'Dommage collatéral') return 'Victime';
        return 'Suspect';
    }

    function initSuspectCardTags(card) {
        $$('.suspect-role .tag-btn', card).forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.suspect-role .tag-btn', card).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const container = card.closest('.suspect-cards');
                if (container) renumberSuspectCards(container.id);
                if (typeof lspdRefreshAllPenalChips === 'function') lspdRefreshAllPenalChips();
                // Show/hide victim status dropdown
                const wrap = card.querySelector('.suspect-victim-status-wrap');
                if (wrap) {
                    const isVictim = ['Victime armée', 'Victime non armée', 'Dommage collatéral'].includes(btn.dataset.tag);
                    wrap.style.display = isVictim ? '' : 'none';
                    if (!isVictim) {
                        const sel = card.querySelector('.suspect-victim-status');
                        if (sel) sel.value = '';
                    }
                }
                // Sync ops modules (Module 2 depends on 'Dommage collatéral' role)
                syncOpsModules();
            });
        });
        $$('.suspect-gender .tag-btn', card).forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.suspect-gender .tag-btn', card).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        $$('.suspect-description .tag-btn', card).forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('active'));
        });
        // Health status (multi-select)
        $$('.suspect-health .tag-btn', card).forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                toggleSuspectBodyMap(card);
            });
        });
        // Medical end (multi-select)
        $$('.suspect-medical-end .tag-btn', card).forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('active'));
        });
        // Body map zones (mini)
        $$('.body-zone-mini', card).forEach(zone => {
            zone.addEventListener('click', () => {
                zone.classList.toggle('selected-wound');
                updateSuspectZonesList(card);
            });
        });
    }

    function togglePursuitPanel() {
        const panel = $('#dynamic-pursuit-panel');
        if (!panel) return;
        const active = state.patrol.tenCodes.includes('10-56') || state.patrol.tenCodes.includes('10-55');
        panel.style.display = active ? '' : 'none';
        if (!active) {
            state.patrol.tags.pursuit_end = [];
            state.patrol.pursuitEndLocation = '';
            if ($('#pursuitEndLocation')) $('#pursuitEndLocation').value = '';
            $$('#dynamic-pursuit-panel .tag-btn').forEach(b => b.classList.remove('active'));
        }
    }

    function toggleSuspectBodyMap(card) {
        const injuryTags = ['Blessure par balle (GSW)', 'Blessure à l\'arme blanche', 'Traumatisme / Coups', 'Décédé'];
        const activeHealth = [...card.querySelectorAll('.suspect-health .tag-btn.active')].map(b => b.dataset.tag);
        const hasInjury = injuryTags.some(t => activeHealth.includes(t));
        const wrap = card.querySelector('.suspect-bodymap-wrap');
        if (wrap) {
            wrap.style.display = hasInjury ? '' : 'none';
            if (!hasInjury) {
                $$('.body-zone-mini', card).forEach(z => z.classList.remove('selected-wound'));
                updateSuspectZonesList(card);
            }
        }
    }

    function updateSuspectZonesList(card) {
        const listEl = card.querySelector('.suspect-zones-list');
        if (!listEl) return;
        const zones = [...card.querySelectorAll('.body-zone-mini.selected-wound')].map(z => z.dataset.zone);
        listEl.innerHTML = zones.map(z => `<span class="wound-tag">${escapeHtml(z)}</span>`).join('');
    }

    function initAllExistingSuspectCards() {
        $$('.suspect-card').forEach(card => initSuspectCardTags(card));
    }

    function getSuspectsData(containerId) {
        const suspects = [];
        $$(`#${containerId} .suspect-card`).forEach(card => {
            const lastname = card.querySelector('.suspect-lastname').value.trim();
            const firstname = card.querySelector('.suspect-firstname').value.trim();
            const dob = card.querySelector('.suspect-dob').value.trim();
            const phone = card.querySelector('.suspect-phone').value.trim();
            const genderBtn = card.querySelector('.suspect-gender .tag-btn.active');
            const gender = genderBtn ? genderBtn.dataset.tag : '';
            const roleBtn = card.querySelector('.suspect-role .tag-btn.active');
            const role = roleBtn ? roleBtn.dataset.tag : 'Suspect';
            const victimStatusSel = card.querySelector('.suspect-victim-status');
            const victimStatus = victimStatusSel ? victimStatusSel.value : '';
            const descTags = [...card.querySelectorAll('.suspect-description .tag-btn.active')].map(b => b.dataset.tag);
            const healthTags = [...card.querySelectorAll('.suspect-health .tag-btn.active')].map(b => b.dataset.tag);
            const medicalEndTags = [...card.querySelectorAll('.suspect-medical-end .tag-btn.active')].map(b => b.dataset.tag);
            const woundZones = [...card.querySelectorAll('.body-zone-mini.selected-wound')].map(z => z.dataset.zone);
            if (lastname || firstname) {
                suspects.push({ lastname: lastname || 'Inconnu', firstname: firstname || 'Inconnu', dob, phone, gender, role, victimStatus, description: descTags, health: healthTags, medicalEnd: medicalEndTags, woundZones });
            }
        });
        return suspects;
    }

    function formatSuspectBlock(suspects) {
        if (suspects.length === 0) return '';
        let block = '';
        suspects.forEach((s, i) => {
            const role = s.role || 'Suspect';
            let label;
            if (role === 'Suspect') label = `Suspect ${i + 1}`;
            else if (role === 'Victime armée') label = `Victime ${i + 1} (armée)`;
            else if (role === 'Dommage collatéral') label = `Victime ${i + 1} (dommage collatéral)`;
            else label = `Victime ${i + 1} (non armée)`;
            block += `\n  ${label} :\n`;
            block += `    Nom : ${s.lastname}\n`;
            block += `    Prénom : ${s.firstname}\n`;
            if (s.dob) block += `    Date de naissance : ${s.dob}\n`;
            if (s.gender) block += `    Sexe : ${s.gender}\n`;
            if (s.phone) block += `    Téléphone : ${s.phone}\n`;
            if (s.victimStatus) block += `    Statut victime : ${s.victimStatus}\n`;
            if (s.description.length > 0) block += `    Description : ${s.description.join(', ')}\n`;
            if (s.health && s.health.length > 0) block += `    État de santé : ${s.health.join(', ')}\n`;
            if (s.woundZones && s.woundZones.length > 0) block += `    Zones blessées : ${s.woundZones.join(', ')}\n`;
            if (s.medicalEnd && s.medicalEnd.length > 0) block += `    Suivi médical : ${s.medicalEnd.join(', ')}\n`;
        });
        return block;
    }

    function getSuspectsBlockTitle(suspects) {
        const hasVictim = suspects.some(s => s.role && (s.role.startsWith('Victime') || s.role === 'Dommage collatéral'));
        const hasSuspect = suspects.some(s => !s.role || s.role === 'Suspect');
        if (hasVictim && hasSuspect) return 'PERSONNES IMPLIQUÉES';
        if (hasVictim) return 'VICTIME(S) IMPLIQUÉE(S)';
        return 'IDENTIFICATION DU/DES SUSPECT(S)';
    }

    function formatSuspectNarrative(suspects) {
        if (suspects.length === 0) return '';
        if (suspects.length === 1) {
            const s = suspects[0];
            const role = s.role || 'Suspect';
            let intro;
            if (role === 'Suspect') intro = ' Le suspect a été identifié comme étant';
            else if (role === 'Victime armée') intro = ' La victime, trouvée en possession d\'une arme, a été identifiée comme étant';
            else if (role === 'Dommage collatéral') intro = ' La victime collatérale a été identifiée comme étant';
            else intro = ' La victime (sans arme) a été identifiée comme étant';
            let txt = `${intro} ${s.firstname} ${s.lastname}`;
            if (s.gender) txt += `, de sexe ${s.gender.toLowerCase()}`;
            if (s.dob) txt += `, né(e) le ${s.dob}`;
            if (s.victimStatus) txt += `. Statut : ${s.victimStatus.toLowerCase()}`;
            if (s.description.length > 0) txt += `, décrit(e) comme : ${s.description.join(', ').toLowerCase()}`;
            txt += '.';
            if (s.health && s.health.length > 0) {
                txt += ` État de santé à l'arrivée : ${s.health.join(', ').toLowerCase()}.`;
                if (s.woundZones && s.woundZones.length > 0) {
                    txt += ` Blessures localisées au niveau : ${s.woundZones.join(', ').toLowerCase()}.`;
                }
            }
            if (s.medicalEnd && s.medicalEnd.length > 0) {
                txt += ` Suivi médical : ${s.medicalEnd.join(', ').toLowerCase()}.`;
            }
            return txt;
        }
        const suspectsOnly = suspects.filter(s => (s.role || 'Suspect') === 'Suspect');
        const victimsArmed = suspects.filter(s => s.role === 'Victime armée');
        const victimsUnarmed = suspects.filter(s => s.role === 'Victime non armée');
        const victimsCollateral = suspects.filter(s => s.role === 'Dommage collatéral');
        const parts = [];
        const fmt = s => {
            let p = `${s.firstname} ${s.lastname}`;
            if (s.gender) p += ` (${s.gender})`;
            if (s.dob) p += `, né(e) le ${s.dob}`;
            if (s.victimStatus) p += ` [${s.victimStatus}]`;
            if (s.health && s.health.length > 0) {
                p += ` — état : ${s.health.join(', ').toLowerCase()}`;
                if (s.woundZones && s.woundZones.length > 0) {
                    p += ` [zones : ${s.woundZones.join(', ')}]`;
                }
            }
            if (s.medicalEnd && s.medicalEnd.length > 0) {
                p += ` — suivi : ${s.medicalEnd.join(', ').toLowerCase()}`;
            }
            return p;
        };
        if (suspectsOnly.length > 0) {
            parts.push((suspectsOnly.length === 1 ? ' Suspect identifié : ' : ' Suspects identifiés : ') + suspectsOnly.map(fmt).join(' ; '));
        }
        if (victimsArmed.length > 0) {
            parts.push((victimsArmed.length === 1 ? ' Victime identifiée (en possession d\'une arme) : ' : ' Victimes identifiées (en possession d\'armes) : ') + victimsArmed.map(fmt).join(' ; '));
        }
        if (victimsUnarmed.length > 0) {
            parts.push((victimsUnarmed.length === 1 ? ' Victime identifiée (sans arme) : ' : ' Victimes identifiées (sans arme) : ') + victimsUnarmed.map(fmt).join(' ; '));
        }
        if (victimsCollateral.length > 0) {
            parts.push((victimsCollateral.length === 1 ? ' Victime collatérale identifiée : ' : ' Victimes collatérales identifiées : ') + victimsCollateral.map(fmt).join(' ; '));
        }
        return parts.join('.') + '.';
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONSISTENCY CHECKER
    // ═══════════════════════════════════════════════════════════════════

    function checkReportConsistency(penalContainerId, module) {
        const warnings = [];
        const selectedCharges = [];
        $$(`#${penalContainerId} input[type="checkbox"]:checked`).forEach(cb => {
            const catIdx = parseInt(cb.dataset.cat);
            const itemIdx = parseInt(cb.dataset.item);
            selectedCharges.push(DB.penalCode[catIdx].items[itemIdx].name);
        });
        if (selectedCharges.length === 0) return warnings;

        // Weapon-related charges without seized weapon
        const weaponCharges = selectedCharges.filter(n =>
            /arme.*(feu|illégale|guerre|lourde|artisanale|légère|incendiaire)|Entreposage d.arme|trafic d.arme|fabrication d.arme/i.test(n)
        );
        if (weaponCharges.length > 0) {
            let weaponSeized = false;
            if (module === 'patrol') {
                weaponSeized = (state.patrol.evidence || []).some(e => /arme/i.test(e));
            } else if (module === 'narc') {
                weaponSeized = (state.narcotics.weapons || []).length > 0
                    && !state.narcotics.weapons.includes('Aucune arme saisie');
            }
            if (!weaponSeized) {
                warnings.push(`🔫 Charge liée à une arme (« ${weaponCharges[0]} ») — Aucune arme documentée dans les saisies. Cochez « Arme à feu » ou « Arme blanche » dans les preuves, ou retirez cette charge.`);
            }
        }

        // Victim-requiring charges without documented victim
        const victimCharges = selectedCharges.filter(n =>
            /agression sur civil avec une arme|tentative de meurtre sur civil|meurtre sur civil|prise d.otage sur civil/i.test(n)
        );
        if (victimCharges.length > 0) {
            let victimDocumented = false;
            if (module === 'patrol') {
                victimDocumented = getSuspectsData('patrolSuspectCards').some(s => s.role && s.role.startsWith('Victime'));
            } else if (module === 'narc') {
                victimDocumented = getSuspectsData('narcSuspectCards').some(s => s.role && s.role.startsWith('Victime'));
            } else if (module === 'cid') {
                victimDocumented = getSuspectsData('cidSuspectCards').some(s => s.role && s.role.startsWith('Victime'));
            }
            if (!victimDocumented) {
                warnings.push(`🩸 Charge impliquant une victime civile (« ${victimCharges[0]} ») — Aucune victime documentée. Ajoutez une fiche personne avec le rôle « Victime », ou retirez cette charge.`);
            }
        }

        return warnings;
    }

    function renderConsistencyWarnings(outputId, warnings) {
        if (warnings.length === 0) return;
        const output = $(`#${outputId}`);
        const block = document.createElement('div');
        block.className = 'consistency-warning';
        block.innerHTML = `<div class="cw-header">⚠ Incohérences détectées — Vérifiez avant de soumettre</div><ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>`;
        output.insertBefore(block, output.firstChild);
    }

    // Suspect card add buttons
    $('#btnAddPatrolSuspect').addEventListener('click', () => addSuspectCard('patrolSuspectCards'));
    $('#btnAddNarcSuspect').addEventListener('click', () => addSuspectCard('narcSuspectCards'));
    $('#btnAddCidSuspect').addEventListener('click', () => addSuspectCard('cidSuspectCards'));

    // ═══════════════════════════════════════════════════════════════════
    // VEHICLE TAG HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function initVehicleTags() {
        initMultiGroup('patrolVehicleColor', state.patrol, 'vehicleColor');
        initMultiGroup('patrolVehicleState', state.patrol, 'vehicleState');
    }

    function getVehicleData() {
        return {
            model: $('#patrolVehicleModel').value.trim(),
            color: state.patrol.vehicleColor,
            plate: $('#patrolVehiclePlate').value.trim(),
            state: state.patrol.vehicleState
        };
    }

    function formatVehicleBlock(v) {
        if (!v.model && !v.plate && v.color.length === 0) return '';
        let block = '';
        if (v.model) block += `  Marque / Modèle : ${v.model}\n`;
        if (v.color.length > 0) block += `  Couleur : ${v.color.join(', ')}\n`;
        if (v.plate) block += `  Plaque : ${v.plate}\n`;
        if (v.state.length > 0) block += `  État : ${v.state.join(', ')}\n`;
        return block;
    }

    function formatVehicleNarrative(v) {
        if (!v.model && !v.plate && v.color.length === 0) return '';
        let txt = ' Le véhicule impliqué';
        if (v.model) txt += `, un ${v.model}`;
        if (v.color.length > 0) txt += ` de couleur ${v.color.join('/')}`;
        if (v.plate) txt += ` immatriculé ${v.plate}`;
        if (v.state.length > 0) txt += ` (${v.state.join(', ').toLowerCase()})`;
        txt += ', a été identifié sur les lieux.';
        return txt;
    }

    // ═══════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════

    $$('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const mod = link.dataset.module;
            $$('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            $$('.module').forEach(m => m.classList.remove('active'));
            $(`#mod-${mod}`).classList.add('active');
            // Auto-set datetime when entering modules
            if (mod === 'standard') { setDatetimeNow('rfDatetime'); if (typeof rfUpdatePreview === 'function') rfUpdatePreview(); }
            if (mod === 'patrol') setDatetimeNow('patrolDatetime');
            if (mod === 'narcotics') setDatetimeNow('narcDatetime');
            if (mod === 'crimes') setDatetimeNow('cidDatetime');
        });
    });

    // ═══════════════════════════════════════════════════════════════════
    // DASHBOARD — REFERENCE GRIDS
    // ═══════════════════════════════════════════════════════════════════

    function buildDashboard() {
        const unitGrid = $('#unitRefGrid');
        let unitHTML = '';
        DB.units.forEach(u => {
            unitHTML += `<div class="ref-card"><span class="ref-code">${u.code}</span><span class="ref-desc">${u.desc}</span></div>`;
        });
        unitGrid.innerHTML = unitHTML;

        // Codes radio du serveur uniquement (Code 1 → 7, 4 Adam). Aucun code 10 :
        // ce sont des indicatifs étrangers au LSPD, retirés de toute l'interface.
        const statusGrid = $('#statusRefGrid');
        let statusHTML = '';
        DB.statusCodes.forEach(s => {
            statusHTML += `<div class="ref-card"><span class="ref-code">${s.code}</span><span class="ref-desc">${s.desc}</span></div>`;
        });
        statusGrid.innerHTML = statusHTML;

        // Inject history section
        injectHistorySection();
        renderHistorySection();
    }

    function updateDashStats() {
        $('#statReports').textContent = state.reports;
        $('#statArrests').textContent = state.arrests;
        $('#statDrugs').textContent = state.drugWeight + 'g';
        $('#statFines').textContent = '$' + state.totalFines.toLocaleString('fr-FR');
    }

    // ═══════════════════════════════════════════════════════════════════
    // HISTORIQUE DES RAPPORTS
    // ═══════════════════════════════════════════════════════════════════

    const HISTORY_KEY = 'lspd_report_history';
    const HISTORY_MAX = 20;

    function saveReportToHistory(moduleLabel, content) {
        let history = loadReportHistory();
        history.unshift({
            id: Date.now(),
            module: moduleLabel,
            ts: formatNow(),
            preview: content.slice(0, 130).replace(/\n/g, ' ').trim(),
            content
        });
        if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) { /* ignore */ }
        renderHistorySection();
    }

    function loadReportHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
    }

    function renderHistorySection() {
        const container = $('#historySection');
        if (!container) return;
        const history = loadReportHistory();
        if (history.length === 0) {
            container.innerHTML = '<p class="history-empty">Aucun rapport généré dans cette session.</p>';
            return;
        }
        container.innerHTML = history.map(e => `
            <div class="history-card">
                <div class="history-card-header">
                    <span class="history-badge">${escapeHtml(e.module)}</span>
                    <span class="history-ts">${escapeHtml(e.ts)}</span>
                    <button class="btn btn-outline history-copy" data-id="${e.id}">Copier</button>
                    <button class="history-delete qa-remove" data-id="${e.id}" title="Supprimer">&times;</button>
                </div>
                <div class="history-preview">${escapeHtml(e.preview)}…</div>
            </div>
        `).join('');
        container.querySelectorAll('.history-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const entry = loadReportHistory().find(e => e.id === parseInt(btn.dataset.id));
                if (entry) copyToClipboard(entry.content);
            });
        });
        container.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const h = loadReportHistory().filter(e => e.id !== parseInt(btn.dataset.id));
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { /* ignore */ }
                renderHistorySection();
                showToast('Rapport supprimé de l\'historique.', 'warning');
            });
        });
    }

    function injectHistorySection() {
        if ($('#historySection')) return;
        const dashboard = $('#mod-dashboard');
        if (!dashboard) return;
        const sec = document.createElement('div');
        sec.className = 'dash-section';
        const header = document.createElement('h3');
        header.textContent = 'Historique des Rapports';
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-outline';
        clearBtn.textContent = 'Tout effacer';
        clearBtn.style.cssText = 'float:right;font-size:0.7rem;padding:2px 10px;margin-top:-2px;';
        clearBtn.addEventListener('click', () => {
            try { localStorage.removeItem(HISTORY_KEY); } catch (e) { /* ignore */ }
            renderHistorySection();
            showToast('Historique effacé.', 'warning');
        });
        header.appendChild(clearBtn);
        const content = document.createElement('div');
        content.id = 'historySection';
        sec.appendChild(header);
        sec.appendChild(content);
        dashboard.appendChild(sec);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EMERGENCY BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    function openEmergency(title, desc) {
        $('#emergencyTitle').textContent = title;
        $('#emergencyDesc').textContent = desc;
        const now = new Date();
        $('#emergencyTime').textContent = now.toLocaleTimeString('fr-FR');
        $('#emergencyModal').classList.add('active');
    }

    $('#btnCode99').addEventListener('click', () => openEmergency('⚠ URGENCE GÉNÉRALE ⚠', 'TOUS LES AGENTS RÉPONDENT — URGENCE MAXIMALE'));
    $('#btn1035').addEventListener('click', () => openEmergency('⚠ RENFORT IMMÉDIAT ⚠', 'RENFORT IMMÉDIAT DEMANDÉ — AGENT EN DANGER'));
    $('#btnCloseEmergency').addEventListener('click', () => $('#emergencyModal').classList.remove('active'));
    $('#emergencyModal').addEventListener('click', e => { if (e.target === $('#emergencyModal')) $('#emergencyModal').classList.remove('active'); });

    // ═══════════════════════════════════════════════════════════════════
    // TAG SELECTOR BUILDER (Single / Multi select)
    // ═══════════════════════════════════════════════════════════════════

    function buildSingleTagSelector(containerId, items, stateKey, stateObj, onChange) {
        const container = $(`#${containerId}`);
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn';
            btn.dataset.tag = item.code || item;
            btn.textContent = item.code ? `${item.code} (${item.desc})` : item;
            btn.addEventListener('click', () => {
                $$('.tag-btn', container).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                stateObj[stateKey] = item.code || item;
                if (onChange) onChange(item.code || item);
            });
            container.appendChild(btn);
        });
    }

    function buildMultiTagSelectorFromArray(containerId, items) {
        const container = $(`#${containerId}`);
        if (!container) return;
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn';
            btn.dataset.tag = item;
            btn.textContent = item;
            container.appendChild(btn);
        });
    }

    function updateRosterNotice(moduleKey, unitCode) {
        const noticeId = moduleKey === 'patrol' ? 'patrolRosterNotice' : 'narcRosterNotice';
        const notice = $(`#${noticeId}`);
        if (!notice) return;
        if (unitCode === 'Lincoln') {
            notice.classList.remove('active', 'error');
            notice.textContent = '';
        } else {
            const unitInfo = DB.units.find(u => u.code === unitCode);
            notice.textContent = `⚠ Unité ${unitCode} (${unitInfo ? unitInfo.desc : ''}) — Veuillez sélectionner les agents présents ci-dessus.`;
            notice.classList.add('active');
            notice.classList.remove('error');
        }
    }

    function updateTenCodeChain() {
        const codes = state.patrol.tenCodes;
        const chainContainer = $('#tenCodeChain');
        const chainSteps = $('#tenCodeChainSteps');
        if (!chainContainer || !chainSteps) return;

        if (codes.length < 2) {
            chainContainer.style.display = 'none';
            return;
        }

        chainContainer.style.display = '';
        let html = '';
        codes.forEach((code, i) => {
            const desc = DB.tenCodes[code] || '';
            html += `<span class="chain-step">`;
            html += `<span class="chain-step-desc">${escapeHtml(desc)}</span>`;
            html += `<button class="chain-step-remove" data-chain-idx="${i}" title="Retirer (et les suivants)">&times;</button>`;
            html += `</span>`;
            if (i < codes.length - 1) {
                html += `<span class="chain-arrow">→</span>`;
            }
        });
        chainSteps.innerHTML = html;

        // Bind remove buttons
        chainSteps.querySelectorAll('.chain-step-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.chainIdx);
                state.patrol.tenCodes.splice(idx);
                state.patrol.tenCode = state.patrol.tenCodes[0] || null;
                // Update button states
                const tenCodeContainer = $('#tenCodeSelector');
                tenCodeContainer.querySelectorAll('.tag-btn').forEach(b => {
                    b.classList.toggle('active', state.patrol.tenCodes.includes(b.dataset.tag));
                });
                updateTenCodeChain();
                syncOpsModules();
                togglePursuitPanel();
                const gsrRow = $('#patrolGsrRow');
                if (gsrRow) gsrRow.classList.toggle('visible', state.patrol.tenCodes.includes('10-31') || state.patrol.tenCodes.includes('10-32'));
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STATE CHAIN (suspect_state / agent_state) — Chronological Display
    // ═══════════════════════════════════════════════════════════════════

    const STATE_CHAIN_MAP = {
        suspect_state:  { container: 'suspectStateChain',  steps: 'suspectStateChainSteps' },
        impact_detail:  { container: 'impactDetailChain',  steps: 'impactDetailChainSteps' },
        agent_state:    { container: 'agentStateChain',    steps: 'agentStateChainSteps' }
    };

    function updateStateChain(category) {
        const cfg = STATE_CHAIN_MAP[category];
        if (!cfg) return;
        const arr = state.patrol.tags[category];
        const chainContainer = $(`#${cfg.container}`);
        const chainSteps = $(`#${cfg.steps}`);
        if (!chainContainer || !chainSteps) return;

        if (arr.length < 2) {
            chainContainer.style.display = 'none';
            return;
        }

        chainContainer.style.display = '';
        let html = '';
        arr.forEach((tag, i) => {
            html += `<span class="chain-step">`;
            html += `<span class="chain-step-desc">${escapeHtml(tag)}</span>`;
            html += `<button class="chain-step-remove" data-chain-cat="${category}" data-chain-idx="${i}" title="Retirer (et les suivants)">&times;</button>`;
            html += `</span>`;
            if (i < arr.length - 1) {
                html += `<span class="chain-arrow">→</span>`;
            }
        });
        chainSteps.innerHTML = html;

        // Bind remove buttons
        chainSteps.querySelectorAll('.chain-step-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cat = btn.dataset.chainCat;
                const idx = parseInt(btn.dataset.chainIdx);
                const removed = state.patrol.tags[cat].splice(idx);
                // Update button active states
                const group = document.querySelector(`.tag-group[data-category="${cat}"]`);
                if (group) {
                    removed.forEach(t => {
                        const b = group.querySelector(`.tag-btn[data-tag="${CSS.escape(t)}"]`);
                        if (b) b.classList.remove('active');
                    });
                }
                updateStateChain(cat);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 10-CODE → OPS MODULE VISIBILITY MAPPING
    // ═══════════════════════════════════════════════════════════════════

    // Chaque nature d'intervention révèle son module de détails (et lui seul).
    const OPS_MODULE_MAP = {
        'opsModule1': ['10-56', '10-55'],
        'opsModule2': ['10-50', '10-51'],
        'opsModule3': ['10-31', '10-32'],
        'opsModule4': ['10-40', '10-61', '10-62', '10-74'],
        'opsModule5': ['10-60'],
        'opsModule6': ['DV'],
        'opsModule7': ['DOA'],
        'opsModule8': ['SPEC']
    };

    function syncOpsModules() {
        const activeCodes = state.patrol.tenCodes;
        // Check if any suspect card has 'Dommage collatéral' role active
        const hasDommageCollateral = !!document.querySelector('#patrolSuspectCards .suspect-role .tag-btn.active[data-tag="Dommage collatéral"]');

        Object.entries(OPS_MODULE_MAP).forEach(([moduleId, codes]) => {
            const el = $(`#${moduleId}`);
            if (!el) return;
            let shouldShow = codes.some(c => activeCodes.includes(c));
            // Module 2: also visible if 'Dommage collatéral' role is active
            if (moduleId === 'opsModule2' && hasDommageCollateral) shouldShow = true;
            if (shouldShow) {
                el.classList.add('ops-module-visible');
                // Corps + tiroirs déployés d'emblée (affichage à plat).
                const body = el.querySelector('.ops-module-body');
                if (body) body.classList.add('ops-open');
                el.querySelectorAll('.ops-drawer').forEach(d => d.classList.add('ops-drawer-open'));
                const toggle = el.querySelector('.ops-module-toggle');
                if (toggle) toggle.checked = true;
            } else {
                el.classList.remove('ops-module-visible');
                // Anti-ghost : on vide le module masqué (nature désélectionnée).
                el.querySelectorAll('.tag-btn.active, .ops-tag.active').forEach(b => b.classList.remove('active'));
                el.querySelectorAll('input').forEach(inp => { inp.value = ''; });
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // MULTI-SELECT TAG HANDLING (Narrative tags & other multi-selects)
    // ═══════════════════════════════════════════════════════════════════

    function initMultiTags() {
        // Patrol narrative tags
        $$('.tag-builder .tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const group = btn.closest('.tag-group');
                const cat = group.dataset.category;
                const tag = btn.dataset.tag;
                const arr = state.patrol.tags[cat];

                // Chain mode: ordered chronological selection
                if (group.dataset.chain === 'true') {
                    if (btn.classList.contains('active')) {
                        // Remove this tag and everything after it in the chain
                        const idx = arr.indexOf(tag);
                        if (idx > -1) {
                            const removed = arr.splice(idx);
                            // Deactivate all removed tags' buttons
                            removed.forEach(t => {
                                const b = group.querySelector(`.tag-btn[data-tag="${CSS.escape(t)}"]`);
                                if (b) b.classList.remove('active');
                            });
                        } else {
                            btn.classList.remove('active');
                        }
                    } else {
                        btn.classList.add('active');
                        if (!arr.includes(tag)) arr.push(tag);
                    }
                    updateStateChain(cat);
                    return;
                }

                // Default toggle mode
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    if (!arr.includes(tag)) arr.push(tag);
                } else {
                    const idx = arr.indexOf(tag);
                    if (idx > -1) arr.splice(idx, 1);
                }
            });
        });

        // Pursuit panel tags (outside .tag-builder)
        $$('#dynamic-pursuit-panel .tag-group[data-category="pursuit_end"] .tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const tag = btn.dataset.tag;
                const arr = state.patrol.tags.pursuit_end;
                if (btn.classList.contains('active')) {
                    if (!arr.includes(tag)) arr.push(tag);
                } else {
                    const idx = arr.indexOf(tag);
                    if (idx > -1) arr.splice(idx, 1);
                }
            });
        });

        // Pursuit end location sync
        const pursuitLocInput = $('#pursuitEndLocation');
        if (pursuitLocInput) {
            pursuitLocInput.addEventListener('input', () => {
                state.patrol.pursuitEndLocation = pursuitLocInput.value.trim();
            });
        }

        // Narcotics multi-select groups
        initMultiGroup('drugTypeSelector', state.narcotics, 'drugs');
        initMultiGroup('narcPackaging', state.narcotics, 'packaging');
        initMultiGroup('narcGang', state.narcotics, 'gang');
        initMultiGroup('narcWeapons', state.narcotics, 'weapons');
        initMultiGroup('narcSurveillanceMeans', state.narcotics, 'surveillanceMeans');
        initMultiGroup('narcObservations', state.narcotics, 'observations');
        initMultiGroup('narcInterventionTriggers', state.narcotics, 'interventionTriggers');
        initMultiGroup('narcApproachMethods', state.narcotics, 'approachMethods');
        initMultiGroup('narcIntelSources', state.narcotics, 'intelSources');
        initMultiGroup('narcOperationResults', state.narcotics, 'operationResults');

        // CID multi-select groups
        initMultiGroup('cidCrimeType', state.cid, 'crimeType');
        initMultiGroup('cidBallistics', state.cid, 'ballistics');
        initMultiGroup('cidFingerprints', state.cid, 'fingerprints');
        initMultiGroup('cidVictims', state.cid, 'victims');
        initMultiGroup('cidWarrant', state.cid, 'warrant');

        // Patrol evidence
        initMultiGroup('patrolEvidence', state.patrol, 'evidence');
        initMultiGroup('patrolAmmoTypes', state.patrol, 'ammoTypes');
        // GSR selector (single-select)
        $$('#patrolGsrSelector .tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('#patrolGsrSelector .tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        // Show/hide firearm serial field
        const evidenceContainer = $('#patrolEvidence');
        if (evidenceContainer) {
            evidenceContainer.addEventListener('click', () => {
                const hasFirearm = (state.patrol.evidence || []).some(e => /arme à feu/i.test(e));
                const row = $('#patrolFirearmSerialRow');
                if (row) row.classList.toggle('visible', hasFirearm);
                const hasMunitions = (state.patrol.evidence || []).some(e => /munitions/i.test(e));
                const ammoRow = $('#patrolAmmoRow');
                if (ammoRow) ammoRow.classList.toggle('visible', hasMunitions);
            });
        }

        // GND roles
        initMultiGroup('narcRoles', state.narcotics, 'roles');

        // Operational Modules 1-5 (multi-select toggle + conditional drawers)
        // Modules d'incident « à plat » : plus de cascade clé→tiroir. Le module
        // pertinent (piloté par la nature) affiche tous ses champs directement ;
        // chaque tag ne fait que basculer son état actif.
        $$('.ops-module .ops-tag').forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('active'));
        });
        // Les tiroirs sont ouverts en permanence (CSS) ; on garantit l'état.
        $$('.ops-drawer').forEach(d => d.classList.add('ops-drawer-open'));
    }

    function initMultiGroup(containerId, stateObj, key) {
        $$(`#${containerId} .tag-btn`).forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                const tag = btn.dataset.tag;
                if (btn.classList.contains('active')) {
                    if (!stateObj[key].includes(tag)) stateObj[key].push(tag);
                } else {
                    const idx = stateObj[key].indexOf(tag);
                    if (idx > -1) stateObj[key].splice(idx, 1);
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // APPROXIMATION SLIDERS
    // ═══════════════════════════════════════════════════════════════════

    function initSliders() {
        const sliders = [
            { id: 'sliderSuspects', valId: 'valSuspects', scale: DB.suspectScale },
            { id: 'sliderShots', valId: 'valShots', scale: DB.shotsScale },
            { id: 'sliderThreat', valId: 'valThreat', scale: DB.threatScale },
            { id: 'sliderSpeed', valId: 'valSpeed', scale: DB.speedScale }
        ];
        sliders.forEach(s => {
            const slider = $(`#${s.id}`);
            const val = $(`#${s.valId}`);
            if (!slider || !val) return; // sliders retirés (refonte) : no-op
            slider.addEventListener('input', () => {
                val.textContent = s.scale[parseInt(slider.value)];
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // NARRATIVE ENGINE — ZERO TYPING REPORT GENERATION
    // ═══════════════════════════════════════════════════════════════════

    function buildInlinePenalCode(containerId, fineId, prisonId, chargesId) {
        const container = $(`#${containerId}`);
        if (!container) return;

        DB.penalCode.forEach((cat, catIdx) => {
            const section = document.createElement('div');
            section.className = 'penal-cat-section';

            const header = document.createElement('div');
            header.className = 'penal-cat-header collapsed';
            header.innerHTML = `${cat.category} <span class="chevron">▼</span>`;

            const body = document.createElement('div');
            body.className = 'penal-cat-body collapsed';

            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                body.classList.toggle('collapsed');
            });

            cat.items.forEach((item, itemIdx) => {
                const { row, qtyRow } = buildPenalRow(item, catIdx, itemIdx,
                    () => updateInlinePenalTotals(containerId, fineId, prisonId, chargesId));
                body.appendChild(row);
                if (qtyRow) body.appendChild(qtyRow);
            });

            section.appendChild(header);
            section.appendChild(body);
            container.appendChild(section);
        });
    }

    function updateInlinePenalTotals(containerId, fineId, prisonId, chargesId) {
        let totalFine = 0;
        let count = 0;
        $$(`#${containerId} input[type="checkbox"]:checked`).forEach(cb => {
            const catIdx = parseInt(cb.dataset.cat);
            const itemIdx = parseInt(cb.dataset.item);
            const qty = parseInt(cb.dataset.qty) || 1;
            const item = DB.penalCode[catIdx].items[itemIdx];
            totalFine += item.fine * qty;
            count++;
        });
        $(`#${fineId}`).textContent = '$' + totalFine.toLocaleString('fr-FR');
        $(`#${prisonId}`).textContent = count > 0 ? `${count} chef(s)` : '-';
        $(`#${chargesId}`).textContent = count;
    }

    function getPenalSummaryFrom(containerId) {
        const checkedItems = [];
        let totalFine = 0;
        $$(`#${containerId} input[type="checkbox"]:checked`).forEach(cb => {
            const catIdx = parseInt(cb.dataset.cat);
            const itemIdx = parseInt(cb.dataset.item);
            const qty = parseInt(cb.dataset.qty) || 1;
            const item = DB.penalCode[catIdx].items[itemIdx];
            const calcFine = item.fine * qty;
            totalFine += calcFine;
            checkedItems.push({ item, qty, calcFine });
        });
        if (checkedItems.length === 0) return '';
        let block = `\n──────────────────────────────────────────\n`;
        block += `CHARGES & AMENDES\n`;
        block += `──────────────────────────────────────────\n\n`;
        checkedItems.forEach(({ item, qty, calcFine }, i) => {
            const prisonText = item.prison || '-';
            const qtyText = qty > 1 ? ` [×${qty} ${item.qtyUnit || 'fois'}]` : '';
            block += `${i + 1}. ${item.name}${qtyText}\n`;
            block += `   Amende : $${calcFine.toLocaleString('fr-FR')} | Réf. pénale : ${prisonText}\n`;
        });
        block += `\n  TOTAL AMENDES : $${totalFine.toLocaleString('fr-FR')}\n`;
        block += `  CHARGES       : ${checkedItems.length}\n`;
        return block;
    }

    function getPenalSummary() {
        return getPenalSummaryFrom('penalInfractions');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PATROL REPORT
    // ═══════════════════════════════════════════════════════════════════

    // Motif d'appel (nom, pour « nous répondons à un appel pour … ») déduit du
    // premier code d'intervention sélectionné.
    function lspdPatrolMotif() {
        const codeMotif = {
            '10-31': "un signalement de coups de feu", '10-32': "une fusillade active",
            '10-37': "un cambriolage en cours", '10-38': "un contrôle routier",
            '10-40': "un braquage de supérette", '10-50': "un accident de la circulation",
            '10-51': "un accident grave", '10-52': "une assistance médicale d'urgence",
            '10-55': "un délit de fuite", '10-56': "un refus d'obtempérer",
            '10-57': "un vol de véhicule", '10-60': "une possible vente de stupéfiants",
            '10-61': "un braquage de banque", '10-62': "un braquage de bijouterie",
            '10-74': "un racket / smash and grab", '10-14': "l'escorte d'un convoi",
            '10-27': "un sujet activement recherché", '10-29': "une vérification de mandat et de dossier citoyen",
            '10-35': "une demande de renfort d'une unité sur le terrain",
            'DV': "un signalement de violences domestiques", 'DOA': "la découverte d'un corps sans vie",
            'SPEC': "la prise en charge d'un incident spécial"
        };
        const first = (state.patrol.tenCodes || [])[0];
        return (first && codeMotif[first]) || "une intervention";
    }

    function generatePatrolReport() {
        // P4-7 — Si l'utilisateur a édité manuellement l'aperçu dans la modale
        // Récap, on retourne ce texte tel quel (et on consomme le hook).
        if (typeof lspdPendingManualReport === 'string' && lspdPendingManualReport !== null) {
            const txt = lspdPendingManualReport; lspdPendingManualReport = null; return sanitizeRadioCodes(txt);
        }
        const unit = state.patrol.unit || 'Lincoln';
        // Validation : si unité != Lincoln, il faut sélectionner les agents
        if (unit !== 'Lincoln' && state.selectedAgents.patrol.length === 0) {
            const notice = $('#patrolRosterNotice');
            if (notice) { notice.classList.add('active', 'error'); notice.textContent = '⚠ Unité ' + unit + ' : vous devez sélectionner les agents présents avant de générer le rapport.'; }
            showToast('Sélectionnez les agents présents pour l\'unité ' + unit + '.', 'error');
            return null;
        }

        const dtRaw = $('#patrolDatetime').value;
        const dtObj = dtRaw ? new Date(dtRaw) : new Date();
        const date = lspdFormatDate(dtObj);
        const time = lspdFormatTime(dtObj);
        const location = $('#patrolLocation').value.trim() || 'Non communiqué.';
        const vehicleStr = lspdFormatVehiclePatrol();
        const agents = lspdSelectedRoster('patrol');
        const motif = lspdPatrolMotif();
        const arrestTime = ($('#patrolArrestTime') && $('#patrolArrestTime').value.trim()) || 'NEANT';
        const prosecutor = ($('#patrolProsecutor') && $('#patrolProsecutor').value.trim()) || 'NEANT';

        const origine = complianceGet('patrol', 'origineIntervention');
        const constatation = complianceGet('patrol', 'constatationInitiale');
        const titreCorps = "RÉSUMÉ DES FAITS ET DE L'ARRESTATION";
        const indicatif = complianceGet('patrol', 'indicatifUnite');
        const demandeur = complianceGet('patrol', 'demandeurRenfort');
        const sanction = complianceGet('patrol', 'sanction');
        const reglementSanction = complianceGet('patrol', 'reglementSanction');

        const allSuspects = getSuspectsData('patrolSuspectCards');
        const realSuspects = allSuspects.filter(s => (s.role || 'Suspect') === 'Suspect');
        const { bySuspect } = lspdCollectInfractions('patrolPenalInfractions', realSuspects.length);

        // Chronologie / médical / avocat : une seule fois en fin de rapport.
        const trailer = RULES ? complianceTrailer(buildCtx('patrol')) : '';

        // Si aucun suspect identifié → un seul bloc "Non communiqué."
        if (realSuspects.length === 0) {
            const narrative = lspdBuildPatrolNarrative(null, location);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr, origine, constatation, titreCorps,
                indicatif, demandeur, sanction, reglementSanction,
                infractions: bySuspect[0] || []
            }) + trailer;
        }

        // Un bloc par suspect, séparés par ───────────
        const blocks = realSuspects.map((suspect, idx) => {
            const narrative = lspdBuildPatrolNarrative(suspect, location);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr, origine, constatation, titreCorps,
                indicatif, demandeur, sanction, reglementSanction,
                infractions: bySuspect[idx] || []
            });
        });
        return lspdJoinBlocks(blocks) + trailer;
    }


    $('#btnGeneratePatrol').addEventListener('click', async () => {
        const report = generatePatrolReport();
        if (!report) return;
        renderReportOutput('patrolReportOutput', report);
        renderConsistencyWarnings('patrolReportOutput', checkReportConsistency('patrolPenalInfractions', 'patrol'));
        state.reports++;
        const allTags = Object.values(state.patrol.tags).flat();
        if (allTags.includes('Fouille incidente à l\'arrestation') || allTags.includes('Déclaré apte à l\'incarcération')) state.arrests++;
        updateDashStats();
        saveReportToHistory('Patrouille', report);
        showToast('Rapport de patrouille généré avec succès.');
        if ($('#patrolAiMode') && $('#patrolAiMode').checked) {
            const preEl = $('#patrolReportOutput span');
            if (preEl) await enhanceWithClaude('patrolReportOutput', preEl);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // NARCOTICS REPORT
    // ═══════════════════════════════════════════════════════════════════

    function generateNarcReport() {
        if (typeof lspdPendingManualReport === 'string' && lspdPendingManualReport !== null) {
            const txt = lspdPendingManualReport; lspdPendingManualReport = null; return sanitizeRadioCodes(txt);
        }
        const unit = state.narcotics.unit || 'Lincoln';
        if (unit !== 'Lincoln' && state.selectedAgents.narcotics.length === 0) {
            const notice = $('#narcRosterNotice');
            if (notice) { notice.classList.add('active', 'error'); notice.textContent = '⚠ Unité ' + unit + ' : vous devez sélectionner les agents présents avant de générer le rapport.'; }
            showToast('Sélectionnez les agents présents pour l\'unité ' + unit + '.', 'error');
            return null;
        }

        const dtRaw = $('#narcDatetime').value;
        const dtObj = dtRaw ? new Date(dtRaw) : new Date();
        const date = lspdFormatDate(dtObj);
        const time = lspdFormatTime(dtObj);
        const location = $('#narcLocation').value.trim() || 'Non communiqué.';
        const vehicleStr = 'Non communiqué.';
        const opType = state.narcotics.operationType || 'GND';
        const agents = lspdSelectedRoster('narcotics');
        const motif = "une opération de lutte contre les stupéfiants";
        const arrestTime = ($('#narcArrestTime') && $('#narcArrestTime').value.trim()) || 'NEANT';
        const prosecutor = ($('#narcProsecutor') && $('#narcProsecutor').value.trim()) || 'NEANT';

        const allSuspects = getSuspectsData('narcSuspectCards');
        const realSuspects = allSuspects.filter(s => (s.role || 'Suspect') === 'Suspect');
        const { bySuspect } = lspdCollectInfractions('narcPenalInfractions', realSuspects.length);

        if (realSuspects.length === 0) {
            const narrative = lspdBuildNarcNarrative(null, location, opType);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr,
                infractions: bySuspect[0] || []
            });
        }

        const blocks = realSuspects.map((suspect, idx) => {
            const narrative = lspdBuildNarcNarrative(suspect, location, opType);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr, origine, constatation, titreCorps,
                indicatif, demandeur, sanction, reglementSanction,
                infractions: bySuspect[idx] || []
            });
        });
        return lspdJoinBlocks(blocks);
    }


    $('#btnGenerateNarc').addEventListener('click', async () => {
        const report = generateNarcReport();
        if (!report) return;
        renderReportOutput('narcReportOutput', report);
        renderConsistencyWarnings('narcReportOutput', checkReportConsistency('narcPenalInfractions', 'narc'));
        state.reports++;
        state.drugWeight += parseInt($('#narcWeight').value || 0);
        updateDashStats();
        saveReportToHistory('GND — Narcotiques', report);
        showToast('Rapport GND généré avec succès.');
        if ($('#narcAiMode') && $('#narcAiMode').checked) {
            const preEl = $('#narcReportOutput span');
            if (preEl) await enhanceWithClaude('narcReportOutput', preEl);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // CID MAJOR CRIMES REPORT
    // ═══════════════════════════════════════════════════════════════════

    function generateCIDReport() {
        if (typeof lspdPendingManualReport === 'string' && lspdPendingManualReport !== null) {
            const txt = lspdPendingManualReport; lspdPendingManualReport = null; return sanitizeRadioCodes(txt);
        }
        const dtRaw = $('#cidDatetime').value;
        const dtObj = dtRaw ? new Date(dtRaw) : new Date();
        const date = lspdFormatDate(dtObj);
        const time = lspdFormatTime(dtObj);
        const location = $('#cidLocation').value.trim() || 'Non communiqué.';
        const vehicleStr = 'Non communiqué.';
        const agents = lspdSelectedRoster('cid');
        const crimeType = (state.cid && state.cid.crimeType) || [];
        const motif = crimeType.length ? crimeType.join(' et ').toLowerCase() : "les faits constatés sur une scène de crime";
        const arrestTime = ($('#cidArrestTime') && $('#cidArrestTime').value.trim()) || 'NEANT';
        const prosecutor = ($('#cidProsecutor') && $('#cidProsecutor').value.trim()) || 'NEANT';
        // CID n'utilise pas de penal calculator → infractions vides
        const allSuspects = getSuspectsData('cidSuspectCards');
        const realSuspects = allSuspects.filter(s => (s.role || 'Suspect') === 'Suspect');

        if (realSuspects.length === 0) {
            const narrative = lspdBuildCidNarrative(null, location);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr,
                infractions: []
            });
        }

        const blocks = realSuspects.map((suspect) => {
            const narrative = lspdBuildCidNarrative(suspect, location);
            return lspdBuildReportBlock({
                date, time, location, arrestTime, prosecutor, agents, motif,
                narrative, vehicleStr,
                infractions: []
            });
        });
        return lspdJoinBlocks(blocks);
    }


    $('#btnGenerateCID').addEventListener('click', async () => {
        const report = generateCIDReport();
        renderReportOutput('cidReportOutput', report);
        state.reports++;
        updateDashStats();
        saveReportToHistory('CID — Crimes Majeurs', report);
        showToast('Rapport CID généré avec succès.');
        if ($('#cidAiMode') && $('#cidAiMode').checked) {
            const preEl = $('#cidReportOutput span');
            if (preEl) await enhanceWithClaude('cidReportOutput', preEl);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // INTERROGATION MODULE
    // ═══════════════════════════════════════════════════════════════════

    let qaCount = 0;

    function addQABlock() {
        qaCount++;
        const container = $('#qaContainer');
        const block = document.createElement('div');
        block.className = 'qa-block';
        block.dataset.qa = qaCount;
        block.innerHTML = `
            <div class="qa-block-header">
                <span class="qa-block-number">Q/R #${qaCount}</span>
                <button class="qa-remove" title="Supprimer">&times;</button>
            </div>
            <label>Question :</label>
            <textarea rows="2" class="qa-question" placeholder="Saisissez la question posée..."></textarea>
            <label style="margin-top:10px;">Réponse :</label>
            <textarea rows="2" class="qa-answer" placeholder="Saisissez la réponse obtenue..."></textarea>
        `;
        block.querySelector('.qa-remove').addEventListener('click', () => block.remove());
        container.appendChild(block);
    }

    $('#btnAddQA').addEventListener('click', addQABlock);

    function generateInterroReport() {
        const agents = getSelectedAgentsText('interrogation');
        const subject = $('#interroSubject').value.trim() || 'Non spécifié';
        const phone = $('#interroPhone').value.trim() || 'N/A';
        const email = $('#interroEmail').value.trim() || 'N/A';
        const lawyer = $('#interroLawyer').value.trim() || 'Aucun';
        const judge = $('#interroJudge').value.trim() || 'N/A';
        const start = $('#interroStart').value || 'N/A';
        const end = $('#interroEnd').value || 'En cours';

        let report = '';
        report += `══════════════════════════════════════════\n`;
        report += `   LOS SANTOS POLICE DEPARTMENT\n`;
        report += `   PROCÈS-VERBAL D'INTERROGATOIRE\n`;
        report += `══════════════════════════════════════════\n\n`;

        report += `Agent(s) : ${agents}\n`;
        report += `Personne interrogée : ${subject}\n`;
        report += `Téléphone : ${phone}\n`;
        report += `Email : ${email}\n`;
        report += `Avocat(s) : ${lawyer}\n`;
        report += `Juge(s) : ${judge}\n`;
        report += `Heure de début : ${start}\n`;
        report += `Heure de fin : ${end}\n\n`;

        report += `──────────────────────────────────────────\n`;
        report += `TRANSCRIPTION\n`;
        report += `──────────────────────────────────────────\n\n`;

        const blocks = $$('.qa-block');
        blocks.forEach((block, i) => {
            const q = block.querySelector('.qa-question').value.trim();
            const a = block.querySelector('.qa-answer').value.trim();
            report += `Q${i + 1} : ${q || '(Non renseigné)'}\n`;
            report += `R${i + 1} : ${a || '(Non renseigné)'}\n\n`;
        });

        if (blocks.length === 0) {
            report += `(Aucune question/réponse enregistrée)\n\n`;
        }

        report += `══════════════════════════════════════════\n`;
        report += `Fin du procès-verbal\n`;
        report += `Interrogateur : ${agents}\n`;
        report += `══════════════════════════════════════════`;

        return sanitizeRadioCodes(report);
    }

    $('#btnGenerateInterro').addEventListener('click', async () => {
        const report = generateInterroReport();
        renderReportOutput('interroReportOutput', report);
        state.reports++;
        updateDashStats();
        saveReportToHistory('Interrogatoire', report);
        showToast('Procès-verbal d\'interrogatoire généré.');
        if ($('#interroAiMode') && $('#interroAiMode').checked) {
            const preEl = $('#interroReportOutput span');
            if (preEl) await enhanceWithClaude('interroReportOutput', preEl);
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // PENAL CODE CALCULATOR
    // ═══════════════════════════════════════════════════════════════════

    // ── Shared helper: build one penal row (with quantity sub-row) ──
    function buildPenalRow(item, catIdx, itemIdx, onChangeCb) {
        const row = document.createElement('div');
        row.className = 'penal-row';
        const prisonText = item.prison || '-';
        row.innerHTML = `
            <input type="checkbox" data-cat="${catIdx}" data-item="${itemIdx}" data-qty="1">
            <span class="penal-name">${item.name}</span>
            <span class="penal-fine">$${item.fine.toLocaleString('fr-FR')}</span>
            <span class="penal-prison">${prisonText}</span>
        `;
        const cb = row.querySelector('input[type="checkbox"]');
        const fineSpan = row.querySelector('.penal-fine');
        const prisonSpan = row.querySelector('.penal-prison');

        // All items get a quantity row
        const qtyRow = document.createElement('div');
        qtyRow.className = 'penal-qty-row';
        const unitLabel = item.qtyUnit || 'fois';
        const prisonPreviewHTML = item.qtyPrison ? `<span class="qty-prison-preview"></span>` : '';
        qtyRow.innerHTML = `
            <span class="qty-label">↳ Quantité :</span>
            <input type="number" class="qty-input" min="1" value="1" placeholder="Qté">
            <span class="qty-unit">${escapeHtml(unitLabel)}</span>
            <span class="qty-fine-preview">→ $${item.fine.toLocaleString('fr-FR')}</span>
            ${prisonPreviewHTML}
        `;
        const qtyInput = qtyRow.querySelector('.qty-input');
        const finePrev = qtyRow.querySelector('.qty-fine-preview');
        const prisonPrev = qtyRow.querySelector('.qty-prison-preview');

        function updateQtyCalc() {
            const qty = Math.max(1, parseInt(qtyInput.value) || 1);
            cb.dataset.qty = String(qty);
            const calcFine = item.fine * qty;
            finePrev.textContent = `→ $${calcFine.toLocaleString('fr-FR')}`;
            fineSpan.textContent = `$${calcFine.toLocaleString('fr-FR')}`;
            if (item.qtyPrison && prisonPrev) {
                const extraDays = Math.ceil(qty / item.qtyPrison.per);
                const totalDays = item.qtyPrison.base + extraDays;
                prisonPrev.textContent = `≈ ${totalDays}j de prison`;
                prisonSpan.textContent = `${totalDays}j`;
            }
            onChangeCb();
        }

        qtyInput.addEventListener('input', updateQtyCalc);

        cb.addEventListener('change', function (e) {
            row.classList.toggle('checked', e.target.checked);
            qtyRow.classList.toggle('visible', e.target.checked);
            if (e.target.checked) {
                updateQtyCalc();
            } else {
                qtyInput.value = 1;
                cb.dataset.qty = '1';
                cb.dataset.suspects = '';
                fineSpan.textContent = `$${item.fine.toLocaleString('fr-FR')}`;
                if (item.qtyPrison) prisonSpan.textContent = prisonText;
                onChangeCb();
            }
            if (typeof lspdRefreshAllPenalChips === 'function') lspdRefreshAllPenalChips();
        });

        return { row, qtyRow };
    }

    function buildPenalCode() {
        const container = $('#penalInfractions');

        DB.penalCode.forEach((cat, catIdx) => {
            const section = document.createElement('div');
            section.className = 'penal-cat-section';

            const header = document.createElement('div');
            header.className = 'penal-cat-header';
            header.innerHTML = `${cat.category} <span class="chevron">▼</span>`;
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                body.classList.toggle('collapsed');
            });

            const body = document.createElement('div');
            body.className = 'penal-cat-body';

            cat.items.forEach((item, itemIdx) => {
                const { row, qtyRow } = buildPenalRow(item, catIdx, itemIdx, updatePenalTotals);
                body.appendChild(row);
                if (qtyRow) body.appendChild(qtyRow);
            });

            section.appendChild(header);
            section.appendChild(body);
            container.appendChild(section);
        });
    }

    function updatePenalTotals() {
        let totalFine = 0;
        let totalCharges = 0;
        const checkedItems = [];

        $$('#penalInfractions input[type="checkbox"]:checked').forEach(cb => {
            const catIdx = parseInt(cb.dataset.cat);
            const itemIdx = parseInt(cb.dataset.item);
            const qty = parseInt(cb.dataset.qty) || 1;
            const item = DB.penalCode[catIdx].items[itemIdx];
            const calcFine = item.fine * qty;
            totalFine += calcFine;
            totalCharges++;
            checkedItems.push({ item, qty, calcFine });
        });

        $('#penalTotalFine').textContent = '$' + totalFine.toLocaleString('fr-FR');
        $('#penalTotalPrison').textContent = totalCharges > 0 ? `${totalCharges} chef(s)` : '-';
        $('#penalTotalCharges').textContent = totalCharges;

        state.totalFines = totalFine;
        updateDashStats();

        // Generate charge sheet
        const output = $('#penalReportOutput');
        if (totalCharges === 0) {
            output.innerHTML = '<p class="placeholder-text">Cochez des infractions pour générer la fiche.</p>';
            return;
        }

        const suspectName = $('#penalSuspectName').value.trim() || 'Suspect non identifié';
        let report = '';
        report += `══════════════════════════════════════════\n`;
        report += `   LOS SANTOS POLICE DEPARTMENT\n`;
        report += `   FICHE DE CHARGES\n`;
        report += `══════════════════════════════════════════\n\n`;
        report += `Suspect : ${suspectName}\n`;
        report += `Date : ${formatNow()}\n\n`;
        report += `──────────────────────────────────────────\n`;
        report += `CHARGES RETENUES (${totalCharges})\n`;
        report += `──────────────────────────────────────────\n\n`;

        checkedItems.forEach(({ item, qty, calcFine }, i) => {
            const prisonText = item.prison || '-';
            const qtyText = qty > 1 ? ` [×${qty} ${item.qtyUnit || 'fois'}]` : '';
            report += `${i + 1}. ${item.name}${qtyText}\n`;
            report += `   Amende : $${calcFine.toLocaleString('fr-FR')} | Réf. pénale : ${prisonText}\n\n`;
        });

        report += `──────────────────────────────────────────\n`;
        report += `TOTAL\n`;
        report += `──────────────────────────────────────────\n\n`;
        report += `Amende totale : $${totalFine.toLocaleString('fr-FR')}\n`;
        report += `Charges : ${totalCharges}\n\n`;
        report += `══════════════════════════════════════════`;

        output.innerHTML = '';
        renderReportOutput('penalReportOutput', report);
    }

    // Also update when suspect name changes
    document.addEventListener('DOMContentLoaded', () => {
        const nameInput = $('#penalSuspectName');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                if ($$('#penalInfractions input[type="checkbox"]:checked').length > 0) {
                    updatePenalTotals();
                }
            });
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EXPORT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    function exportMarkdown(reportText, filename) {
        // LSPD : Markdown = texte brut identique au TXT (aucun #, **, —, ni bloc de code).
        downloadFile(reportText, filename + '.md', 'text/markdown');
    }

    function exportText(reportText, filename) {
        downloadFile(reportText, filename + '.txt', 'text/plain');
    }

    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type: type + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Fichier "${filename}" téléchargé.`);
    }

    function getReportText(outputId) {
        const output = $(`#${outputId}`);
        const span = output.querySelector('span');
        return span ? span.textContent : '';
    }

    // Patrol exports
    $('#btnPatrolExportMD').addEventListener('click', () => exportMarkdown(getReportText('patrolReportOutput') || generatePatrolReport(), 'rapport-patrouille'));
    $('#btnPatrolExportTXT').addEventListener('click', () => exportText(getReportText('patrolReportOutput') || generatePatrolReport(), 'rapport-patrouille'));

    // Narcotics exports
    $('#btnNarcExportMD').addEventListener('click', () => exportMarkdown(getReportText('narcReportOutput') || generateNarcReport(), 'rapport-gnd'));
    $('#btnNarcExportTXT').addEventListener('click', () => exportText(getReportText('narcReportOutput') || generateNarcReport(), 'rapport-gnd'));

    // CID exports
    $('#btnCIDExportMD').addEventListener('click', () => exportMarkdown(getReportText('cidReportOutput') || generateCIDReport(), 'rapport-cid'));
    $('#btnCIDExportTXT').addEventListener('click', () => exportText(getReportText('cidReportOutput') || generateCIDReport(), 'rapport-cid'));

    // Interrogation exports
    $('#btnInterroExportMD').addEventListener('click', () => exportMarkdown(getReportText('interroReportOutput') || generateInterroReport(), 'pv-interrogatoire'));
    $('#btnInterroExportTXT').addEventListener('click', () => exportText(getReportText('interroReportOutput') || generateInterroReport(), 'pv-interrogatoire'));

    // Penal exports
    $('#btnPenalExportMD').addEventListener('click', () => exportMarkdown(getReportText('penalReportOutput'), 'fiche-charges'));
    $('#btnPenalExportTXT').addEventListener('click', () => exportText(getReportText('penalReportOutput'), 'fiche-charges'));

    // ═══════════════════════════════════════════════════════════════════
    // RESET BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    $('#btnPatrolReset').addEventListener('click', () => {
        $('#patrolLocation').value = '';
        $('#patrolDatetime').value = '';
        $('#patrolNotes').value = '';
        $('#patrolVehicleModel').value = '';
        $('#patrolVehiclePlate').value = '';
        if ($('#patrolFirearmSerial')) $('#patrolFirearmSerial').value = '';
        if ($('#patrolFirearmModelCustom')) $('#patrolFirearmModelCustom').value = '';
        if ($('#patrolFirearmSerialRow')) $('#patrolFirearmSerialRow').classList.remove('visible');
        if ($('#patrolGsrRow')) $('#patrolGsrRow').classList.remove('visible');
        if ($('#patrolGsrNotes')) $('#patrolGsrNotes').value = '';
        $$('#patrolGsrSelector .tag-btn').forEach(b => b.classList.remove('active'));
        state.patrol = { unit: null, status: null, tenCode: null, tenCodes: [], tags: { suspect_state: [], impact_detail: [], agent_state: [], suspect_obs: [], behavior: [], aggressor: [], aggression_origin: [], suspect_flight: [], pursuit_end: [], force: [], tests: [], search_person: [], search_vehicle: [], miranda: [], medical_end: [] }, pursuitEndLocation: '', anatomicalZones: [], vehicleColor: [], vehicleState: [], evidence: [], ammoTypes: [] };
        if ($('#pursuitEndLocation')) $('#pursuitEndLocation').value = '';
        const pursuitPanel = $('#dynamic-pursuit-panel');
        if (pursuitPanel) pursuitPanel.style.display = 'none';
        if ($('#patrolAmmoRow')) $('#patrolAmmoRow').classList.remove('visible');
        $$('#patrolAmmoTypes .tag-btn').forEach(b => b.classList.remove('active'));
        // Reset body map
        $$('.body-zone').forEach(z => z.classList.remove('selected-wound'));
        const bodyMapEl = $('#bodyMapContainer');
        if (bodyMapEl) bodyMapEl.style.display = 'none';
        const bodySelEl = $('#bodyMapSelection');
        if (bodySelEl) bodySelEl.innerHTML = '';
        state.selectedAgents.patrol = [];
        $$('#mod-patrol .tag-btn').forEach(b => b.classList.remove('active'));
        // Reset suspect cards — keep only the first one empty
        const suspCards = $('#patrolSuspectCards');
        suspCards.innerHTML = '';
        addSuspectCard('patrolSuspectCards');
        suspCards.querySelector('.suspect-remove').style.display = 'none';
        $('#patrolReportOutput').innerHTML = '<p class="placeholder-text">Le rapport apparaîtra ici après génération.</p>';
        // Reset inline penal checkboxes
        $$('#patrolPenalInfractions input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.closest('.penal-row').classList.remove('checked'); });
        updateInlinePenalTotals('patrolPenalInfractions', 'patrolPenalFine', 'patrolPenalPrison', 'patrolPenalCharges');
        updateTenCodeChain();
        updateStateChain('suspect_state');
        updateStateChain('impact_detail');
        updateStateChain('agent_state');
        syncOpsModules();
        refreshAllRosterSelectors();
        showToast('Module Patrouille réinitialisé.', 'warning');
    });

    $('#btnNarcReset').addEventListener('click', () => {
        $('#narcLocation').value = '';
        $('#narcDatetime').value = '';
        $('#narcWeight').value = '';
        $('#narcMoney').value = '';
        if ($('#narcCaseNumber')) $('#narcCaseNumber').value = '';
        if ($('#narcIntelDetail')) $('#narcIntelDetail').value = '';
        if ($('#narcStakeoutPosition')) $('#narcStakeoutPosition').value = '';
        if ($('#narcSurveillanceNotes')) $('#narcSurveillanceNotes').value = '';
        if ($('#narcNotes')) $('#narcNotes').value = '';
        state.narcotics = { unit: null, operationType: null, drugs: [], packaging: [], gang: [], weapons: [], surveillanceMeans: [], observations: [], interventionTriggers: [], approachMethods: [], intelSources: [], operationResults: [], surveillanceDuration: null, roles: [] };
        state.selectedAgents.narcotics = [];
        $$('#mod-narcotics .tag-btn').forEach(b => b.classList.remove('active'));
        const narcSusp = $('#narcSuspectCards');
        narcSusp.innerHTML = '';
        addSuspectCard('narcSuspectCards');
        narcSusp.querySelector('.suspect-remove').style.display = 'none';
        $('#narcReportOutput').innerHTML = '<p class="placeholder-text">Le rapport apparaîtra ici après génération.</p>';
        // Reset inline penal checkboxes
        $$('#narcPenalInfractions input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.closest('.penal-row').classList.remove('checked'); });
        updateInlinePenalTotals('narcPenalInfractions', 'narcPenalFine', 'narcPenalPrison', 'narcPenalCharges');
        refreshAllRosterSelectors();
        showToast('Module GND réinitialisé.', 'warning');
    });

    $('#btnCIDReset').addEventListener('click', () => {
        $('#cidCaseNumber').value = '';
        $('#cidLocation').value = '';
        $('#cidDatetime').value = '';
        $('#cidShellCount').value = '';
        $('#cidJudge').value = '';
        $('#cidWarrantTarget').value = '';
        state.cid = { crimeType: [], ballistics: [], fingerprints: [], victims: [], warrant: [] };
        state.selectedAgents.cid = [];
        $$('#mod-crimes .tag-btn').forEach(b => b.classList.remove('active'));
        const cidSusp = $('#cidSuspectCards');
        cidSusp.innerHTML = '';
        addSuspectCard('cidSuspectCards');
        cidSusp.querySelector('.suspect-remove').style.display = 'none';
        $('#cidReportOutput').innerHTML = '<p class="placeholder-text">Le rapport apparaîtra ici après génération.</p>';
        refreshAllRosterSelectors();
        showToast('Module CID réinitialisé.', 'warning');
    });

    $('#btnInterroReset').addEventListener('click', () => {
        $('#interroSubject').value = '';
        $('#interroPhone').value = '';
        $('#interroEmail').value = '';
        $('#interroLawyer').value = '';
        $('#interroJudge').value = '';
        $('#interroStart').value = '';
        $('#interroEnd').value = '';
        state.selectedAgents.interrogation = [];
        qaCount = 0;
        $('#qaContainer').innerHTML = '';
        $('#interroReportOutput').innerHTML = '<p class="placeholder-text">Le procès-verbal apparaîtra ici après génération.</p>';
        refreshAllRosterSelectors();
        showToast('Module Interrogatoire réinitialisé.', 'warning');
    });

    $('#btnPenalReset').addEventListener('click', () => {
        $$('#penalInfractions input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.closest('.penal-row').classList.remove('checked');
        });
        $('#penalSuspectName').value = '';
        updatePenalTotals();
        showToast('Code Pénal réinitialisé.', 'warning');
    });

    // ═══════════════════════════════════════════════════════════════════
    // GTA V MINI-MAP MODULE
    // ═══════════════════════════════════════════════════════════════════

    const GTA_LOCATIONS = [
        // Centre Ville LS
        { name: 'PDP Mission Row', lat: -1010, lng: 470, zone: 'Centre Ville' },
        { name: 'Pillbox Medical Center', lat: -600, lng: 345, zone: 'Centre Ville' },
        { name: 'Tour Maze Bank', lat: -840, lng: -60, zone: 'Centre Ville' },
        { name: 'FIB', lat: -750, lng: 155, zone: 'Centre Ville' },
        { name: 'Union Depository', lat: -700, lng: -10, zone: 'Centre Ville' },
        { name: 'Musée Central LS', lat: -620, lng: -520, zone: 'Centre Ville' },
        { name: 'Globe Oil / Rockford', lat: -640, lng: -265, zone: 'Centre Ville' },
        { name: 'Chinatown', lat: -770, lng: 472, zone: 'Centre Ville' },
        { name: 'Entrepôt de Bus', lat: -640, lng: 450, zone: 'Centre Ville' },
        // Vinewood / Rockford Hills
        { name: 'Observatoire', lat: 1125, lng: -400, zone: 'Vinewood Hills' },
        { name: 'Lettres Vinewood', lat: 1200, lng: 675, zone: 'Vinewood Hills' },
        { name: 'Eclipse Tower', lat: 320, lng: -755, zone: 'Rockford Hills' },
        { name: 'Tequilala', lat: 280, lng: -550, zone: 'Rockford Hills' },
        { name: 'Pacific Bank', lat: 215, lng: 270, zone: 'Vinewood' },
        { name: 'DOJ / Gouvernement', lat: -200, lng: -525, zone: 'Rockford Hills' },
        { name: 'LS Customs Rockford', lat: -140, lng: -350, zone: 'Rockford Hills' },
        { name: 'Bijouterie', lat: -250, lng: -620, zone: 'Rockford Hills' },
        { name: 'Vinewood Bowl', lat: 600, lng: 700, zone: 'Vinewood Hills' },
        // Davis / Chamberlain Hills
        { name: 'Groove Street', lat: -1960, lng: 120, zone: 'Davis' },
        { name: 'Forum Drive / Chamberlain', lat: -1560, lng: -85, zone: 'Chamberlain Hills' },
        { name: 'Unicorn / Strip Club', lat: -1325, lng: 160, zone: 'Davis' },
        { name: 'Mega Mall', lat: -1770, lng: 60, zone: 'Davis' },
        { name: 'Bennys Motors', lat: -1345, lng: -200, zone: 'Davis' },
        { name: 'Morgue Centrale', lat: -1395, lng: 260, zone: 'Davis' },
        // La Mesa / East LS
        { name: 'La Mesa', lat: -1350, lng: 810, zone: 'La Mesa' },
        { name: 'El Burro Heights', lat: -1630, lng: 1345, zone: 'El Burro Heights' },
        { name: 'SSX / Entrepôt La Mesa', lat: -1780, lng: 750, zone: 'La Mesa' },
        // Rancho
        { name: 'Rancho Nord', lat: -1845, lng: 480, zone: 'Rancho' },
        { name: 'Rancho Sud', lat: -2030, lng: 310, zone: 'Rancho' },
        { name: 'Tortue Vagos', lat: -2235, lng: 150, zone: 'Rancho' },
        // Terminal / Sud LS
        { name: 'Chantier Naval', lat: -2600, lng: -150, zone: 'Terminal' },
        { name: 'Terminal Container', lat: -3140, lng: 1000, zone: 'Terminal' },
        { name: 'MerryWeather HQ', lat: -3100, lng: 550, zone: 'Terminal' },
        { name: 'Bugstars', lat: -3000, lng: 225, zone: 'Terminal' },
        // Aéroport / Forum SW
        { name: 'Aéroport LSIA', lat: -2700, lng: -975, zone: 'Aéroport' },
        { name: 'Maze Bank Arena', lat: -2000, lng: -250, zone: 'Forum Drive' },
        { name: 'LS Customs Aéroport', lat: -2025, lng: -1100, zone: 'Aéroport' },
        // Marina / Little Seoul
        { name: 'Marina', lat: -1325, lng: -775, zone: 'Marina' },
        { name: 'Héliport Marina', lat: -1450, lng: -700, zone: 'Marina' },
        { name: 'Binco Little Seoul', lat: -1110, lng: -800, zone: 'Little Seoul' },
        // Del Perro / Vespucci / Bellevue
        { name: 'PDP Vespucci', lat: -850, lng: -1070, zone: 'Vespucci' },
        { name: 'Fête Foraine Del Perro', lat: -1050, lng: -1590, zone: 'Del Perro' },
        { name: 'Canaux de Vespucci', lat: -1090, lng: -1010, zone: 'Vespucci' },
        { name: 'Cimetière Bellevue', lat: -250, lng: -1680, zone: 'Bellevue' },
        { name: 'Studio Cinéma', lat: -525, lng: -1090, zone: 'Del Perro' },
        { name: 'Lombank', lat: -585, lng: -1545, zone: 'Del Perro' },
        { name: 'Quartier Morningwood', lat: -350, lng: -1450, zone: 'Morningwood' },
        // Mirror Park / Casino
        { name: 'Mirror Park', lat: -575, lng: 1125, zone: 'Mirror Park' },
        { name: 'Arcade', lat: -830, lng: 760, zone: 'Mirror Park' },
        { name: 'Casino Diamond', lat: 25, lng: 975, zone: 'Vinewood East' },
        { name: 'NOOSE HQ', lat: -400, lng: 2500, zone: 'Palomino Highlands' },
        { name: 'Hippodrome', lat: 100, lng: 1150, zone: 'Vinewood East' },
        { name: 'Barrage', lat: -25, lng: 1675, zone: 'East LS' },
        // Sandy Shores / Blaine County
        { name: 'Route 68 / Ciment', lat: 2860, lng: 315, zone: 'Sandy Shores' },
        { name: 'Fleeca Route 68', lat: 2710, lng: 1190, zone: 'Sandy Shores' },
        { name: 'BolingBroke Pénitencier', lat: 2575, lng: 1700, zone: 'Sandy Shores' },
        { name: 'Aéroport Sandy Shores', lat: 3250, lng: 1750, zone: 'Sandy Shores' },
        { name: 'PDP Sandy Shores', lat: 3685, lng: 1845, zone: 'Sandy Shores' },
        { name: 'Yellow Jack Inn', lat: 3050, lng: 2000, zone: 'Sandy Shores' },
        { name: 'Stab City', lat: 3680, lng: 75, zone: 'Sandy Shores' },
        { name: 'Rodéo Sandy', lat: 2200, lng: 1550, zone: 'Sandy Shores' },
        { name: 'Raffinerie / Power Station', lat: 1525, lng: 2725, zone: 'East County' },
        { name: 'Humane Labs', lat: 3715, lng: 3530, zone: 'Humane Labs' },
        { name: 'Aérodrome Grapeseed', lat: 4775, lng: 2050, zone: 'Grapeseed' },
        { name: 'Ferme O\'Neil', lat: 5020, lng: 2420, zone: 'Grapeseed' },
        { name: 'Fort Zancudo / Base Militaire', lat: 3170, lng: -2200, zone: 'Zancudo' },
        { name: 'Chumash', lat: 1080, lng: -3115, zone: 'Chumash' },
        { name: 'Mont Chiliad', lat: 5550, lng: 500, zone: 'Chiliad' },
        { name: 'PDP Paleto Bay', lat: 6025, lng: -440, zone: 'Paleto Bay' },
        { name: 'LS Custom Paleto', lat: 6625, lng: 150, zone: 'Paleto Bay' },
        { name: 'Phare', lat: 5180, lng: 3425, zone: 'North Chumash' },
        { name: 'Mine Abandonnée', lat: 2100, lng: -580, zone: 'Blaine County' },
        { name: 'Ferme Aux Cochons', lat: 1910, lng: -65, zone: 'Blaine County' },
        { name: 'Vigneron', lat: 2050, lng: -1860, zone: 'Great Ocean Highway' },
        { name: 'Pacific Bluffs', lat: 80, lng: -2975, zone: 'Pacific Bluffs' }
    ];

    let gtaMap = null;
    let activeLocationTarget = null;

    function openGtaMap(targetInputId) {
        activeLocationTarget = targetInputId;
        $('#gtaMapModal').classList.add('active');
        if (!gtaMap) {
            // Defer init by one frame so the modal is visible first
            setTimeout(initLeafletMap, 50);
        } else {
            setTimeout(() => gtaMap.invalidateSize(), 50);
        }
        $('#mapSelectedInfo').textContent = 'Cliquez sur un marqueur pour sélectionner la position';
    }

    function initLeafletMap() {
        if (typeof L === 'undefined') {
            showToast('Leaflet non disponible (vendor/leaflet/leaflet.js introuvable).', 'error');
            return;
        }
        const CUSTOM_CRS = L.extend({}, L.CRS.Simple, {
            projection: L.Projection.LonLat,
            scale: function(zoom) { return Math.pow(2, zoom); },
            zoom: function(sc) { return Math.log(sc) / 0.6931471805599453; },
            distance: function(pos1, pos2) {
                const dx = pos2.lng - pos1.lng, dy = pos2.lat - pos1.lat;
                return Math.sqrt(dx * dx + dy * dy);
            },
            transformation: new L.Transformation(0.02072, 117.3, -0.0205, 172.8),
            infinite: true
        });
        gtaMap = L.map('gtaMap', {
            crs: CUSTOM_CRS,
            minZoom: 1,
            maxZoom: 5,
            center: [0, 0],
            zoom: 3,
            preferCanvas: true
        });
        // Tuiles de carte GTA V hébergées par le projet soukapic/LSPD-Carte-10-20
        // (GitHub Pages, https://soukapic.github.io/LSPD-Carte-10-20). Même source
        // déjà utilisée en production par cette app, et seule origine autorisée en
        // img-src par la CSP → aucun asset local à héberger, chargement lazy (les
        // tuiles ne sont demandées qu'à l'ouverture de la carte). Deux styles :
        //  · Atlas  = carte façon plan papier AVEC noms de rues visibles (défaut,
        //             pour repérer une rue à saisir dans le champ Lieu) ;
        //  · Satellite = vue aérienne (les repères dorés ressortent mieux dessus).
        const TILE_BASE = 'https://soukapic.github.io/LSPD-Carte-10-20/mapStyles/';
        const atlasLayer = L.tileLayer(TILE_BASE + 'styleAtlas/{z}/{x}/{y}.jpg', {
            minZoom: 0, maxZoom: 8, noWrap: true, attribution: 'GTA V map — soukapic/LSPD-Carte-10-20'
        });
        const satelliteLayer = L.tileLayer(TILE_BASE + 'styleSatelite/{z}/{x}/{y}.jpg', {
            minZoom: 0, maxZoom: 8, noWrap: true, attribution: 'GTA V map — soukapic/LSPD-Carte-10-20'
        });
        atlasLayer.addTo(gtaMap); // défaut : Atlas (noms de rues lisibles)
        L.control.layers(
            { 'Atlas (noms de rues)': atlasLayer, 'Satellite': satelliteLayer },
            null,
            { collapsed: false }
        ).addTo(gtaMap);
        GTA_LOCATIONS.forEach(function(loc) {
            const marker = L.circleMarker([loc.lat, loc.lng], {
                radius: 7,
                fillColor: '#c9a84c',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.92
            }).addTo(gtaMap);
            marker.bindTooltip(
                '<b>' + loc.name + '</b><br><small>' + loc.zone + '</small>',
                { permanent: false, direction: 'top', offset: [0, -10], opacity: 0.95 }
            );
            marker.on('click', function() {
                const locationStr = loc.name + ', ' + loc.zone;
                if (activeLocationTarget) {
                    const inp = $(`#${activeLocationTarget}`);
                    if (inp) inp.value = locationStr;
                }
                $('#mapSelectedInfo').textContent = '\u2713 Sélectionné : ' + locationStr;
                setTimeout(function() { $('#gtaMapModal').classList.remove('active'); }, 600);
            });
        });
    }

    // Peuple le <datalist> partagé avec les rues officielles GTA V (DB.gtaStreets).
    // Une seule liste réutilisée par tous les champs « Lieu » via list="gtaStreetsList".
    // L'autocomplétion suggère sans imposer : le champ accepte toujours du texte libre.
    function initStreetAutocomplete() {
        const list = $('#gtaStreetsList');
        if (!list || !Array.isArray(DB.gtaStreets)) return;
        const frag = document.createDocumentFragment();
        DB.gtaStreets.forEach(function(street) {
            const opt = document.createElement('option');
            opt.value = street;
            frag.appendChild(opt);
        });
        list.innerHTML = '';
        list.appendChild(frag);
    }

    function initMapButtons() {
        $$('.btn-map-pick').forEach(function(btn) {
            btn.addEventListener('click', function() { openGtaMap(btn.dataset.target); });
        });
        $('#btnCloseGtaMap').addEventListener('click', function() {
            $('#gtaMapModal').classList.remove('active');
        });
        $('#gtaMapModal').addEventListener('click', function(e) {
            if (e.target === $('#gtaMapModal')) $('#gtaMapModal').classList.remove('active');
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANATOMICAL BODY MAP
    // ═══════════════════════════════════════════════════════════════════

    function initBodyMap() {
        const container = $('#bodyMapContainer');
        if (!container) return;

        // Injury tags that should show the body map
        const injuryTags = [
            'Suspect blessé par balle (GSW)',
            'Suspect blessé à l\'arme blanche',
            'Suspect blessé — Traumatisme / Coups',
            'Suspect décédé',
            'Décès constaté',
            'Agent blessé par balle (GSW)',
            'Agent blessé à l\'arme blanche',
            'Agent blessé — Traumatisme / Coups',
            'Agent décédé'
        ];

        // Toggle body map visibility when injury-related tags are clicked
        const tagBuilder = document.querySelector('.tag-builder');
        if (tagBuilder) {
            tagBuilder.addEventListener('click', () => {
                const allSelected = Object.values(state.patrol.tags).flat();
                const hasInjury = injuryTags.some(tag => allSelected.includes(tag));
                container.style.display = hasInjury ? 'block' : 'none';
                if (!hasInjury) {
                    // Clear anatomical selections when no injury is selected
                    state.patrol.anatomicalZones = [];
                    $$('.body-zone').forEach(z => z.classList.remove('selected-wound'));
                    updateBodyMapSelection();
                }
            });
        }

        // Click handlers for body zones
        $$('.body-zone').forEach(zone => {
            zone.addEventListener('click', () => {
                const zoneName = zone.dataset.zone;
                zone.classList.toggle('selected-wound');
                if (zone.classList.contains('selected-wound')) {
                    if (!state.patrol.anatomicalZones.includes(zoneName)) {
                        state.patrol.anatomicalZones.push(zoneName);
                    }
                } else {
                    const idx = state.patrol.anatomicalZones.indexOf(zoneName);
                    if (idx > -1) state.patrol.anatomicalZones.splice(idx, 1);
                }
                updateBodyMapSelection();
            });
        });
    }

    function updateBodyMapSelection() {
        const selEl = $('#bodyMapSelection');
        if (!selEl) return;
        selEl.innerHTML = '';
        state.patrol.anatomicalZones.forEach(zone => {
            const tag = document.createElement('span');
            tag.className = 'wound-tag';
            tag.innerHTML = `${escapeHtml(zone)} <span class="wound-remove">&times;</span>`;
            tag.querySelector('.wound-remove').addEventListener('click', () => {
                const idx = state.patrol.anatomicalZones.indexOf(zone);
                if (idx > -1) state.patrol.anatomicalZones.splice(idx, 1);
                const zoneEl = document.querySelector(`.body-zone[data-zone="${zone}"]`);
                if (zoneEl) zoneEl.classList.remove('selected-wound');
                updateBodyMapSelection();
            });
            selEl.appendChild(tag);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LSPD P4 — UX HELPERS (stepper, ops badges, compact suspects, recap)
    // ═══════════════════════════════════════════════════════════════════

    // P4-2 — Patrol stepper
    function lspdUpdatePatrolStepper() {
        const stepper = $('#patrolStepper');
        if (!stepper) return;
        const isFilled = {
            1: !!($('#patrolLocation') && $('#patrolLocation').value.trim()) ||
               !!($('#patrolDatetime') && $('#patrolDatetime').value) ||
               (state.patrol.tenCodes && state.patrol.tenCodes.length > 0),
            2: ($$('#patrolSuspectCards .suspect-card') || []).length > 0,
            3: (function() {
                const v = getVehicleData();
                return !!(v.model || v.plate || (v.color && v.color.length) || (v.state && v.state.length));
            })(),
            4: Object.values(state.patrol.tags).some(arr => Array.isArray(arr) && arr.length > 0),
            5: $$('#patrolComplianceFields .cf-input').some(el => el.value.trim().length > 0),
            6: $$('#patrolPenalInfractions input[type="checkbox"]:checked').length > 0,
            7: !!($('#patrolReportOutput') && $('#patrolReportOutput').textContent.trim().length > 0)
        };
        // Determine current "active" step = first non-done
        let activeFound = false;
        stepper.querySelectorAll('li').forEach(li => {
            const step = parseInt(li.dataset.step);
            const done = !!isFilled[step];
            li.classList.toggle('done', done);
            li.classList.remove('active');
            if (!activeFound && !done) {
                li.classList.add('active');
                activeFound = true;
            }
        });
    }

    function lspdInitPatrolStepper() {
        if (!$('#patrolStepper')) return;
        // Click on a step → ouvre CETTE section (accordéon) et ferme les autres
        $$('#patrolStepper li').forEach(li => {
            li.addEventListener('click', () => {
                const step = li.dataset.step;
                const target = document.querySelector(`#mod-patrol .form-section[data-step="${step}"]`);
                if (!target) return;
                document.querySelectorAll('#mod-patrol > .form-section.fs-enhanced').forEach(s => {
                    if (s !== target) s.classList.add('fs-collapsed');
                });
                target.classList.remove('fs-collapsed');
                requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
            });
        });
        // Re-evaluate on every input/change/click within patrol
        const root = $('#mod-patrol');
        if (root) {
            ['input', 'change', 'click'].forEach(ev =>
                root.addEventListener(ev, () => lspdUpdatePatrolStepper(), true));
        }
        lspdUpdatePatrolStepper();
    }

    // P4-4 — Ops module badges & summary
    function lspdUpdateOpsBadge(moduleEl) {
        if (!moduleEl) return;
        const header = moduleEl.querySelector('.ops-module-header');
        if (!header) return;
        const titleEl = header.querySelector('.ops-module-title');
        if (!titleEl) return;
        const checked = !!moduleEl.querySelector('.ops-module-toggle:checked, input[type="checkbox"][data-ops-target]:checked');
        // Remove old badge & summary
        const oldBadge = header.querySelector('.ops-module-badge');
        if (oldBadge) oldBadge.remove();
        const oldSummary = header.querySelector('.ops-module-summary');
        if (oldSummary) oldSummary.remove();
        if (!checked) return;
        const tags = $$('.ops-tag.active, .tag-btn.active', moduleEl);
        const subSections = $$('.tag-selector', moduleEl).filter(sel =>
            sel.querySelector('.tag-btn.active')).length;
        const badge = document.createElement('span');
        badge.className = 'ops-module-badge';
        badge.textContent = `• ${tags.length} tags · ${subSections} sous-sections`;
        titleEl.insertAdjacentElement('afterend', badge);
        // Summary line (visible only when collapsed)
        if (tags.length > 0) {
            const summary = document.createElement('div');
            summary.className = 'ops-module-summary';
            const labels = tags.slice(0, 6).map(t => t.dataset.tag || t.textContent.trim());
            summary.textContent = labels.join(' · ') + (tags.length > 6 ? ` … (+${tags.length - 6})` : '');
            header.appendChild(summary);
        }
    }

    function lspdRefreshAllOpsBadges() {
        $$('.ops-module').forEach(lspdUpdateOpsBadge);
    }

    function lspdInitOpsBadges() {
        $$('.ops-module').forEach(mod => {
            mod.addEventListener('click', () => setTimeout(() => lspdUpdateOpsBadge(mod), 0));
            mod.addEventListener('change', () => lspdUpdateOpsBadge(mod));
        });
        lspdRefreshAllOpsBadges();
    }

    // P4-5 — Compact suspect cards (3rd+)
    function lspdApplyCompactSuspects(containerId) {
        const cards = $$(`#${containerId} .suspect-card`);
        cards.forEach((card, idx) => {
            // Ensure body wrapper + toggle button exist
            if (!card.querySelector('.suspect-card-body')) {
                const header = card.querySelector('.suspect-card-header');
                if (!header) return;
                // Wrap everything except header in .suspect-card-body
                const body = document.createElement('div');
                body.className = 'suspect-card-body';
                while (header.nextSibling) body.appendChild(header.nextSibling);
                card.appendChild(body);
                // Add summary span in header
                const summary = document.createElement('span');
                summary.className = 'suspect-compact-summary';
                header.insertBefore(summary, header.querySelector('.suspect-remove'));
                // Add toggle button before remove
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'suspect-card-toggle';
                toggle.title = 'Plier / Déplier';
                toggle.textContent = 'Plier';
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    card.classList.toggle('compact');
                    toggle.textContent = card.classList.contains('compact') ? 'Déplier' : 'Plier';
                    lspdUpdateSuspectSummary(card);
                });
                header.insertBefore(toggle, header.querySelector('.suspect-remove'));
            }
            // Apply compact by default for idx >= 2
            if (idx >= 2 && !card.dataset.compactInit) {
                card.classList.add('compact');
                const tg = card.querySelector('.suspect-card-toggle');
                if (tg) tg.textContent = 'Déplier';
                card.dataset.compactInit = '1';
            }
            lspdUpdateSuspectSummary(card);
        });
    }

    function lspdUpdateSuspectSummary(card) {
        const summary = card.querySelector('.suspect-compact-summary');
        if (!summary) return;
        const fn = (card.querySelector('.suspect-firstname') || {}).value || '';
        const ln = (card.querySelector('.suspect-lastname') || {}).value || '';
        const role = (card.querySelector('.suspect-role .tag-btn.active') || {}).dataset
            ? card.querySelector('.suspect-role .tag-btn.active').dataset.tag : '';
        const name = `${fn} ${ln}`.trim() || 'Sans nom';
        summary.textContent = role ? `${name} · ${role}` : name;
    }

    function lspdRefreshAllCompactSuspects() {
        ['patrolSuspectCards', 'narcSuspectCards', 'cidSuspectCards'].forEach(id => {
            if ($(`#${id}`)) lspdApplyCompactSuspects(id);
        });
    }

    // P4-7 — Recap modal before generation (with live preview + manual edit)
    let lspdRecapState = { onConfirm: null, removed: new Set(), moduleKey: null, snapshot: null, manualEdit: false };

    function lspdCollectRecapSections(moduleKey) {
        const sections = [];
        if (moduleKey === 'patrol') {
            const tagGroups = state.patrol.tags || {};
            const labels = {
                suspect_state: 'État du suspect', impact_detail: 'Impact sur le suspect',
                agent_state: 'État des agents', suspect_obs: 'Observations',
                behavior: 'Comportement', aggressor: 'Agression',
                aggression_origin: 'Origine de l\'agression', suspect_flight: 'Fuite',
                pursuit_end: 'Fin de poursuite', force: 'Usage de la force',
                tests: 'Dépistages', search_person: 'Fouille (individu)',
                search_vehicle: 'Fouille (véhicule)', miranda: 'Miranda',
                medical_end: 'Fin / Médical'
            };
            Object.entries(tagGroups).forEach(([key, arr]) => {
                if (Array.isArray(arr) && arr.length) {
                    sections.push({ key: `patrol.tags.${key}`, label: labels[key] || key, tags: [...arr] });
                }
            });
            if (state.patrol.tenCodes && state.patrol.tenCodes.length) {
                // On garde la clé interne comme valeur (pour le retrait), mais on
                // affiche le libellé clair de l'intervention (jamais le code).
                sections.push({
                    key: 'patrol.tenCodes', label: 'Nature de l\'intervention',
                    tags: [...state.patrol.tenCodes],
                    display: state.patrol.tenCodes.map(c => DB.tenCodes[c] || c)
                });
            }
        } else if (moduleKey === 'narcotics') {
            const map = {
                drugs: 'Stupéfiants', packaging: 'Conditionnement', gang: 'Gang/Organisation',
                weapons: 'Armes', surveillanceMeans: 'Surveillance',
                observations: 'Observations', interventionTriggers: 'Déclencheurs',
                approachMethods: 'Approche', intelSources: 'Renseignement',
                operationResults: 'Résultats', roles: 'Rôles'
            };
            Object.entries(map).forEach(([key, label]) => {
                const arr = state.narcotics[key];
                if (Array.isArray(arr) && arr.length) {
                    sections.push({ key: `narcotics.${key}`, label, tags: [...arr] });
                }
            });
        } else if (moduleKey === 'cid') {
            const map = { crimeType: 'Type de crime', ballistics: 'Balistique',
                fingerprints: 'Empreintes', victims: 'Victimes', warrant: 'Mandats' };
            Object.entries(map).forEach(([key, label]) => {
                const arr = state.cid && state.cid[key];
                if (Array.isArray(arr) && arr.length) {
                    sections.push({ key: `cid.${key}`, label, tags: [...arr] });
                }
            });
        }
        return sections;
    }

    function lspdRemoveTagFromState(stateKey, tagValue) {
        // stateKey format: "module.path.to.array"
        const parts = stateKey.split('.');
        let obj = state;
        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
            if (!obj) return;
        }
        const arr = obj[parts[parts.length - 1]];
        if (!Array.isArray(arr)) return;
        const idx = arr.indexOf(tagValue);
        if (idx > -1) arr.splice(idx, 1);
        // Also unhighlight matching .tag-btn in DOM
        $$(`.tag-btn.active`).forEach(btn => {
            if (btn.dataset.tag === tagValue) {
                // Only unhighlight if its container belongs to the same module
                btn.classList.remove('active');
            }
        });
    }

    // Snapshot/restore the relevant state slice for live preview without
    // affecting the real UI until the user confirms.
    function lspdSnapshotForRecap(moduleKey) {
        if (moduleKey === 'patrol') {
            return {
                tags: JSON.parse(JSON.stringify(state.patrol.tags || {})),
                tenCodes: [...(state.patrol.tenCodes || [])],
                tenCode: state.patrol.tenCode
            };
        }
        if (moduleKey === 'narcotics') {
            const keys = ['drugs','packaging','gang','weapons','surveillanceMeans','observations','interventionTriggers','approachMethods','intelSources','operationResults','roles'];
            const snap = {};
            keys.forEach(k => { snap[k] = [...(state.narcotics[k] || [])]; });
            return snap;
        }
        if (moduleKey === 'cid') {
            const keys = ['crimeType','ballistics','fingerprints','victims','warrant'];
            const snap = {};
            keys.forEach(k => { snap[k] = [...((state.cid && state.cid[k]) || [])]; });
            return snap;
        }
        return null;
    }

    function lspdRestoreFromRecap(moduleKey, snap) {
        if (!snap) return;
        if (moduleKey === 'patrol') {
            state.patrol.tags = snap.tags;
            state.patrol.tenCodes = snap.tenCodes;
            state.patrol.tenCode = snap.tenCode;
        } else if (moduleKey === 'narcotics') {
            Object.entries(snap).forEach(([k, v]) => { state.narcotics[k] = v; });
        } else if (moduleKey === 'cid') {
            if (!state.cid) state.cid = {};
            Object.entries(snap).forEach(([k, v]) => { state.cid[k] = v; });
        }
    }

    // Apply pending removals into a fresh deep-clone and swap into state for
    // the duration of report generation, then restore.
    function lspdGeneratePreview(moduleKey, removed) {
        const snap = lspdSnapshotForRecap(moduleKey);
        // Apply removals destructively on state (will be restored)
        removed.forEach(item => {
            const sep = item.indexOf('|');
            if (sep < 0) return;
            const stateKey = item.slice(0, sep);
            const tagValue = item.slice(sep + 1);
            const parts = stateKey.split('.');
            let obj = state;
            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
                if (!obj) return;
            }
            const arr = obj[parts[parts.length - 1]];
            if (!Array.isArray(arr)) return;
            const idx = arr.indexOf(tagValue);
            if (idx > -1) arr.splice(idx, 1);
            // Keep tenCode in sync if we removed from tenCodes
            if (stateKey === 'patrol.tenCodes') {
                state.patrol.tenCode = state.patrol.tenCodes[0] || null;
            }
        });
        let report = '';
        try {
            if (moduleKey === 'patrol') report = generatePatrolReport() || '';
            else if (moduleKey === 'narcotics') report = generateNarcReport() || '';
            else if (moduleKey === 'cid') report = generateCIDReport() || '';
        } catch (err) {
            report = `[Erreur de génération de l'aperçu : ${err && err.message ? err.message : err}]`;
        } finally {
            lspdRestoreFromRecap(moduleKey, snap);
        }
        return report;
    }

    function lspdUpdateRecapPreview() {
        const pre = $('#recapPreview');
        const ta = $('#recapPreviewEdit');
        if (!pre || !ta) return;
        // If user has manually edited, do not overwrite
        if (lspdRecapState.manualEdit) return;
        const text = lspdGeneratePreview(lspdRecapState.moduleKey, lspdRecapState.removed);
        if (!text) {
            pre.innerHTML = `<span class="recap-preview-empty">Aucun aperçu disponible — vérifiez les pré-requis du module.</span>`;
            ta.value = '';
        } else {
            pre.textContent = text;
            ta.value = text;
        }
    }
    let _lspdPreviewDebounce = null;
    function lspdUpdateRecapPreviewDebounced() {
        if (_lspdPreviewDebounce) clearTimeout(_lspdPreviewDebounce);
        _lspdPreviewDebounce = setTimeout(() => { _lspdPreviewDebounce = null; lspdUpdateRecapPreview(); }, 80);
    }

    function lspdOpenRecap(moduleKey, totalTagCount, onConfirm) {
        const modal = $('#recapModal');
        const body = $('#recapBody');
        const title = $('#recapTitle');
        if (!modal || !body) { onConfirm(); return; }
        lspdRecapState = { onConfirm, removed: new Set(), moduleKey, snapshot: null, manualEdit: false };
        title.textContent = `Vérification — ${totalTagCount} tag(s) retenu(s)`;
        const sections = lspdCollectRecapSections(moduleKey);
        if (sections.length === 0) {
            body.innerHTML = `<div class="recap-empty">Aucun tag sélectionné. Vous pouvez générer un rapport vide ou annuler pour compléter.</div>`;
        } else {
            body.innerHTML = sections.map(sec => `
                <div class="recap-section">
                    <div class="recap-section-title">${escapeHtml(sec.label)}</div>
                    <div class="recap-tags">
                        ${sec.tags.map((t, i) => `<button type="button" class="recap-tag" data-state-key="${escapeHtml(sec.key)}" data-tag="${escapeHtml(t)}">${escapeHtml(sec.display ? sec.display[i] : t)}</button>`).join('')}
                    </div>
                </div>`).join('');
            body.querySelectorAll('.recap-tag').forEach(btn => {
                btn.addEventListener('click', () => {
                    const k = btn.dataset.stateKey + '|' + btn.dataset.tag;
                    if (lspdRecapState.removed.has(k)) {
                        lspdRecapState.removed.delete(k);
                        btn.classList.remove('removed');
                    } else {
                        lspdRecapState.removed.add(k);
                        btn.classList.add('removed');
                    }
                    lspdUpdateRecapPreviewDebounced();
                });
            });
        }
        // Reset edit toggle & textarea
        const editToggle = $('#recapEditToggle');
        const ta = $('#recapPreviewEdit');
        const pre = $('#recapPreview');
        if (editToggle) editToggle.checked = false;
        if (ta) { ta.style.display = 'none'; ta.classList.remove('dirty'); }
        if (pre) pre.style.display = '';
        lspdUpdateRecapPreview();
        modal.classList.add('active');
    }

    function lspdCloseRecap() {
        const modal = $('#recapModal');
        if (modal) modal.classList.remove('active');
        lspdRecapState = { onConfirm: null, removed: new Set(), moduleKey: null, snapshot: null, manualEdit: false };
    }

    function lspdInitRecapModal() {
        const modal = $('#recapModal');
        if (!modal) return;
        const close = () => lspdCloseRecap();
        $('#btnRecapClose').addEventListener('click', close);
        $('#btnRecapCancel').addEventListener('click', close);
        $('#btnRecapConfirm').addEventListener('click', () => {
            // Apply removals permanently
            lspdRecapState.removed.forEach(item => {
                const sep = item.indexOf('|');
                if (sep < 0) return;
                const stateKey = item.slice(0, sep);
                const tagValue = item.slice(sep + 1);
                lspdRemoveTagFromState(stateKey, tagValue);
                if (stateKey === 'patrol.tenCodes') {
                    state.patrol.tenCode = state.patrol.tenCodes[0] || null;
                }
            });
            // If user manually edited the preview, store it for the
            // generator to pick up instead of regenerating from state.
            const ta = $('#recapPreviewEdit');
            const editedText = (lspdRecapState.manualEdit && ta) ? ta.value : null;
            lspdPendingManualReport = editedText;
            const cb = lspdRecapState.onConfirm;
            lspdCloseRecap();
            if (cb) cb();
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

        // Edit toggle
        const editToggle = $('#recapEditToggle');
        const ta = $('#recapPreviewEdit');
        const pre = $('#recapPreview');
        if (editToggle && ta && pre) {
            editToggle.addEventListener('change', () => {
                if (editToggle.checked) {
                    ta.value = pre.textContent;
                    ta.style.display = '';
                    pre.style.display = 'none';
                    ta.focus();
                } else {
                    ta.style.display = 'none';
                    pre.style.display = '';
                    ta.classList.remove('dirty');
                    lspdRecapState.manualEdit = false;
                    lspdUpdateRecapPreview();
                }
            });
            ta.addEventListener('input', () => {
                lspdRecapState.manualEdit = true;
                ta.classList.add('dirty');
            });
        }
    }

    // Manual override consumed by the generator wrapper just after recap confirm
    let lspdPendingManualReport = null;

    function lspdCountTags(moduleKey) {
        return lspdCollectRecapSections(moduleKey).reduce((sum, s) => sum + s.tags.length, 0);
    }

    // Wrap a generate button : intercept first click, show recap, then re-dispatch
    function lspdWrapGenerateButton(btnId, moduleKey) {
        const btn = $(`#${btnId}`);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            if (btn.dataset.recapConfirmed === '1') {
                btn.dataset.recapConfirmed = '';
                return; // let original handler run
            }
            e.preventDefault();
            e.stopImmediatePropagation();
            // Porte de complétude : un rapport incomplet n'atteint même pas
            // le récap. validateReport() affiche les relances et refuse.
            if (moduleKey === 'patrol' && !validateReport('patrol')) return;
            const count = lspdCountTags(moduleKey);
            lspdOpenRecap(moduleKey, count, () => {
                btn.dataset.recapConfirmed = '1';
                btn.click();
            });
        }, true); // capture phase — fires before the original handler
    }

    function lspdInitRecapInterceptors() {
        lspdWrapGenerateButton('btnGeneratePatrol', 'patrol');
        lspdWrapGenerateButton('btnGenerateNarc', 'narcotics');
        lspdWrapGenerateButton('btnGenerateCID', 'cid');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCÉNARIOS RAPIDES — PATROL MODULE
    // ═══════════════════════════════════════════════════════════════════

    const PATROL_SCENARIOS = [
        {
            id: 'controle_routier',
            label: 'Contrôle Routier',
            icon: '⬡',
            desc: 'Contrôle routier',
            status: 'Code 4',
            tenCodes: ['10-38'],
            ops: [],
            tags: {
                force: ['Injonctions verbales effectuées'],
                miranda: ['Droits Miranda lus et compris'],
                medical_end: ['Déclaré apte à l\'incarcération']
            }
        },
        {
            id: 'poursuite',
            label: 'Poursuite',
            icon: '🚨',
            desc: 'Refus + poursuite',
            status: 'Code 3',
            tenCodes: ['10-38', '10-56', '10-55'],
            ops: ['opsModule1'],
            tags: {
                force: ['Injonctions verbales effectuées'],
                suspect_flight: ['Le suspect a pris la fuite en véhicule'],
                agent_state: ['Aucun agent blessé']
            }
        },
        {
            id: 'stups',
            label: 'Stupéfiants',
            icon: '⚗',
            desc: 'Vente de stups',
            status: 'Code 6',
            tenCodes: ['10-60'],
            ops: ['opsModule5'],
            tags: {
                force: ['Injonctions verbales effectuées'],
                search_person: ['Fouille incidente à l\'arrestation'],
                miranda: ['Droits Miranda lus et compris'],
                medical_end: ['Déclaré apte à l\'incarcération']
            }
        },
        {
            id: 'braquage_banque',
            label: 'Braquage Banque',
            icon: '⌂',
            desc: 'Braquage de banque',
            status: 'Code 3',
            tenCodes: ['10-61', '10-35'],
            ops: ['opsModule4'],
            tags: {
                aggressor: ['Le suspect a ouvert le feu sur les agents'],
                force: ['Injonctions verbales effectuées'],
                agent_state: ['Aucun agent blessé']
            }
        },
        {
            id: 'fusillade',
            label: 'Fusillade',
            icon: '⌖',
            desc: 'Fusillade active',
            status: 'Code 3',
            tenCodes: ['10-31', '10-32'],
            ops: ['opsModule3'],
            tags: {
                aggressor: ['Le suspect a ouvert le feu sur les agents'],
                force: ['Injonctions verbales effectuées'],
                agent_state: ['Aucun agent blessé']
            }
        },
        {
            id: 'accident',
            label: 'Accident',
            icon: '⊗',
            desc: 'Accident de la route',
            status: 'Code 4',
            tenCodes: ['10-50'],
            ops: ['opsModule2'],
            tags: {
                force: ['Injonctions verbales effectuées'],
                medical_end: ['Soins EMS sur place']
            }
        },
        {
            id: 'violence_dom',
            label: 'Violence Dom.',
            icon: '⌂',
            desc: 'Violences domestiques',
            status: 'Code 4',
            tenCodes: ['10-35'],
            ops: ['opsModule6'],
            tags: {
                force: ['Injonctions verbales effectuées'],
                miranda: ['Droits Miranda lus et compris']
            }
        },
        {
            id: 'braquage_sup',
            label: 'Braquage Supérette',
            icon: '⊕',
            desc: 'Braquage de supérette',
            status: 'Code 3',
            tenCodes: ['10-40'],
            ops: ['opsModule4'],
            tags: {
                aggressor: ['Le suspect a ouvert le feu sur les agents'],
                force: ['Injonctions verbales effectuées'],
                agent_state: ['Aucun agent blessé']
            }
        }
    ];

    function buildScenarioPanel() {
        const patrol = document.getElementById('mod-patrol');
        if (!patrol || document.getElementById('scenarioPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'scenarioPanel';
        panel.className = 'scenario-panel';
        panel.innerHTML = `
            <div class="scenario-panel-header">
                <span class="scenario-panel-title">⚡ Démarrage Rapide</span>
                <span class="scenario-panel-hint">Cliquez un scénario — le formulaire se pré-remplit automatiquement</span>
            </div>
            <div class="scenario-grid" id="scenarioGrid"></div>
        `;

        const grid = panel.querySelector('#scenarioGrid');
        PATROL_SCENARIOS.forEach(s => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'scenario-btn';
            btn.dataset.scenarioId = s.id;
            btn.innerHTML = `
                <span class="scenario-icon">${s.icon}</span>
                <span class="scenario-label">${escapeHtml(s.label)}</span>
                <span class="scenario-code">${escapeHtml(s.desc)}</span>
            `;
            btn.addEventListener('click', () => applyScenario(s));
            grid.appendChild(btn);
        });

        const header = patrol.querySelector('.module-header');
        if (header) header.insertAdjacentElement('afterend', panel);
        else patrol.insertBefore(panel, patrol.firstChild);

        // Add "Nouveau Rapport" button to header (keeps agents + unit)
        const headerActions = patrol.querySelector('.header-actions');
        if (headerActions && !document.getElementById('btnNouveauRapport')) {
            const newBtn = document.createElement('button');
            newBtn.id = 'btnNouveauRapport';
            newBtn.className = 'btn btn-outline';
            newBtn.textContent = 'Nouveau';
            newBtn.title = 'Réinitialise le formulaire en conservant les agents et l\'unité';
            newBtn.addEventListener('click', smartResetPatrol);
            headerActions.insertBefore(newBtn, headerActions.firstChild);
        }
    }

    function applyScenario(s) {
        // 1. Deselect all active 10-codes and status
        $$('#tenCodeSelector .tag-btn.active').forEach(b => b.click());
        $$('#statusSelector .tag-btn.active').forEach(b => b.click());

        // 2. Select status
        const statusBtn = document.querySelector(`#statusSelector .tag-btn[data-tag="${s.status}"]`);
        if (statusBtn) statusBtn.click();

        // 3. Select 10-codes in order (each click triggers syncOpsModules)
        s.tenCodes.forEach(code => {
            const btn = document.querySelector(`#tenCodeSelector .tag-btn[data-tag="${code}"]`);
            if (btn && !btn.classList.contains('active')) btn.click();
        });

        // 4. Auto-fill datetime
        setDatetimeNow('patrolDatetime');

        // 5. After syncOpsModules ran: open ops modules + select narrative tags
        requestAnimationFrame(() => {
            s.ops.forEach(opsId => {
                const toggle = document.querySelector(`#${opsId} .ops-module-toggle`);
                if (toggle && !toggle.checked) toggle.click();
            });

            requestAnimationFrame(() => {
                Object.entries(s.tags).forEach(([cat, tagList]) => {
                    tagList.forEach(tagVal => {
                        const btn = document.querySelector(`.tag-builder .tag-group[data-category="${cat}"] .tag-btn[data-tag="${tagVal}"]`);
                        if (btn && !btn.classList.contains('active')) btn.click();
                    });
                });

                // Mark active scenario
                $$('.scenario-btn').forEach(b => b.classList.toggle('scenario-active', b.dataset.scenarioId === s.id));

                // Expand + scroll to suspect section
                const suspectSection = document.querySelector('#mod-patrol .form-section[data-step="2"]');
                if (suspectSection) {
                    suspectSection.classList.remove('fs-collapsed');
                    setTimeout(() => suspectSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                }

                showToast(`✓ "${s.label}" appliqué — Remplissez le suspect puis générez.`);
            });
        });
    }

    function smartResetPatrol() {
        const savedAgents = [...state.selectedAgents.patrol];
        const savedUnit = state.patrol.unit;

        const resetBtn = document.getElementById('btnPatrolReset');
        if (resetBtn) resetBtn.click();

        setTimeout(() => {
            state.selectedAgents.patrol = savedAgents;
            if (savedUnit) {
                const unitBtn = document.querySelector(`#unitSelector .tag-btn[data-tag="${savedUnit}"]`);
                if (unitBtn && !unitBtn.classList.contains('active')) unitBtn.click();
            }
            setDatetimeNow('patrolDatetime');
            refreshAllRosterSelectors();
            $$('.scenario-btn').forEach(b => b.classList.remove('scenario-active'));
            document.getElementById('mod-patrol').scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast('Nouveau rapport prêt — Agents et unité conservés.');
        }, 120);
    }

    function initFloatingGenBtn() {
        if (document.getElementById('floatingGenBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'floatingGenBtn';
        btn.className = 'btn btn-gold floating-gen-btn';
        btn.innerHTML = '★ GÉNÉRER';
        btn.title = 'Générer le rapport (Ctrl+Entrée)';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            const active = document.querySelector('#mainContent > section.module.active');
            if (!active) return;
            const map = {
                'mod-patrol': 'btnGeneratePatrol',
                'mod-narcotics': 'btnGenerateNarc',
                'mod-crimes': 'btnGenerateCID',
                'mod-interrogation': 'btnGenerateInterro'
            };
            const target = document.getElementById(map[active.id]);
            if (target) target.click();
        });

        function updateVisibility() {
            const active = document.querySelector('#mainContent > section.module.active');
            const reportMods = ['mod-patrol', 'mod-narcotics', 'mod-crimes', 'mod-interrogation'];
            btn.classList.toggle('floating-gen-visible', !!(active && reportMods.includes(active.id)));
        }

        document.addEventListener('click', e => {
            if (e.target.closest('.nav-link[data-module]')) setTimeout(updateVisibility, 150);
        });
        updateVisibility();
    }

    function initKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                const active = document.querySelector('#mainContent > section.module.active');
                if (!active) return;
                const map = {
                    'mod-patrol': 'btnGeneratePatrol',
                    'mod-narcotics': 'btnGenerateNarc',
                    'mod-crimes': 'btnGenerateCID',
                    'mod-interrogation': 'btnGenerateInterro'
                };
                const btn = document.getElementById(map[active.id]);
                if (btn) btn.click();
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════
    // RAPPORT RAPIDE — MOTEUR À BLOCS (mode standard ultra-simplifié)
    // L'agent coche des blocs de procédure pré-rédigés, remplit quelques
    // champs minimaux, et obtient un rapport prêt à copier. L'IA greffier
    // reste disponible en complément pour les cas hors blocs standards.
    // ═══════════════════════════════════════════════════════════════════

    // Sujet grammatical construit à partir des officiers sélectionnés.
    // Renvoyé CAPITALISÉ (début de phrase). En milieu de phrase, passer
    // par rfLowerFirst() : « tandis que l'officier… », « par les officiers… ».
    function officerSubject(names) {
        const list = (names || []).map(n => String(n).trim()).filter(Boolean);
        if (list.length === 0) return "L'officier soussigné";
        if (list.length === 1) return `L'officier ${list[0]}`;
        return `Les officiers ${lspdJoinFr(list)}`;
    }

    // Minuscule sur la seule 1re lettre (sujet en milieu de phrase).
    function rfLowerFirst(str) {
        return str ? str.charAt(0).toLowerCase() + str.slice(1) : str;
    }

    // Élision de « de » devant voyelle : de + Alfonso → d'Alfonso.
    function deElide(next) {
        const w = String(next || '').trim();
        if (!w) return '';
        return /^[aeiouyàâäéèêëîïôöûüh]/i.test(w[0]) ? `d'${w}` : `de ${w}`;
    }

    // Les agents saisissent un groupe nominal nu (« plaie par balle au bras
    // droit ») aussi bien qu'un groupe déjà déterminé (« des blessures au
    // bras »). On ne préfixe un article que s'il en manque un.
    const HAS_DETERMINER = /^(un|une|des|du|de|d'|le|la|les|l'|plusieurs|deux|trois|quatre|cinq|son|sa|ses|multiples)\b/i;

    function withArticle(text) {
        const t = String(text || '').trim();
        if (!t) return '';
        return HAS_DETERMINER.test(t) ? t : `une ${t}`;
    }

    // « poste de Mission Row » → « le poste de Mission Row », mais
    // « Mission Row » reste tel quel : une initiale majuscule signale un nom
    // propre, qui ne prend pas d'article.
    function destinationPhrase(dest) {
        const d = String(dest || '').trim();
        if (!d) return '';
        if (HAS_DETERMINER.test(d) || /^(au|aux|à)\b/i.test(d)) return d;
        return /^[A-ZÀ-Þ]/.test(d) ? d : `le ${d}`;
    }

    // Bibliothèque de blocs. Chaque bloc : { id, label, hint, fields, render }.
    // render(d, ctx) → paragraphe (string). d = valeurs des champs du bloc ;
    // ctx = { subject, subjectLower, plural, location, suspectName }.
    // L'ordre du tableau = ordre chronologique dans le corps du rapport.
    const RAPPORT_BLOCKS = [
        {
            id: 'intervention',
            label: 'Intervention initiale',
            hint: "Prise en charge de l'appel et arrivée sur les lieux",
            fields: [
                { key: 'motif', type: 'text', label: "Motif de l'intervention", placeholder: "Ex : refus d'obtempérer, différend, contrôle routier…" }
            ],
            // Phrase d'ouverture OBLIGATOIRE (partagée avec patrol/GND/CID).
            render: (d, ctx) => lspdBuildIntro(ctx.date, ctx.time, ctx.agents, d.motif || 'une intervention')
        },
        {
            id: 'poursuite',
            label: 'Course-poursuite',
            hint: 'Poursuite véhicule ou à pied, manœuvre et issue',
            fields: [
                { key: 'type', type: 'select', label: 'Type de poursuite', options: ['en véhicule', 'à pied'] },
                { key: 'manoeuvre', type: 'text', label: "Manœuvre d'interception (optionnel)", placeholder: 'Ex : PIT, herse, immobilisation' },
                { key: 'issue', type: 'select', label: 'Issue', options: ['suspect interpellé', 'suspect en fuite', 'accident survenu'] }
            ],
            render: (d, ctx) => {
                const type = d.type === 'à pied' ? 'à pied' : 'en véhicule';
                const verb = ctx.plural ? 'se sont lancés' : "s'est lancé";
                let s = `${ctx.subject} ${verb} à la poursuite du suspect ${type}`;
                if (d.manoeuvre) s += `, en recourant à la technique dite « ${d.manoeuvre} »`;
                s += '.';
                if (d.issue === 'suspect en fuite') s += ' Le suspect est toutefois parvenu à prendre la fuite.';
                else if (d.issue === 'accident survenu') s += " La poursuite a pris fin à la suite d'un accident.";
                else s += " La poursuite s'est soldée par l'interpellation du suspect.";
                return s;
            }
        },
        {
            id: 'accident',
            label: 'Accident de la circulation',
            hint: 'Collision constatée, bilan et responsabilité',
            fields: [
                { key: 'collision', type: 'select', label: 'Type de collision', options: [
                    'collision simple',
                    'carambolage',
                    'véhicule vs piéton',
                    'sortie de route'
                ] },
                { key: 'bilan', type: 'text', label: 'Dégâts / bilan (optionnel)', placeholder: 'Ex : dégâts matériels légers, aucun blessé' },
                { key: 'responsabilite', type: 'select', label: 'Responsabilité', options: [
                    'établie sur place',
                    'à déterminer',
                    'non applicable'
                ] }
            ],
            render: (d, ctx) => {
                const collMap = {
                    'collision simple': 'une collision entre deux véhicules',
                    'carambolage': 'un carambolage impliquant plusieurs véhicules',
                    'véhicule vs piéton': 'une collision entre un véhicule et un piéton',
                    'sortie de route': 'une sortie de route'
                };
                const coll = collMap[d.collision] || collMap['collision simple'];
                const verb = ctx.plural ? 'ont pris en charge' : 'a pris en charge';
                let s = `${ctx.subject} ${verb} un accident de la circulation, en l'occurrence ${coll}.`;
                if (d.bilan) s += ` Le bilan fait état ${deElide(d.bilan)}.`;
                const resp = d.responsabilite || 'à déterminer';
                if (resp === 'établie sur place') s += ' La responsabilité a été établie sur place.';
                else if (resp === 'à déterminer') s += ' La responsabilité reste à déterminer.';
                return s;
            }
        },
        {
            id: 'securisation_secours',
            label: 'Sécurisation & premiers secours',
            hint: 'Périmètre sécurisé, prise en charge médicale immédiate',
            fields: [
                { key: 'etat', type: 'text', label: "État de l'individu (optionnel)", placeholder: "Ex : conscient, blessé au bras, en état d'ébriété…" },
                { key: 'patrol2', type: 'text', label: 'Patrouille secondaire — grades + noms (optionnel)', placeholder: 'Ex : du Police Officer II Nolan Prescott et du Police Officer II Donovan Lyncher' },
                { key: 'action2', type: 'text', label: 'Action de la patrouille secondaire', placeholder: 'Ex : sécurisé le périmètre en bloquant la circulation environnante' }
            ],
            render: (d, ctx) => {
                let s = 'Le périmètre a été sécurisé';
                if (d.etat) s += `, l'individu étant ${d.etat}`;
                s += `. Les premiers gestes de secours ont été prodigués par ${ctx.subjectLower} dans l'attente des services médicaux.`;
                if (d.patrol2 && d.action2) s += ` Simultanément, la patrouille composée ${d.patrol2} a ${d.action2}.`;
                return s;
            }
        },
        {
            id: 'renfort',
            label: "Renfort d'une autre unité",
            hint: 'Appui Metro, K9, ASD, etc.',
            fields: [
                { key: 'unite', type: 'text', label: 'Unité de renfort', placeholder: 'Ex : K9, Metro, Air Support Division' },
                { key: 'role', type: 'text', label: 'Rôle du renfort', placeholder: 'Ex : une recherche au sol, une surveillance aérienne, un appui tactique' }
            ],
            render: (d) => {
                const unite = d.unite || 'spécialisée';
                let s = `Un renfort de l'unité ${unite} est intervenu en appui`;
                if (d.role) s += `, chargé d'assurer ${d.role}`;
                s += '.';
                return s;
            }
        },
        {
            id: 'usage_force',
            label: 'Usage de la force',
            hint: 'Niveau de force employé et justification',
            fields: [
                { key: 'type', type: 'select', label: 'Type de force', options: [
                    'verbale/contrainte physique légère',
                    'taser',
                    'arme à impact (bâton/matraque)',
                    'arme à feu'
                ] },
                { key: 'justification', type: 'text', label: 'Justification', placeholder: "Ex : la résistance active du suspect à l'interpellation" }
            ],
            render: (d, ctx) => {
                const map = {
                    'verbale/contrainte physique légère': () => 'de la contrainte physique',
                    'taser': () => "d'un pistolet à impulsion électrique (taser)",
                    'arme à impact (bâton/matraque)': () => "d'un bâton de défense",
                    'arme à feu': () => ctx.plural ? 'de leur arme de service' : 'de son arme de service'
                };
                const moyen = (map[d.type] || map['verbale/contrainte physique légère'])();
                const verb = ctx.plural ? 'ont fait usage' : 'a fait usage';
                const justif = d.justification || complianceGet('standard', 'justificationForce');
                let s = `Afin de maîtriser le suspect, ${ctx.subjectLower} ${verb} ${moyen}.`;
                if (justif) s += ` Cet usage a été rendu nécessaire par ${justif}.`;
                const sommation = complianceGet('standard', 'sommation');
                if (sommation.indexOf('Oui') === 0) {
                    s += ' Un avertissement clair avait été adressé au préalable.';
                } else if (sommation.indexOf('circonstances') !== -1) {
                    s += " Les circonstances n'ont pas permis d'adresser un avertissement préalable.";
                }
                return s;
            }
        },
        {
            id: 'fouille',
            label: 'Palpation / fouille & saisie',
            hint: 'Objets saisis — le régime se choisit dans « Chronologie & conformité »',
            fields: [
                { key: 'objets', type: 'text', label: 'Objet(s) saisi(s) (optionnel)', placeholder: 'Ex : une arme de poing, 3 sachets de stupéfiants…' },
                { key: 'arme', type: 'text', label: 'Arme saisie — modèle (optionnel)', placeholder: 'Ex : Glock 17' },
                { key: 'armeId', type: 'text', label: 'Arme saisie — identifiant / n° de série (optionnel)', placeholder: 'Ex : 1783196078854' }
            ],
            // Le régime (palpation de sécurité ou fouille) et son motif sont
            // saisis dans la section conformité : les deux relèvent de chapitres
            // distincts du Titre IV et ne se rédigent pas de la même façon.
            render: (d) => {
                const objets = [];
                if (d.objets) objets.push(d.objets);
                if (d.arme) objets.push(`une arme de type ${d.arme}${d.armeId ? ` (identifiant : ${d.armeId})` : ''}`);

                const lignes = controleLines('standard', "l'individu", objets, false);
                if (lignes.length) return lignes.join(' ');

                // Aucun régime renseigné : on s'en tient aux éléments saisis.
                if (!objets.length) return '';
                return `La saisie ${deElide(lspdJoinFr(objets.map(o => o.toLowerCase())))} a été opérée sur l'individu.`;
            }
        },
        {
            id: 'gsr',
            label: 'Test de résidus de poudre (GSR)',
            hint: "Dépistage de résidus de tir sur l'individu",
            fields: [
                { key: 'resultat', type: 'select', label: 'Résultat', options: ['positif', 'négatif', 'non effectué'] }
            ],
            render: (d) => {
                const r = d.resultat || 'négatif';
                if (r === 'non effectué') return "Aucun test de résidus de poudre n'a pu être réalisé sur l'individu.";
                return `Un test de détection de résidus de poudre (GSR) a été réalisé sur l'individu ; le résultat s'est révélé ${r}.`;
            }
        },
        {
            id: 'miranda',
            label: 'Notification des droits (Miranda)',
            hint: 'Lecture des droits, sur place ou différée',
            fields: [
                { key: 'moment', type: 'select', label: 'Moment de la notification', options: [
                    "au moment de l'interpellation",
                    'de manière différée, au poste',
                    'après prise en charge médicale (individu initialement inconscient)'
                ] }
            ],
            render: (d) => {
                const m = d.moment || "au moment de l'interpellation";
                const heure = complianceGet('standard', 'heureDroits');
                const quand = heure ? `à ${fmtH(heure)}` : m;
                if (m.indexOf('inconscient') !== -1) {
                    return "L'individu étant inconscient, ses avertissements Miranda n'ont pas pu lui être notifiés, celui-ci n'étant pas en mesure de les comprendre dans cet état. Ils lui ont été lus "
                        + (heure ? `et compris ${quand}, ` : 'et compris ')
                        + 'une fois pris en charge et jugé apte par le personnel médical.';
                }
                const reaction = complianceGet('standard', 'reactionDroits');
                const suite = reaction
                    ? reaction.charAt(0).toLowerCase() + reaction.slice(1)
                    : 'a déclaré les avoir compris';
                return `Ses droits lui ont été notifiés ${quand}. L'individu ${suite}.`;
            }
        },
        {
            id: 'avocat',
            label: 'Avocat contacté',
            hint: "L'individu réclame l'assistance d'un conseil",
            fields: [],
            render: () => "L'individu a fait valoir son droit à l'assistance d'un avocat ; son conseil a été contacté."
        },
        {
            id: 'transport',
            label: 'Transport hôpital',
            hint: "Évacuation médicale de l'individu",
            fields: [
                { key: 'motif', type: 'text', label: 'Motif (optionnel)', placeholder: 'Ex : une plaie à la tête, un malaise…' }
            ],
            // Reprend la forme de l'exemple de référence : nature de la
            // blessure, établissement et heures d'évacuation puis de sortie.
            render: (d) => {
                const nature = complianceGet('standard', 'natureBlessure') || d.motif;
                const etab = complianceGet('standard', 'etablissement');
                const hEvac = complianceGet('standard', 'heureEvacuation');
                const hSortie = complianceGet('standard', 'heureSortieMedicale');

                let s = nature ? `Présentant ${withArticle(nature)}, l'individu` : "L'individu";
                s += ' a été pris en charge par les services du LSFD et évacué vers ';
                s += etab ? `le ${etab}` : 'le centre hospitalier';
                s += hEvac ? ` à ${fmtH(hEvac)}.` : ' afin d\'y recevoir des soins.';
                if (hSortie) {
                    s += ` Sa sortie a été prononcée à ${fmtH(hSortie)},`
                        + ' après autorisation expresse du corps médical de l\'établissement.';
                }
                return s;
            }
        },
        {
            id: 'interpellation_differee',
            label: 'Interpellation différée (autre patrouille)',
            hint: "L'arrestation est réalisée par une autre unité",
            fields: [
                { key: 'unite', type: 'text', label: 'Unité / officiers ayant procédé', placeholder: "Ex : l'unité Adam-12, officiers Cole et Vasquez" }
            ],
            render: (d, ctx) => {
                const u = d.unite || 'une autre patrouille';
                return `L'interpellation de l'individu a été réalisée de manière différée par ${u}, ${ctx.subjectLower} ayant transmis l'ensemble des éléments de la procédure.`;
            }
        },
        {
            id: 'pv',
            label: 'Verbalisation (PV simple)',
            hint: 'Procès-verbal dressé sans placement en cellule',
            fields: [
                { key: 'motif', type: 'text', label: 'Motif du procès-verbal', placeholder: 'Ex : excès de vitesse, stationnement gênant…' },
                { key: 'montant', type: 'text', label: 'Montant (optionnel)', placeholder: 'Ex : 250$' }
            ],
            render: (d) => {
                const motif = d.motif || "l'infraction constatée";
                return `Un procès-verbal a été dressé à l'encontre de l'individu pour ${motif}${d.montant ? `, assorti d'une amende de ${d.montant}` : ''}.`;
            }
        },
        {
            id: 'cloture',
            label: 'Placement en cellule',
            hint: 'Conduite au poste et mise en cellule',
            fields: [],
            render: () => "L'individu a été conduit au poste et placé en cellule dans l'attente de sa présentation au magistrat."
        }
    ];

    // État du mode : par bloc { active, fields } + drapeau d'édition manuelle.
    const rfState = { blocks: {}, dirty: false };
    RAPPORT_BLOCKS.forEach(b => { rfState.blocks[b.id] = { active: false, fields: {} }; });

    // Noms des officiers sélectionnés (roster) pour le mode standard.
    function rfOfficerNames() {
        return (state.selectedAgents.standard || [])
            .filter(i => i < state.roster.length)
            .map(i => state.roster[i].name)
            .filter(Boolean);
    }

    function rfSuspectName() {
        const last = ($('#rfSuspectLast') && $('#rfSuspectLast').value.trim()) || '';
        const first = ($('#rfSuspectFirst') && $('#rfSuspectFirst').value.trim()) || '';
        return `${lspdTitleCase(first)} ${lspdTitleCase(last)}`.trim();
    }

    function rfContext() {
        const agents = lspdSelectedRoster('standard');
        // Corps du récit : « L'officier {NOM} » (nom de famille seul) une fois les
        // agents introduits par la phrase d'ouverture (grade + nom complet).
        const subject = officerSubject(agents.map(a => lspdOfficerSurname(a.name)));
        const dtRaw = ($('#rfDatetime') && $('#rfDatetime').value) || '';
        const dtObj = dtRaw ? new Date(dtRaw) : new Date();
        return {
            agents,
            subject,
            subjectLower: rfLowerFirst(subject),
            plural: agents.length >= 2,
            location: ($('#rfLocation') && $('#rfLocation').value.trim()) || '',
            suspectName: rfSuspectName(),
            date: lspdFormatDate(dtObj),
            time: lspdFormatTime(dtObj)
        };
    }

    // Assemble le rapport : bloc « Informations » + « Corps du rapport ».
    // Section « Charges retenues » — assemblée à part (pas un bloc RAPPORT_BLOCKS),
    // uniquement si au moins une infraction est cochée dans le calculateur pénal
    // partagé. Réutilise les mêmes fonctions que patrol/narcotics.
    function rfChargesSection() {
        if (!$('#standardPenalInfractions')) return '';
        const { all } = lspdCollectInfractions('standardPenalInfractions', 1);
        if (!all.length) return '';
        const total = lspdTotalFine(all).toLocaleString('fr-FR');
        return `\n\nCharges retenues :\n${lspdFormatInfractionsList(all)}\n\nAmende totale : ${total}$`;
    }

    function rfBuildReport() {
        const ctx = rfContext();
        const arrestTime = ($('#rfArrestTime') && $('#rfArrestTime').value.trim()) || 'NEANT';
        const prosecutor = ($('#rfProsecutor') && $('#rfProsecutor').value.trim()) || 'NEANT';
        // En-tête commun (format unifié partagé avec patrol/GND/CID).
        const header = lspdBuildReportHeader({
            date: ctx.date, time: ctx.time, location: ctx.location, arrestTime, prosecutor,
            sanction: complianceGet('standard', 'sanction'),
            reglementSanction: complianceGet('standard', 'reglementSanction')
        });

        const paras = [];
        RAPPORT_BLOCKS.forEach(block => {
            const st = rfState.blocks[block.id];
            if (!st || !st.active) return;
            const txt = block.render(st.fields || {}, ctx);
            if (txt && txt.trim()) paras.push(txt.trim());
        });
        const body = paras.length
            ? paras.join('\n\n')
            : '(Cochez des blocs de procédure pour composer le corps du rapport.)';

        const trailer = RULES ? complianceTrailer(buildCtx('standard')) : '';
        return sanitizeRadioCodes(header + body + trailer + rfChargesSection());
    }

    // Rebâtit l'aperçu, sauf si l'utilisateur l'a édité manuellement (dirty).
    function rfUpdatePreview() {
        // Activer un bloc change les éléments exigés par la checklist :
        // la conformité doit suivre immédiatement, sans attendre la
        // temporisation du listener global.
        if (typeof refreshCompliance === 'function') refreshCompliance('standard');
        const ta = $('#rf-preview');
        if (!ta) return;
        if (rfState.dirty) return;
        ta.value = rfBuildReport();
    }

    function rfSetDirty(on) {
        rfState.dirty = !!on;
        const note = $('#rfDirtyNote');
        if (note) note.hidden = !on;
    }

    // Construit les cartes de blocs (toggle + champs minimaux repliés).
    function rfRenderBlocks() {
        const wrap = $('#rfBlocks');
        if (!wrap) return;
        wrap.innerHTML = '';
        RAPPORT_BLOCKS.forEach(block => {
            const st = rfState.blocks[block.id];
            const card = document.createElement('div');
            card.className = 'rf-block' + (st.active ? ' active' : '');
            card.dataset.block = block.id;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'rf-block-toggle';
            toggle.setAttribute('aria-pressed', st.active ? 'true' : 'false');
            toggle.innerHTML =
                '<span class="rf-block-check" aria-hidden="true"></span>' +
                `<span class="rf-block-label">${escapeHtml(block.label)}</span>` +
                `<span class="rf-block-hint">${escapeHtml(block.hint || '')}</span>`;
            toggle.addEventListener('click', () => {
                st.active = !st.active;
                card.classList.toggle('active', st.active);
                toggle.setAttribute('aria-pressed', st.active ? 'true' : 'false');
                rfUpdatePreview();
            });
            card.appendChild(toggle);

            if (block.fields.length) {
                const body = document.createElement('div');
                body.className = 'rf-block-fields';
                block.fields.forEach(f => {
                    const field = document.createElement('div');
                    field.className = 'rf-field';
                    const lab = document.createElement('label');
                    lab.textContent = f.label;
                    field.appendChild(lab);

                    let input;
                    if (f.type === 'select') {
                        input = document.createElement('select');
                        (f.options || []).forEach(opt => {
                            const o = document.createElement('option');
                            o.value = opt;
                            o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                            input.appendChild(o);
                        });
                        st.fields[f.key] = (f.options && f.options[0]) || '';
                    } else {
                        input = document.createElement('input');
                        input.type = 'text';
                        input.placeholder = f.placeholder || '';
                    }
                    input.className = 'rf-input';
                    const sync = () => { st.fields[f.key] = input.value; rfUpdatePreview(); };
                    input.addEventListener('input', sync);
                    input.addEventListener('change', sync);
                    field.appendChild(input);
                    body.appendChild(field);
                });
                card.appendChild(body);
            }
            wrap.appendChild(card);
        });
    }

    // Complément IA : un champ libre → le greffier rédige le(s) paragraphe(s),
    // insérés en fin de corps et éditables avant copie (réutilise le Worker).
    async function rfAiComplete() {
        const btn = $('#rfAiBtn');
        const input = $('#rfAiInput');
        const desc = (input && input.value.trim()) || '';
        if (!desc) { showToast('Décrivez les faits à rédiger (3-4 lignes).', 'error'); return; }
        const apiKey = loadApiKey();
        const workerUrl = loadWorkerUrl();
        if (!apiKey || !workerUrl) {
            showToast("Configurez la clé API et l'URL du Worker via ⚙ Claude AI.", 'error');
            openSettingsModal();
            return;
        }
        const old = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Rédaction en cours…'; }
        const sys = "Tu es un greffier de police LSPD. À partir des notes brutes de l'officier, rédige UN OU DEUX paragraphes de rapport de police en français, style factuel, chronologique et sobre, à la 3e personne. Aucune salutation, aucune liste, aucun titre, aucun code radio (ni 10-XX ni Code X) : uniquement le ou les paragraphes prêts à insérer dans un rapport existant.";
        try {
            const res = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                    model: loadModelPref(),
                    max_tokens: 1024,
                    system: sys,
                    messages: [{ role: 'user', content: desc }]
                })
            });
            if (!res.ok) {
                let m = `Erreur API ${res.status}`;
                try { const e = await res.json(); m = (e.error && e.error.message) || m; } catch (_) { /* ignore */ }
                throw new Error(m);
            }
            const data = await res.json();
            const txt = data.content && data.content[0] && data.content[0].text;
            if (!txt) throw new Error('Réponse vide reçue.');
            const clean = sanitizeRadioCodes(txt.trim());
            const ta = $('#rf-preview');
            if (ta) {
                if (!ta.value.trim()) ta.value = rfBuildReport();
                ta.value = ta.value.replace(/\s*$/, '') + '\n\n' + clean;
                rfSetDirty(true);
            }
            if (input) input.value = '';
            showToast('Paragraphe IA inséré — éditable avant copie.');
        } catch (err) {
            showToast('Erreur IA : ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = old; }
        }
    }

    function rfReset() {
        RAPPORT_BLOCKS.forEach(b => { rfState.blocks[b.id] = { active: false, fields: {} }; });
        rfSetDirty(false);
        ['rfLocation', 'rfArrestTime', 'rfProsecutor', 'rfSuspectLast', 'rfSuspectFirst',
            'rfSuspectDob', 'rfAiInput'].forEach(id => {
            const el = $('#' + id); if (el) el.value = '';
        });
        complianceValues.standard = {};
        complianceShape.standard = null;
        validatedCtx.standard = null;
        state.selectedAgents.standard = [];
        if ($('#standardPenalInfractions')) {
            $$('#standardPenalInfractions input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                const row = cb.closest('.penal-row'); if (row) row.classList.remove('checked');
            });
            updateInlinePenalTotals('standardPenalInfractions', 'standardPenalFine', 'standardPenalPrison', 'standardPenalCharges');
        }
        rfRenderBlocks();
        buildRosterSelector('rfRoster', 'standard');
        setDatetimeNow('rfDatetime');
        rfUpdatePreview();
        showToast('Rapport rapide réinitialisé.');
    }

    function rfInit() {
        if (!$('#mod-standard')) return;
        rfRenderBlocks();
        buildRosterSelector('rfRoster', 'standard');
        setDatetimeNow('rfDatetime');

        ['rfDatetime', 'rfLocation', 'rfArrestTime', 'rfProsecutor', 'rfSuspectLast', 'rfSuspectFirst'].forEach(id => {
            const el = $('#' + id);
            if (!el) return;
            el.addEventListener('input', rfUpdatePreview);
            el.addEventListener('change', rfUpdatePreview);
        });

        // Les clics du roster mutent state.selectedAgents dans leur propre
        // handler ; on rafraîchit l'aperçu juste après (phase de bouillonnement).
        const roster = $('#rfRoster');
        if (roster) roster.addEventListener('click', () => setTimeout(rfUpdatePreview, 0));

        const ta = $('#rf-preview');
        if (ta) ta.addEventListener('input', () => rfSetDirty(true));

        const copy = $('#rfCopy');
        if (copy) copy.addEventListener('click', () => { const t = $('#rf-preview'); if (t) copyToClipboard(t.value); });

        const regen = $('#rfRegen');
        if (regen) regen.addEventListener('click', () => { rfSetDirty(false); rfUpdatePreview(); showToast('Aperçu régénéré depuis les blocs.'); });

        const aiBtn = $('#rfAiBtn');
        if (aiBtn) aiBtn.addEventListener('click', rfAiComplete);

        const reset = $('#rfReset');
        if (reset) reset.addEventListener('click', rfReset);

        // CTA du dashboard → ouvre le mode standard via le lien de nav existant.
        const cta = $('#btnNewStandard');
        if (cta) cta.addEventListener('click', () => {
            const link = $('.nav-link[data-module="standard"]');
            if (link) link.click();
        });

        // Charges retenues — branchées sur le calculateur pénal partagé (mêmes
        // fonctions que patrol/narcotics, aucune duplication de logique).
        if ($('#standardPenalInfractions')) {
            buildInlinePenalCode('standardPenalInfractions', 'standardPenalFine', 'standardPenalPrison', 'standardPenalCharges');
            initPenalSearch('standardPenalSearch', 'standardPenalInfractions', true);
            $('#standardPenalInfractions').addEventListener('change', () => setTimeout(rfUpdatePreview, 0));
        }

        rfUpdatePreview();
    }

    // ═══════════════════════════════════════════════════════════════════
    // COMPLÉTUDE & CONFORMITÉ LÉGALE
    // Partagé par le Rapport Rapide (« standard ») et le Rapport de
    // Patrouille (« patrol »). Une seule spec de champs, un adaptateur de
    // contexte par module, un seul moteur d'évaluation.
    // ═══════════════════════════════════════════════════════════════════

    const RULES = window.LSPD_RULES;
    const DEFENSE = window.LSPD_DEFENSE;

    // Normalise « 2h5 » en « 02h05 ». Si le socle légal n'a pas été généré
    // (tools/build-legal.js jamais lancé), on rend la saisie telle quelle
    // plutôt que de casser la génération du rapport.
    function fmtH(value) {
        return RULES ? RULES.formatHeure(value) : String(value || '').trim();
    }

    const COMPLIANCE_PREFIX = { standard: 'rf', patrol: 'patrol' };
    const complianceValues = { standard: {}, patrol: {} };
    const complianceShape = { standard: null, patrol: null };
    const validatedCtx = { standard: null, patrol: null };

    // Les réponses aux questions internes sont stockées HORS de
    // complianceValues. Le récit et les annexes lisent exclusivement
    // complianceGet() ou le contexte : une réponse interne n'a donc aucun
    // chemin pour atteindre le texte du rapport, la copie ou les exports.
    const internalAnswers = { standard: {}, patrol: {} };

    function complianceGet(moduleKey, key) {
        return String(complianceValues[moduleKey][key] || '').trim();
    }

    function internalGet(moduleKey, key) {
        return String(internalAnswers[moduleKey][key] || '').trim();
    }

    function complianceFieldDomId(moduleKey, key) {
        return COMPLIANCE_PREFIX[moduleKey] + 'Cf_' + key;
    }

    // ─── Adaptateurs de contexte ───────────────────────────────────────

    function emptyCtx(moduleKey) {
        return {
            module: moduleKey,
            date: '', time: '', lieu: '', secteur: '',
            agents: [], motif: '', denouement: '',
            suspect: { nom: '', prenom: '', dob: '', sexe: '' },
            hasVehicle: false, verifPlaque: '', verifCasier: '',
            origineIntervention: '', constatationInitiale: '',
            indicatifUnite: '', demandeurRenfort: '', constatArrivee: '',
            dispositifSecurite: '', negociation: '', surveillance: '',
            moyenInterpellation: '', resultatGsr: '', preuveMaterielle: '',
            nationaliteSuspect: '', sanction: '', reglementSanction: '',
            motifDroitsDifferes: '', heureDroitsDifferes: '',
            uniteRenfort: '', manoeuvreInterception: '', issuePoursuite: '',
            pursuit: false, heureFinPoursuite: '', lieuFinPoursuite: '',
            collision: false, cuffed: false,
            force: { used: false, weapon: false, moyens: [], justification: '', sommation: '', menace: '' },
            injured: false, injuredByOfficer: false,
            medical: { cause: '', nature: '', heureEvac: '', etablissement: '', heureSortie: '', rapport12h: '' },
            miranda: { heure: '', reaction: '' },
            lawyer: { requested: false, heureContact: '', heureArrivee: '' },
            transport: { heure: '', destination: '' },
            fouille: {
                effectuee: false, base: '', objets: [],
                nature: '', motifPalpation: '', motifFouille: '',
                discretionPalpation: '', memeSexeFouille: '', auteur: ''
            },
            charges: [], heureArrestation: '', heurePresentationProcureur: '',
            chronoStamps: [], reportText: ''
        };
    }

    // DB.penalCode nomme ses catégories au pluriel ; le code pénal et les
    // règles de délai (Art. 2-2-8, 2-1-9) raisonnent au singulier.
    const DB_CATEGORY_TO_GRAVITE = {
        'Contraventions': 'Contravention',
        'Délits Mineurs': 'Délit mineur',
        'Délits Majeurs': 'Délit majeur',
        'Crimes': 'Crime'
    };

    function chargesFor(penalContainerId) {
        return $$(`#${penalContainerId} input[type="checkbox"]:checked`).map(cb => {
            const cat = DB.penalCode[parseInt(cb.dataset.cat)];
            const item = cat && cat.items[parseInt(cb.dataset.item)];
            if (!item) return null;
            return {
                name: item.name,
                categorie: DB_CATEGORY_TO_GRAVITE[cat.category] || '',
                articles: RULES.articlesForCharge(item.name)
            };
        }).filter(Boolean);
    }

    function applyComplianceValues(ctx, moduleKey) {
        const v = k => complianceGet(moduleKey, k);
        ctx.origineIntervention = v('origineIntervention');
        ctx.indicatifUnite = v('indicatifUnite');
        ctx.demandeurRenfort = v('demandeurRenfort');
        ctx.constatArrivee = v('constatArrivee');
        ctx.dispositifSecurite = v('dispositifSecurite');
        ctx.negociation = v('negociation');
        ctx.surveillance = v('surveillance');
        ctx.moyenInterpellation = v('moyenInterpellation');
        ctx.resultatGsr = v('resultatGsr');
        ctx.preuveMaterielle = v('preuveMaterielle');
        ctx.nationaliteSuspect = v('nationaliteSuspect');
        ctx.sanction = v('sanction');
        ctx.reglementSanction = v('reglementSanction');
        ctx.motifDroitsDifferes = v('motifDroitsDifferes');
        ctx.heureDroitsDifferes = v('heureDroitsDifferes');
        ctx.constatationInitiale = v('constatationInitiale');
        ctx.uniteRenfort = v('uniteRenfort');
        ctx.manoeuvreInterception = v('manoeuvreInterception');
        ctx.issuePoursuite = v('issuePoursuite');
        ctx.fouille.nature = v('natureControle');
        ctx.fouille.motifPalpation = v('motifPalpation');
        ctx.fouille.motifFouille = v('motifFouille');
        ctx.fouille.discretionPalpation = v('discretionPalpation');
        ctx.fouille.memeSexeFouille = v('memeSexeFouille');
        ctx.fouille.auteur = v('auteurControle');
        if (ctx.fouille.nature && ctx.fouille.nature !== 'Aucune palpation ni fouille') {
            ctx.fouille.effectuee = true;
        }
        ctx.secteur = v('secteur');
        ctx.heureFinPoursuite = v('heureFinPoursuite');
        ctx.lieuFinPoursuite = v('lieuFinPoursuite');
        ctx.verifPlaque = v('verifPlaque');
        ctx.verifCasier = v('verifCasier');
        ctx.force.justification = v('justificationForce') || ctx.force.justification;
        ctx.force.sommation = v('sommation');
        ctx.force.menace = v('menaceInvoquee');
        ctx.medical.cause = v('causeBlessure');
        ctx.medical.nature = v('natureBlessure');
        ctx.medical.heureEvac = v('heureEvacuation');
        ctx.medical.etablissement = v('etablissement');
        ctx.medical.heureSortie = v('heureSortieMedicale');
        ctx.medical.rapport12h = v('rapportIncident12h');
        ctx.miranda.heure = v('heureDroits');
        ctx.miranda.reaction = v('reactionDroits') || ctx.miranda.reaction;
        ctx.lawyer.heureContact = v('heureContactAvocat');
        ctx.lawyer.heureArrivee = v('heureArriveeAvocat');
        ctx.transport.heure = v('heureTransport');
        ctx.transport.destination = v('destinationTransport');
        ctx.heurePresentationProcureur = v('heurePresentationProcureur');

        if (/avocat/i.test(ctx.miranda.reaction)) ctx.lawyer.requested = true;
        if (ctx.medical.cause) ctx.injured = true;
        ctx.injuredByOfficer = ctx.injured && ctx.medical.cause === 'Action directe des forces de l\'ordre';
        return ctx;
    }

    function buildChronoStamps(ctx) {
        const stamps = [];
        const add = (label, h) => { if (RULES.parseHeure(h) !== null) stamps.push({ label, heure: h }); };
        add('Faits', ctx.time);
        add('Fin de poursuite', ctx.heureFinPoursuite);
        add('Interpellation', ctx.heureArrestation);
        add('Évacuation', ctx.medical.heureEvac);
        add('Sortie médicale', ctx.medical.heureSortie);
        add('Notification des droits', ctx.miranda.heure);
        add('Contact avocat', ctx.lawyer.heureContact);
        add('Transport', ctx.transport.heure);
        add('Présentation au procureur', ctx.heurePresentationProcureur);
        ctx.chronoStamps = stamps;
        return ctx;
    }

    function buildStandardCtx() {
        const ctx = emptyCtx('standard');
        const blocks = rfState.blocks;
        const on = id => !!(blocks[id] && blocks[id].active);
        const fld = (id, key) => (blocks[id] && blocks[id].fields && blocks[id].fields[key]) || '';

        const dtRaw = ($('#rfDatetime') && $('#rfDatetime').value) || '';
        const dtObj = dtRaw ? new Date(dtRaw) : null;
        if (dtObj) { ctx.date = lspdFormatDate(dtObj); ctx.time = lspdFormatTime(dtObj); }

        ctx.lieu = ($('#rfLocation') && $('#rfLocation').value.trim()) || '';
        ctx.agents = lspdSelectedRoster('standard');
        ctx.motif = fld('intervention', 'motif');
        ctx.suspect = {
            nom: ($('#rfSuspectLast') && $('#rfSuspectLast').value.trim()) || '',
            prenom: ($('#rfSuspectFirst') && $('#rfSuspectFirst').value.trim()) || '',
            dob: ($('#rfSuspectDob') && $('#rfSuspectDob').value.trim()) || '',
            sexe: ''
        };
        ctx.heureArrestation = ($('#rfArrestTime') && $('#rfArrestTime').value.trim()) || '';

        ctx.pursuit = on('poursuite');
        ctx.collision = on('accident') || fld('poursuite', 'issue') === 'accident survenu';
        ctx.hasVehicle = ctx.collision || (ctx.pursuit && fld('poursuite', 'type') !== 'à pied');
        ctx.cuffed = on('cloture') || on('usage_force');

        ctx.force.used = on('usage_force');
        ctx.force.weapon = fld('usage_force', 'type') === 'arme à feu';
        ctx.force.moyens = ctx.force.used ? [fld('usage_force', 'type')].filter(Boolean) : [];
        ctx.force.justification = fld('usage_force', 'justification');

        ctx.injured = on('transport') || /bless/i.test(fld('securisation_secours', 'etat'));
        ctx.miranda.reaction = on('miranda') ? fld('miranda', 'moment') : '';
        ctx.lawyer.requested = on('avocat');

        ctx.fouille.effectuee = on('fouille');
        ctx.fouille.objets = fld('fouille', 'objets')
            ? fld('fouille', 'objets').split(/\s*(?:,|;| et )\s*/).filter(Boolean) : [];
        if (fld('fouille', 'arme')) ctx.fouille.objets.push(fld('fouille', 'arme'));

        ctx.denouement = on('poursuite') || on('usage_force') || on('cloture')
            || on('interpellation_differee') || on('pv');

        ctx.charges = $('#standardPenalInfractions') ? chargesFor('standardPenalInfractions') : [];
        return buildChronoStamps(applyComplianceValues(ctx, 'standard'));
    }

    const PATROL_WEAPON_TAGS = /riposté par arme à feu|tir de neutralisation|tir de sommation|arme lourde/i;
    const PATROL_INJURY_TAGS = /blessure par balle|arme blanche|traumatisme|inconscient|décédé|état de choc/i;

    function buildPatrolCtx() {
        const ctx = emptyCtx('patrol');
        const tags = state.patrol.tags;

        const dtRaw = ($('#patrolDatetime') && $('#patrolDatetime').value) || '';
        const dtObj = dtRaw ? new Date(dtRaw) : null;
        if (dtObj) { ctx.date = lspdFormatDate(dtObj); ctx.time = lspdFormatTime(dtObj); }

        ctx.lieu = ($('#patrolLocation') && $('#patrolLocation').value.trim()) || '';
        ctx.agents = lspdSelectedRoster('patrol');
        const motif = lspdPatrolMotif();
        ctx.motif = motif === 'une intervention' ? '' : motif;
        ctx.heureArrestation = ($('#patrolArrestTime') && $('#patrolArrestTime').value.trim()) || '';

        const suspects = getSuspectsData('patrolSuspectCards')
            .filter(s => (s.role || 'Suspect') === 'Suspect');
        const first = suspects[0];
        if (first) {
            ctx.suspect = {
                nom: first.lastname === 'Inconnu' ? '' : first.lastname,
                prenom: first.firstname === 'Inconnu' ? '' : first.firstname,
                dob: first.dob || '', sexe: first.gender || ''
            };
        }

        const veh = getVehicleData();
        ctx.hasVehicle = !!(veh.model || veh.plate || (veh.color || []).length);

        const codes = state.patrol.tenCodes || [];
        ctx.pursuit = (tags.suspect_flight || []).length > 0
            || (tags.pursuit_end || []).length > 0
            || codes.indexOf('10-56') !== -1 || codes.indexOf('10-55') !== -1;
        ctx.collision = codes.indexOf('10-50') !== -1 || codes.indexOf('10-51') !== -1
            || (state.patrol.vehicleState || []).indexOf('Accidenté') !== -1;

        const force = tags.force || [];
        ctx.force.used = force.length > 0;
        ctx.force.weapon = force.some(t => PATROL_WEAPON_TAGS.test(t));
        ctx.force.moyens = force;
        ctx.cuffed = force.some(t => /maîtrise physique/i.test(t))
            || (tags.search_person || []).some(t => /incidente à l/i.test(t));

        const health = (first && first.health) || [];
        const medEnd = tags.medical_end || [];
        ctx.injured = health.some(h => PATROL_INJURY_TAGS.test(h))
            || medEnd.some(m => /soins ems|transport centre hospitalier|maintenu en observation/i.test(m));

        const miranda = tags.miranda || [];
        if (miranda.indexOf('Droits Miranda lus et compris') !== -1) {
            ctx.miranda.reaction = 'A déclaré les avoir compris';
        }
        ctx.lawyer.requested = miranda.indexOf('Demande un avocat') !== -1;

        const searchTags = [...(tags.search_person || []), ...(tags.search_vehicle || [])];
        ctx.fouille.effectuee = searchTags.length > 0;
        ctx.fouille.base = searchTags.join(', ');
        ctx.fouille.objets = (state.patrol.evidence || []).slice();

        ctx.denouement = ctx.force.used || (tags.suspect_state || []).length > 0 || medEnd.length > 0;

        ctx.charges = $('#patrolPenalInfractions') ? chargesFor('patrolPenalInfractions') : [];
        return buildChronoStamps(applyComplianceValues(ctx, 'patrol'));
    }

    function buildCtx(moduleKey) {
        return moduleKey === 'patrol' ? buildPatrolCtx() : buildStandardCtx();
    }

    // ─── Rendu des champs de conformité ────────────────────────────────

    function buildComplianceInput(moduleKey, field) {
        const domId = complianceFieldDomId(moduleKey, field.key);
        const current = field.internal
            ? internalGet(moduleKey, field.key)
            : complianceGet(moduleKey, field.key);
        let input;

        if (field.type === 'select') {
            input = document.createElement('select');
            (field.options || []).forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt || '— Sélectionner —';
                input.appendChild(o);
            });
            input.value = current;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = field.placeholder || (field.type === 'time' ? 'Ex : 02h15' : '');
            input.value = current;
            if (field.type === 'time') input.setAttribute('inputmode', 'numeric');
        }

        input.id = domId;
        input.className = 'cf-input';
        // Les heures et justifications alimentent aussi le corps du rapport
        // (chronologie, médical, avocat) : l'aperçu doit se régénérer.
        const sync = () => {
            if (field.internal) {
                internalAnswers[moduleKey][field.key] = input.value;
                refreshCompliance(moduleKey);
                return;
            }
            complianceValues[moduleKey][field.key] = input.value;
            if (moduleKey === 'standard') rfUpdatePreview();
            else refreshCompliance(moduleKey);
        };
        input.addEventListener('input', sync);
        input.addEventListener('change', sync);
        return input;
    }

    function renderComplianceFields(moduleKey, ctx) {
        const wrap = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'ComplianceFields');
        if (!wrap) return;

        const visible = RULES.COMPLIANCE_FIELDS.filter(f => {
            try { return f.when(ctx); } catch (e) { return false; }
        }).sort((a, b) => (a.internal ? 1 : 0) - (b.internal ? 1 : 0));
        const shape = visible.map(f => f.key).join('|');
        if (shape === complianceShape[moduleKey]) return;   // évite de voler le focus
        complianceShape[moduleKey] = shape;

        wrap.innerHTML = '';
        let currentGroup = null;
        let groupBody = null;

        visible.forEach(field => {
            if (field.group !== currentGroup) {
                currentGroup = field.group;
                const g = document.createElement('div');
                g.className = 'cf-group';
                const title = document.createElement('div');
                title.className = 'cf-group-title';
                title.textContent = currentGroup;
                if (field.internal) title.dataset.internal = '1';
                g.appendChild(title);
                groupBody = document.createElement('div');
                groupBody.className = 'cf-group-body';
                g.appendChild(groupBody);
                wrap.appendChild(g);
            }
            const row = document.createElement('div');
            row.className = 'cf-field';
            row.dataset.cfKey = field.key;

            const lab = document.createElement('label');
            lab.textContent = field.label;
            lab.setAttribute('for', complianceFieldDomId(moduleKey, field.key));
            row.appendChild(lab);
            row.appendChild(buildComplianceInput(moduleKey, field));

            if (field.hint) {
                const hint = document.createElement('span');
                hint.className = 'cf-hint';
                hint.textContent = field.hint;
                row.appendChild(hint);
            }
            groupBody.appendChild(row);
        });
    }

    // ─── Barre de complétude ───────────────────────────────────────────

    function renderCompleteness(moduleKey, ev) {
        const el = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'Completeness');
        if (!el) return;
        const done = ev.applicableCount - ev.missing.length;
        const tone = ev.valid ? 'ok' : (ev.percent >= 70 ? 'warn' : 'bad');
        const criticalNote = ev.criticalMissing.length
            ? `<div class="cp-critical">⚠ ${ev.criticalMissing.length} élément(s) légalement obligatoire(s) manquant(s) — la validation reste bloquée même au-dessus de ${Math.round(ev.threshold * 100)} %.</div>`
            : '';
        el.innerHTML =
            `<div class="cp-head">
                <span class="cp-title">Complétude du rapport</span>
                <span class="cp-score cp-${tone}">${ev.percent} %</span>
             </div>
             <div class="cp-bar"><div class="cp-fill cp-${tone}" style="width:${ev.percent}%"></div></div>
             <div class="cp-sub">${done}/${ev.applicableCount} éléments applicables couverts · seuil ${Math.round(ev.threshold * 100)} %</div>
             ${criticalNote}`;
    }

    // ─── Panneau de relance ────────────────────────────────────────────

    const PROBE_TARGETS = {
        standard: {
            datetime: '#rfDatetime', roster: '#rfRoster', suspect: '#rfSuspectLast',
            dob: '#rfSuspectDob', arrestTime: '#rfArrestTime', charges: '#standardPenalInfractions',
            motif: '#rfBlocks', denouement: '#rfBlocks', fouille: '#rfBlocks'
        },
        patrol: {
            datetime: '#patrolDatetime', roster: '#patrolRoster', suspect: '#patrolSuspectCards',
            dob: '#patrolSuspectCards', arrestTime: '#patrolArrestTime',
            charges: '#patrolPenalInfractions', motif: '#tenCodeSelector',
            denouement: '#mod-patrol .tag-builder', fouille: '#patrolEvidence'
        }
    };

    function probeTargetSelector(moduleKey, field) {
        const map = PROBE_TARGETS[moduleKey] || {};
        if (map[field]) return map[field];
        return '#' + complianceFieldDomId(moduleKey, field);
    }

    function focusProbeTarget(moduleKey, field) {
        const el = document.querySelector(probeTargetSelector(moduleKey, field));
        if (!el) return;
        const section = el.closest('.form-section');
        if (section) section.classList.remove('fs-collapsed');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('probe-flash');
        setTimeout(() => el.classList.remove('probe-flash'), 1600);
        if (typeof el.focus === 'function' && /INPUT|SELECT|TEXTAREA/.test(el.tagName)) {
            setTimeout(() => el.focus(), 250);
        }
    }

    function renderProbes(moduleKey, ev) {
        const el = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'Probes');
        if (!el) return;
        if (!ev.missing.length) {
            el.innerHTML = '<div class="probes-clear">✓ Tous les éléments requis sont renseignés.</div>';
            return;
        }
        const cards = ev.missing.map(m => {
            const refs = (m.articles || []).map(r => RULES.citation(r)).join(' · ');
            return `<div class="probe${m.critical ? ' probe-critical' : ''}">
                <div class="probe-q">${escapeHtml(m.probe)}</div>
                ${refs ? `<div class="probe-art">${escapeHtml(refs)}</div>` : ''}
                <button type="button" class="probe-go" data-field="${escapeHtml(m.field)}">→ Renseigner</button>
            </div>`;
        }).join('');
        el.innerHTML =
            `<div class="probes-head">${ev.missing.length} question(s) en attente</div>${cards}`;
        el.querySelectorAll('.probe-go').forEach(btn => {
            btn.addEventListener('click', () => focusProbeTarget(moduleKey, btn.dataset.field));
        });
    }

    // ─── Orchestration ─────────────────────────────────────────────────

    let complianceBusy = false;

    function refreshCompliance(moduleKey) {
        if (!RULES || complianceBusy) return null;
        complianceBusy = true;
        try {
            const ctx = buildCtx(moduleKey);
            const ev = RULES.evaluate(ctx);
            renderComplianceFields(moduleKey, ctx);
            renderCompleteness(moduleKey, ev);
            renderProbes(moduleKey, ev);
            updateDefenseButton(moduleKey, ev);
            return { ctx, ev };
        } finally {
            complianceBusy = false;
        }
    }

    // Rappel OIS — affiché APRÈS génération, dans l'interface seulement.
    // Un tir dont le rédacteur est l'auteur impose un rapport d'incident
    // distinct, remis au FID/IAD : le rapport d'arrestation ne s'y substitue
    // pas. Ce rappel ne touche jamais le texte du rapport.
    function maybeRemindOis(moduleKey) {
        if (internalGet(moduleKey, 'auteurUsageArme') !== 'Le rédacteur de ce rapport') return;
        const hote = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'Completeness');
        if (!hote) return;
        if (hote.querySelector('.ois-reminder')) return;

        const bloc = document.createElement('div');
        bloc.className = 'ois-reminder';
        bloc.innerHTML =
            '<div class="ois-title">⚠ Rapport d\'incident (OIS) requis</div>'
            + "<p>Vous avez fait usage de votre arme de service. Ce rapport d'arrestation ne s'y substitue pas : "
            + "un rapport d'incident distinct doit être rédigé et remis au FID/IAD.</p>"
            + '<button type="button" class="btn btn-gold btn-sm ois-go">⊕ Ouvrir le Rapport d\'Incident</button>';
        hote.appendChild(bloc);
        bloc.querySelector('.ois-go').addEventListener('click', () => {
            const lien = $('.nav-link[data-module="ois"]');
            if (lien) lien.click();
        });
    }

    function updateDefenseButton(moduleKey, ev) {
        const btn = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'Defense');
        if (!btn) return;
        const ready = !!validatedCtx[moduleKey] && ev.valid;
        btn.disabled = !ready;
        btn.title = ready
            ? 'Générer la fiche de préparation à l\'audience'
            : 'Validez le rapport pour préparer la défense';
    }

    // Refus explicite tant que la checklist n'est pas couverte.
    function validateReport(moduleKey) {
        const res = refreshCompliance(moduleKey);
        if (!res) return false;
        const { ctx, ev } = res;

        if (!ev.valid) {
            validatedCtx[moduleKey] = null;
            updateDefenseButton(moduleKey, ev);
            const reason = ev.criticalMissing.length
                ? `${ev.criticalMissing.length} élément(s) légalement obligatoire(s) manquant(s)`
                : `complétude ${ev.percent} % (seuil ${Math.round(ev.threshold * 100)} %)`;
            showToast(`Rapport incomplet — ${reason}.`, 'error');
            const probes = $('#' + COMPLIANCE_PREFIX[moduleKey] + 'Probes');
            if (probes) probes.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }

        validatedCtx[moduleKey] = ctx;
        updateDefenseButton(moduleKey, ev);
        maybeRemindOis(moduleKey);
        showToast(`Rapport validé — complétude ${ev.percent} %.`);
        return true;
    }

    // ─── Sections de rapport issues de la conformité ───────────────────
    // Reprend la présentation de l'exemple de référence : chronologie,
    // prise en charge médicale et assistance d'un avocat en fin de rapport.

    // Seule l'assistance d'un avocat est reprise en fin de rapport, sous la
    // forme de l'exemple de référence. Les heures d'évacuation, de sortie
    // médicale et de notification des droits sont portées par le récit
    // lui-même : les redupliquer en liste alourdirait le rapport pour rien.
    function complianceTrailer(ctx) {
        if (!ctx.lawyer.requested) return '';
        const H = RULES.formatHeure;
        return '\n\n' + [
            'Assistance d\'un Avocat :',
            `* Heure de prise de contact : ${ctx.lawyer.heureContact ? H(ctx.lawyer.heureContact) : 'XXhXX'}`,
            `* Heure d'arrivée : ${ctx.lawyer.heureArrivee || 'XXhXX'}`
        ].join('\n');
    }

    // ─── Modale de défense ─────────────────────────────────────────────

    const SEVERITY_LABEL = { fail: 'Bloquant', warn: 'À consolider', ok: 'Conforme', na: 'Sans objet' };
    let defenseText = '';

    function defenseDelaysHtml(doc) {
        const rows = doc.delays.map(d => `
            <tr class="dl-${d.statut.replace(/[^a-zà-ÿ]/gi, '').toLowerCase()}">
                <td>${escapeHtml(d.label)}</td>
                <td class="dl-num">${escapeHtml(d.mesure)}</td>
                <td class="dl-num">${escapeHtml(d.limite)}</td>
                <td class="dl-statut">${escapeHtml(d.statut)}</td>
                <td class="dl-art">${escapeHtml(d.citation)}</td>
            </tr>`).join('');
        return `<table class="defense-table">
            <thead><tr><th>Délai</th><th>Mesuré</th><th>Plafond</th><th>Statut</th><th>Fondement</th></tr></thead>
            <tbody>${rows}</tbody></table>`;
    }

    function defenseChargesHtml(doc) {
        if (!doc.charges.length) return '<p class="defense-empty">Aucune charge retenue.</p>';
        return '<ul class="defense-charges">' + doc.charges.map(c => `
            <li>
                <span class="dc-name">${escapeHtml(c.name)}</span>
                ${c.categorie ? `<span class="dc-cat">${escapeHtml(c.categorie)}</span>` : ''}
                ${c.citations.length
                    ? c.citations.map(ci => `<span class="dc-art">${escapeHtml(ci)}</span>`).join('')
                    : '<span class="dc-art dc-missing">Aucun article identifié</span>'}
            </li>`).join('') + '</ul>';
    }

    function defenseGroupsHtml(doc) {
        return doc.groups.map(g => `
            <div class="defense-phase">
                <div class="defense-phase-title">${escapeHtml(g.phase)}</div>
                ${g.items.map(it => `
                    <div class="defense-item di-${it.severity}">
                        <div class="di-head">
                            <span class="di-badge">${escapeHtml(SEVERITY_LABEL[it.severity] || '')}</span>
                            <span class="di-q">${escapeHtml(it.question)}</span>
                        </div>
                        ${(it.articles || []).map(r => `<div class="di-art">${escapeHtml(RULES.citation(r))}</div>`).join('')}
                        ${it.reponse ? `<div class="di-line"><b>Le rapport :</b> ${escapeHtml(it.reponse)}</div>` : ''}
                        ${it.manque ? `<div class="di-line di-gap"><b>Faiblesse :</b> ${escapeHtml(it.manque)}</div>` : ''}
                        ${it.aFaire ? `<div class="di-line di-fix"><b>À ajouter :</b> ${escapeHtml(it.aFaire)}</div>` : ''}
                    </div>`).join('')}
            </div>`).join('');
    }

    function openDefenseModal(moduleKey) {
        const ctx = validatedCtx[moduleKey];
        if (!ctx) { showToast('Validez le rapport avant de préparer la défense.', 'error'); return; }

        const ev = RULES.evaluate(ctx);
        const doc = DEFENSE.buildDefenseDoc(ctx, ev);
        defenseText = sanitizeRadioCodes(DEFENSE.renderText(doc));

        const sub = $('#defenseSub');
        if (sub) {
            sub.textContent = `${doc.meta.suspect} · ${doc.meta.date} ${doc.meta.time} · `
                + `${doc.counts.fail} bloquant(s), ${doc.counts.warn} à consolider`;
        }

        const body = $('#defenseBody');
        if (body) {
            body.innerHTML =
                `<section><h4>1 · Respect des délais</h4>${defenseDelaysHtml(doc)}</section>
                 <section><h4>2 · Qualification des charges</h4>${defenseChargesHtml(doc)}</section>
                 <section><h4>3 · Points d'attaque anticipés</h4>${defenseGroupsHtml(doc)}</section>
                 ${doc.todo.length ? `<section><h4>4 · À corriger avant de se présenter</h4>
                    <ol class="defense-todo">${doc.todo.map(t => `<li>${escapeHtml(t.aFaire)}</li>`).join('')}</ol>
                 </section>` : ''}`;
            body.scrollTop = 0;
        }
        const titre = $('#defenseModal h3');
        if (titre) titre.textContent = "⚖ Préparation à l'audience";
        const modal = $('#defenseModal');
        if (modal) { modal.dataset.kind = 'procureur'; modal.classList.add('active'); }
    }

    function initDefenseModal() {
        const modal = $('#defenseModal');
        if (!modal) return;
        const close = () => modal.classList.remove('active');
        $('#btnDefenseClose').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        const estIad = () => modal.dataset.kind === 'iad';
        $('#btnDefenseCopy').addEventListener('click',
            () => copyToClipboard(estIad() ? iadText : defenseText));
        $('#btnDefenseExport').addEventListener('click', () => estIad()
            ? exportText(iadText, 'preparation-audition-iad')
            : exportText(defenseText, 'preparation-audience'));
    }

    // ═══════════════════════════════════════════════════════════════════
    // RAPPORT D'INCIDENT — TIR D'OFFICIER (OIS)
    //
    // Rapport distinct du rapport d'arrestation, remis au FID/IAD. Il suit
    // le gabarit officiel du département (docs/template-ois.md), section par
    // section : les intitulés et l'ordre ne sont pas négociables, c'est ce
    // document que le FID attend.
    // ═══════════════════════════════════════════════════════════════════

    const OIS_CHECKBOX = (actif) => (actif ? '☑' : '☐');

    function oisVal(id) {
        const el = $('#' + id);
        return el ? el.value.trim() : '';
    }

    function oisTag(containerId) {
        const b = $(`#${containerId} .tag-btn.active`);
        return b ? b.dataset.tag : '';
    }

    function oisContext() {
        const dtRaw = oisVal('oisDatetime');
        const dt = dtRaw ? new Date(dtRaw) : null;
        return {
            dossier: oisVal('oisDossier'),
            date: dt ? lspdFormatDate(dt) : '',
            heure: dt ? lspdFormatTime(dt) : '',
            lieu: oisVal('oisLieu'),
            officier: {
                nom: oisVal('oisOffNom'), badge: oisVal('oisOffBadge'),
                grade: oisVal('oisOffGrade'), division: oisVal('oisOffDivision')
            },
            arme: {
                type: oisVal('oisArmeType'), modele: oisVal('oisArmeModele'),
                calibre: oisVal('oisArmeCalibre'), serie: oisVal('oisArmeSerie'),
                tirees: oisVal('oisMunitionsTirees'), chargeur: oisVal('oisChargeur')
            },
            temoins: oisVal('oisTemoins').split(/\r?\n/).map(t => t.trim()).filter(Boolean),
            suspect: {
                nom: oisVal('oisSuspectNom'), description: oisVal('oisSuspectDesc'),
                arme: oisVal('oisSuspectArme'), etat: oisTag('oisSuspectEtat')
            },
            motif: oisVal('oisMotif'),
            circonstances: {
                vehicule: oisVal('oisVehicule'), distance: oisVal('oisDistance'),
                position: oisVal('oisPosition'), sommations: oisTag('oisSommations'),
                riposte: oisTag('oisRiposte'), riposteNb: oisVal('oisRiposteNb'),
                recit: oisVal('oisRecit')
            },
            dommages: {
                officier: oisVal('oisOffBlesse'), suspect: oisVal('oisSuspectTouche'),
                civil: oisVal('oisCivilTouche'), materiel: oisVal('oisDommages')
            },
            bodycam: {
                remise: oisTag('oisBodycam'), ref: oisVal('oisBodycamRef'),
                heures: oisVal('oisBodycamHeures')
            }
        };
    }

    // Rend le gabarit du département, rubrique par rubrique.
    function oisBuildReport() {
        const c = oisContext();
        const v = (x) => x || '—';
        const L = [];

        L.push('LOS SANTOS POLICE DEPARTMENT');
        L.push("Rapport d'Incident Impliquant un Tir d'Officier (OIS)");
        L.push('');
        L.push(`Numéro de dossier : ${v(c.dossier)}`);
        L.push(`Date de l'incident : ${v(c.date)}`);
        L.push(`Heure de l'incident : ${v(c.heure)}`);
        L.push(`Lieu : ${v(c.lieu)}`);
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push('1. OFFICIER IMPLIQUÉ');
        L.push('───────────────────────────────────────────────');
        L.push(`Nom & Prénom : ${v(c.officier.nom)}`);
        L.push(`Badge n° : ${v(c.officier.badge)}`);
        L.push(`Grade : ${v(c.officier.grade)}`);
        L.push(`Division / Affectation : ${v(c.officier.division)}`);
        L.push('');
        L.push('Arme de service utilisée');
        L.push(`  Type d'arme : ${v(c.arme.type)}`);
        L.push(`  Modèle : ${v(c.arme.modele)}`);
        L.push(`  Calibre : ${v(c.arme.calibre)}`);
        L.push(`  Numéro de série : ${v(c.arme.serie)}`);
        L.push(`  Nombre de munitions tirées : ${v(c.arme.tirees)}`);
        L.push(`  Chargeur avant / après incident : ${v(c.arme.chargeur)}`);
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push('2. OFFICIERS TÉMOINS / PRÉSENTS');
        L.push('───────────────────────────────────────────────');
        if (c.temoins.length) c.temoins.forEach(t => L.push(`- ${t}`));
        else L.push('- Néant');
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push('3. SUSPECT(S) IMPLIQUÉ(S)');
        L.push('───────────────────────────────────────────────');
        L.push(`Nom (si connu) : ${v(c.suspect.nom)}`);
        L.push(`Description physique : ${v(c.suspect.description)}`);
        L.push(`Armé ? (Type d'arme) : ${v(c.suspect.arme)}`);
        L.push('État après incident : '
            + ['Blessé', 'Décédé', 'En fuite', 'Interpellé']
                .map(e => `${OIS_CHECKBOX(c.suspect.etat === e)} ${e}`).join('  '));
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push("4. CONTEXTE DE L'INTERVENTION");
        L.push('───────────────────────────────────────────────');
        L.push("Motif initial de l'intervention :");
        L.push(v(c.motif));
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push('5. CIRCONSTANCES DU TIR');
        L.push('───────────────────────────────────────────────');
        // Amorce imposée par le gabarit : récit à la première personne.
        const temoinsAmorce = c.temoins.length
            ? c.temoins.map(t => t.split('—')[0].trim()).filter(Boolean).join(', ') + ' et moi-même'
            : 'moi-même';
        L.push(`« Le ${v(c.date)} à ${v(c.heure)}, je me trouvais dans la patrouille composée de `
            + `${temoinsAmorce}, à bord du véhicule ${v(c.circonstances.vehicule)}, lorsque… »`);
        L.push('');
        L.push(v(c.circonstances.recit));
        L.push('');
        L.push(`Distance approximative : ${v(c.circonstances.distance)} mètres`);
        L.push(`Position de l'officier : ${v(c.circonstances.position)}`);
        L.push('Sommations effectuées : '
            + `${OIS_CHECKBOX(c.circonstances.sommations === 'Oui')} Oui  `
            + `${OIS_CHECKBOX(c.circonstances.sommations === 'Non')} Non`);
        L.push('Tirs ripostés par le suspect : '
            + `${OIS_CHECKBOX(c.circonstances.riposte === 'Oui')} Oui  `
            + `${OIS_CHECKBOX(c.circonstances.riposte === 'Non')} Non`
            + ` — Nombre : ${v(c.circonstances.riposteNb)}`);
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push('6. BLESSURES & DOMMAGES');
        L.push('───────────────────────────────────────────────');
        L.push(`Officier(s) blessé(s) : ${v(c.dommages.officier)}`);
        L.push(`Suspect(s) touché(s) : ${v(c.dommages.suspect)}`);
        L.push(`Civil(s) touché(s) : ${v(c.dommages.civil)}`);
        L.push(`Dommages matériels : ${v(c.dommages.materiel)}`);
        L.push('');
        L.push('───────────────────────────────────────────────');
        L.push("7. ÉLÉMENTS FOURNIS PAR L'OFFICIER");
        L.push('───────────────────────────────────────────────');
        L.push("L'officier impliqué ne peut fournir que l'enregistrement de sa bodycam.");
        L.push('Tout autre élément de preuve est collecté exclusivement par les enquêteurs');
        L.push('du FID / IAD et les autres unités présentes.');
        L.push('');
        L.push(`${OIS_CHECKBOX(c.bodycam.remise === 'Oui')} Enregistrement bodycam remis — Réf. : ${v(c.bodycam.ref)}`);
        L.push(`Heure de début / fin de l'enregistrement : ${v(c.bodycam.heures)}`);
        L.push("Note : l'arme de service de l'officier est saisie par le FID/IAD pour expertise balistique.");
        L.push('');
        L.push(`Signature de l'officier : _______________    Date : ${v(c.date)}`);
        L.push('');
        L.push("Rappel procédure : après un OIS, l'officier remet immédiatement sa bodycam au");
        L.push("superviseur sur place et son arme de service au FID/IAD. Il ne touche à rien");
        L.push("d'autre sur la scène.");

        return sanitizeRadioCodes(L.join('\n'));
    }

    // Complétude propre au rapport OIS : le gabarit du FID attend ces
    // rubriques renseignées, faute de quoi l'audition portera dessus.
    function oisEvaluate() {
        const c = oisContext();
        const items = [
            ['dossier', 'Numéro de dossier', !!c.dossier],
            ['datetime', "Date et heure de l'incident", !!(c.date && c.heure)],
            ['lieu', 'Lieu de l\'incident', !!c.lieu],
            ['officier', 'Identité, badge et grade de l\'officier', !!(c.officier.nom && c.officier.badge && c.officier.grade)],
            ['division', 'Division / affectation', !!c.officier.division],
            ['arme', 'Arme de service — type, modèle, calibre, série', !!(c.arme.type && c.arme.modele && c.arme.calibre && c.arme.serie)],
            ['munitions', 'Munitions tirées et état du chargeur', !!(c.arme.tirees && c.arme.chargeur)],
            ['temoins', 'Officiers témoins / présents', c.temoins.length > 0],
            ['suspect', 'Identité ou description du suspect', !!(c.suspect.nom || c.suspect.description)],
            ['suspect_arme', 'Suspect armé — type d\'arme', !!c.suspect.arme],
            ['suspect_etat', 'État du suspect après incident', !!c.suspect.etat],
            ['motif', "Motif initial de l'intervention", !!c.motif],
            ['recit', 'Récit factuel et chronologique du tir', c.circonstances.recit.length > 40],
            ['vehicule', "Véhicule et indicatif d'unité", !!c.circonstances.vehicule],
            ['distance', 'Distance approximative', !!c.circonstances.distance],
            ['position', "Position de l'officier au moment du tir", !!c.circonstances.position],
            ['sommations', 'Sommations effectuées', !!c.circonstances.sommations],
            ['riposte', 'Tirs ripostés par le suspect', !!c.circonstances.riposte],
            ['dommages', 'Blessures et dommages', !!(c.dommages.officier && c.dommages.suspect)],
            ['bodycam', 'Bodycam remise et référencée', c.bodycam.remise === 'Oui' ? !!c.bodycam.ref : !!c.bodycam.remise],
            ['bodycam_heures', "Heures de début et de fin de l'enregistrement", !!c.bodycam.heures]
        ].map(([id, label, ok]) => ({ id, label, status: ok ? 'ok' : 'missing' }));

        const missing = items.filter(i => i.status === 'missing');
        const percent = Math.round(((items.length - missing.length) / items.length) * 100);
        return { items, missing, percent, valid: missing.length === 0, applicableCount: items.length };
    }

    function oisRender() {
        const ta = $('#ois-preview');
        if (ta) ta.value = oisBuildReport();

        const ev = oisEvaluate();
        const bar = $('#oisCompleteness');
        if (bar) {
            const tone = ev.valid ? 'ok' : (ev.percent >= 70 ? 'warn' : 'bad');
            bar.innerHTML =
                `<div class="cp-head"><span class="cp-title">Complétude du rapport OIS</span>`
                + `<span class="cp-score cp-${tone}">${ev.percent} %</span></div>`
                + `<div class="cp-bar"><div class="cp-fill cp-${tone}" style="width:${ev.percent}%"></div></div>`
                + `<div class="cp-sub">${ev.applicableCount - ev.missing.length}/${ev.applicableCount} rubriques du gabarit renseignées</div>`;
        }
        const probes = $('#oisProbes');
        if (probes) {
            probes.innerHTML = ev.missing.length
                ? `<div class="probes-head">${ev.missing.length} rubrique(s) à compléter</div>`
                    + ev.missing.map(m => `<div class="probe"><div class="probe-q">${escapeHtml(m.label)}</div></div>`).join('')
                : '<div class="probes-clear">✓ Toutes les rubriques du gabarit sont renseignées.</div>';
        }
        const btn = $('#oisDefense');
        if (btn) btn.disabled = false;
    }

    function oisInit() {
        if (!$('#mod-ois')) return;

        buildRosterSelector('oisRoster', 'ois');
        setDatetimeNow('oisDatetime');

        // Sélectionner un agent au roster pré-remplit son identité.
        const roster = $('#oisRoster');
        if (roster) roster.addEventListener('click', () => setTimeout(() => {
            const agents = lspdSelectedRoster('ois');
            if (!agents.length) return;
            const a = agents[0];
            if ($('#oisOffNom') && !$('#oisOffNom').value) $('#oisOffNom').value = a.name || '';
            if ($('#oisOffGrade') && !$('#oisOffGrade').value) $('#oisOffGrade').value = a.grade || '';
            if ($('#oisOffBadge') && !$('#oisOffBadge').value) $('#oisOffBadge').value = a.matricule || '';
            oisRender();
        }, 0));

        // Sélecteurs à choix unique.
        ['oisSuspectEtat', 'oisSommations', 'oisRiposte', 'oisBodycam'].forEach(id => {
            const c = $('#' + id);
            if (!c) return;
            c.addEventListener('click', e => {
                const b = e.target.closest('.tag-btn');
                if (!b) return;
                const etait = b.classList.contains('active');
                [...c.querySelectorAll('.tag-btn')].forEach(x => x.classList.remove('active'));
                if (!etait) b.classList.add('active');
                oisRender();
            });
        });

        $('#mod-ois').addEventListener('input', oisRender);
        $('#mod-ois').addEventListener('change', oisRender);

        const copy = $('#oisCopy');
        if (copy) copy.addEventListener('click', () => copyToClipboard(oisBuildReport()));
        const exp = $('#oisExport');
        if (exp) exp.addEventListener('click', () => exportText(oisBuildReport(), 'rapport-ois'));
        const def = $('#oisDefense');
        if (def) def.addEventListener('click', openIadModal);

        const reset = $('#oisReset');
        if (reset) reset.addEventListener('click', () => {
            $$('#mod-ois input, #mod-ois textarea').forEach(el => { el.value = ''; });
            $$('#mod-ois .tag-btn.active').forEach(b => b.classList.remove('active'));
            state.selectedAgents.ois = [];
            buildRosterSelector('oisRoster', 'ois');
            setDatetimeNow('oisDatetime');
            oisRender();
            showToast('Rapport OIS réinitialisé.');
        });

        oisRender();
    }

    // ─── Fiche de préparation à l'audition IAD/FID ───
    let iadText = '';

    function openIadModal() {
        const ctx = oisContext();
        const ev = oisEvaluate();
        const doc = DEFENSE.buildIadDoc(ctx, ev);
        iadText = sanitizeRadioCodes(DEFENSE.renderIadText(doc));

        const sub = $('#defenseSub');
        if (sub) {
            sub.textContent = `Audition FID/IAD · ${doc.meta.officier || 'officier non renseigné'} · `
                + `${doc.counts.fail} bloquant(s), ${doc.counts.warn} à consolider`;
        }
        const titre = $('#defenseModal h3');
        if (titre) titre.textContent = "⚖ Préparation à l'audition FID/IAD";

        const body = $('#defenseBody');
        if (body) {
            body.innerHTML = doc.groups.map(g => `
                <section>
                    <h4>${escapeHtml(g.phase)}</h4>
                    ${g.items.map(it => `
                        <div class="defense-item di-${it.severity}">
                            <div class="di-head">
                                <span class="di-badge">${escapeHtml(SEVERITY_LABEL[it.severity] || '')}</span>
                                <span class="di-q">${escapeHtml(it.question)}</span>
                            </div>
                            ${(it.articles || []).map(r => `<div class="di-art">${escapeHtml(RULES.citation(r))}</div>`).join('')}
                            ${it.reference ? `<div class="di-art">${escapeHtml(it.reference)}</div>` : ''}
                            ${it.reponse ? `<div class="di-line"><b>Le rapport :</b> ${escapeHtml(it.reponse)}</div>` : ''}
                            ${it.manque ? `<div class="di-line di-gap"><b>Faiblesse :</b> ${escapeHtml(it.manque)}</div>` : ''}
                            ${it.aFaire ? `<div class="di-line di-fix"><b>À ajouter :</b> ${escapeHtml(it.aFaire)}</div>` : ''}
                        </div>`).join('')}
                </section>`).join('');
            body.scrollTop = 0;
        }
        const modal = $('#defenseModal');
        if (modal) { modal.dataset.kind = 'iad'; modal.classList.add('active'); }
    }

    function initCompliance() {
        if (!RULES || !DEFENSE) return;

        // Temporisation locale : `debounce` appartient au second IIFE du
        // fichier et n'est pas visible depuis cette portée.
        const throttled = (fn, ms) => {
            let t = null;
            return () => { clearTimeout(t); t = setTimeout(fn, ms); };
        };

        ['standard', 'patrol'].forEach(moduleKey => {
            const root = $('#mod-' + moduleKey);
            if (!root) return;
            const refresh = throttled(() => refreshCompliance(moduleKey), 120);
            ['input', 'change', 'click'].forEach(ev => root.addEventListener(ev, refresh, true));
            refreshCompliance(moduleKey);
        });

        const rfValidateBtn = $('#rfValidate');
        if (rfValidateBtn) rfValidateBtn.addEventListener('click', () => validateReport('standard'));

        const rfDefenseBtn = $('#rfDefense');
        if (rfDefenseBtn) rfDefenseBtn.addEventListener('click', () => openDefenseModal('standard'));

        const patrolDefenseBtn = $('#patrolDefense');
        if (patrolDefenseBtn) patrolDefenseBtn.addEventListener('click', () => openDefenseModal('patrol'));

        initDefenseModal();
    }


    function init() {
        // Load saved roster
        loadRoster();
        renderRosterList();

        // Build tag selectors for patrol
        buildSingleTagSelector('unitSelector', DB.units, 'unit', state.patrol, (u) => updateRosterNotice('patrol', u));
        buildSingleTagSelector('statusSelector', DB.statusCodes, 'status', state.patrol);

        // Sélecteur de type d'intervention (ordre de clic = ordre chronologique).
        // On stocke la clé interne en data-tag mais on n'affiche QUE le libellé clair.
        const tenCodeItems = Object.entries(DB.tenCodes).map(([code, desc]) => ({ code, desc }));
        const tenCodeContainer = $('#tenCodeSelector');
        tenCodeItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'tag-btn';
            btn.dataset.tag = item.code;
            btn.textContent = item.desc;
            btn.addEventListener('click', () => {
                const code = item.code;
                const idx = state.patrol.tenCodes.indexOf(code);
                if (idx !== -1) {
                    // Deselect: remove this code and all codes that came AFTER it in the chain
                    state.patrol.tenCodes.splice(idx);
                    // Update button states
                    tenCodeContainer.querySelectorAll('.tag-btn').forEach(b => {
                        b.classList.toggle('active', state.patrol.tenCodes.includes(b.dataset.tag));
                    });
                } else {
                    // Select: append to chain (order matters)
                    state.patrol.tenCodes.push(code);
                    btn.classList.add('active');
                }
                // Keep legacy tenCode as first selected (for intro/report compatibility)
                state.patrol.tenCode = state.patrol.tenCodes[0] || null;
                updateTenCodeChain();
                syncOpsModules();
                togglePursuitPanel();
                // GSR row visibility
                const gsrRow = $('#patrolGsrRow');
                if (gsrRow) gsrRow.classList.toggle('visible', state.patrol.tenCodes.includes('10-31') || state.patrol.tenCodes.includes('10-32'));
            });
            tenCodeContainer.appendChild(btn);
        });

        // Narcotics unit selector
        buildSingleTagSelector('narcUnitSelector', DB.units, 'unit', state.narcotics, (u) => updateRosterNotice('narcotics', u));

        // Narcotics operation type & surveillance duration selectors
        buildSingleTagSelector('narcOperationType', DB.gndOperationTypes.map(t => t), 'operationType', state.narcotics);
        buildSingleTagSelector('narcSurveillanceDuration', DB.gndSurveillanceDurations.map(t => t), 'surveillanceDuration', state.narcotics);

        // Build GND multi-select tag selectors from DB arrays
        buildMultiTagSelectorFromArray('narcSurveillanceMeans', DB.gndSurveillanceMeans);
        buildMultiTagSelectorFromArray('narcObservations', DB.gndObservations);
        buildMultiTagSelectorFromArray('narcInterventionTriggers', DB.gndInterventionTriggers);
        buildMultiTagSelectorFromArray('narcApproachMethods', DB.gndApproachMethods);
        buildMultiTagSelectorFromArray('narcIntelSources', DB.gndIntelSources);
        buildMultiTagSelectorFromArray('narcOperationResults', DB.gndOperationResults);

        // Initialize multi-tag handlers
        initMultiTags();

        // Initialize vehicle tags
        initVehicleTags();

        // Initialize sliders
        initSliders();

        // Build roster selectors for all modules
        refreshAllRosterSelectors();

        // Initialize existing suspect card tags
        initAllExistingSuspectCards();

        // Build dashboard
        buildDashboard();
        updateDashStats();

        // Build penal code
        buildPenalCode();

        // Build inline penal selectors for patrol & GND
        buildInlinePenalCode('patrolPenalInfractions', 'patrolPenalFine', 'patrolPenalPrison', 'patrolPenalCharges');
        buildInlinePenalCode('narcPenalInfractions', 'narcPenalFine', 'narcPenalPrison', 'narcPenalCharges');

        // Initialize penal charge search filters
        initPenalSearch('patrolPenalSearch', 'patrolPenalInfractions', true);
        initPenalSearch('narcPenalSearch', 'narcPenalInfractions', true);
        initPenalSearch('penalSearch', 'penalInfractions', false);

        // Add initial QA block for interrogation
        addQABlock();

        // Initialize map buttons
        initMapButtons();

        // Populate street autocomplete (datalist partagé)
        initStreetAutocomplete();

        // Initialize body map (anatomical zones)
        initBodyMap();

        // Initialize global search
        initGlobalSearch();

        // AI indicator
        refreshAiIndicator();

        // P4 — UX init
        lspdInitPatrolStepper();
        lspdInitOpsBadges();
        lspdRefreshAllCompactSuspects();
        lspdInitRecapModal();
        lspdInitRecapInterceptors();

        // Quick scenarios + smart UX
        buildScenarioPanel();
        initFloatingGenBtn();
        initKeyboardShortcuts();

        // Stepper: also expand section on click
        document.addEventListener('click', e => {
            const li = e.target.closest('#patrolStepper li');
            if (!li) return;
            const step = li.dataset.step;
            const target = document.querySelector(`#mod-patrol .form-section[data-step="${step}"]`);
            if (target) target.classList.remove('fs-collapsed');
        }, true);

        // Mode standard à blocs (parcours par défaut)
        rfInit();

        // Complétude, relances et préparation de la défense (standard + patrouille)
        initCompliance();

        // Rapport d'incident (OIS) — module distinct, remis au FID/IAD
        oisInit();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PENAL CHARGE SEARCH FILTER
    // ═══════════════════════════════════════════════════════════════════

    function initPenalSearch(inputId, containerId, defaultCollapsed) {
        const input = document.getElementById(inputId);
        const clearBtn = document.getElementById(inputId + 'Clear');
        const countEl = document.getElementById(inputId + 'Count');
        if (!input) return;

        function applyFilter() {
            const q = input.value.trim().toLowerCase();
            if (clearBtn) clearBtn.style.display = q ? '' : 'none';

            const sections = document.querySelectorAll(`#${containerId} .penal-cat-section`);
            let totalVisible = 0;

            sections.forEach(section => {
                const header = section.querySelector('.penal-cat-header');
                const body = section.querySelector('.penal-cat-body');
                const rows = section.querySelectorAll('.penal-row');

                if (!q) {
                    // Restore default state
                    section.style.display = '';
                    rows.forEach(row => {
                        row.style.display = '';
                        const nameEl = row.querySelector('.penal-name');
                        if (nameEl) nameEl.textContent = nameEl.textContent; // strip marks
                        // Also restore associated qty-row
                        const nextEl = row.nextElementSibling;
                        if (nextEl && nextEl.classList.contains('penal-qty-row')) {
                            nextEl.style.display = '';
                        }
                    });
                    if (defaultCollapsed) {
                        header.classList.add('collapsed');
                        body.classList.add('collapsed');
                    }
                    return;
                }

                let matchCount = 0;
                rows.forEach(row => {
                    const nameEl = row.querySelector('.penal-name');
                    // Always work from the raw text (strip any existing marks first)
                    const rawName = nameEl ? nameEl.textContent : '';
                    const matches = rawName.toLowerCase().includes(q);
                    row.style.display = matches ? '' : 'none';
                    // Sync visibility of associated qty-row
                    const nextEl = row.nextElementSibling;
                    if (nextEl && nextEl.classList.contains('penal-qty-row')) {
                        nextEl.style.display = matches ? '' : 'none';
                    }
                    if (matches) {
                        matchCount++;
                        totalVisible++;
                        if (nameEl) {
                            const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            nameEl.innerHTML = escapeHtml(rawName).replace(
                                new RegExp('(' + escapedQ + ')', 'gi'),
                                '<mark>$1</mark>'
                            );
                        }
                    } else {
                        if (nameEl) nameEl.innerHTML = escapeHtml(rawName);
                    }
                });

                if (matchCount === 0) {
                    section.style.display = 'none';
                } else {
                    section.style.display = '';
                    // Auto-expand category when results found
                    header.classList.remove('collapsed');
                    body.classList.remove('collapsed');
                }
            });

            if (countEl) {
                countEl.textContent = q ? `${totalVisible} résultat${totalVisible > 1 ? 's' : ''}` : '';
            }
        }

        input.addEventListener('input', applyFilter);

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                applyFilter();
                input.focus();
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GLOBAL SEARCH
    // ═══════════════════════════════════════════════════════════════════

    function initGlobalSearch() {
        const overlay = $('#searchOverlay');
        const input = $('#searchInput');
        const resultsEl = $('#searchResults');
        let selectedIdx = -1;
        let currentResults = [];

        function openSearch() {
            overlay.classList.add('active');
            input.value = '';
            selectedIdx = -1;
            currentResults = [];
            resultsEl.innerHTML = '<div class="search-empty">Tapez pour rechercher dans toute la base de données LSPD.</div>';
            setTimeout(() => input.focus(), 50);
        }

        function closeSearch() {
            overlay.classList.remove('active');
            input.value = '';
        }

        function highlight(text, query) {
            if (!query) return escapeHtml(text);
            const escaped = escapeHtml(text);
            const escapedQ = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return escaped.replace(new RegExp('(' + escapedQ + ')', 'gi'), '<mark>$1</mark>');
        }

        function getCategoryBadge(categoryName) {
            const map = {
                'Contraventions':  { cls: 'penal-contravention', label: 'Contravention' },
                'Délits Mineurs':  { cls: 'penal-delit-mineur',  label: 'Délit Mineur' },
                'Délits Majeurs':  { cls: 'penal-delit-majeur',  label: 'Délit Majeur' },
                'Crimes':          { cls: 'penal-crime',          label: 'Crime' }
            };
            return map[categoryName] || { cls: 'penal-contravention', label: categoryName };
        }

        function buildSearchIndex() {
            const index = [];

            // Penal code
            DB.penalCode.forEach((cat, catIdx) => {
                cat.items.forEach((item, itemIdx) => {
                    index.push({
                        type: 'penal',
                        category: cat.category,
                        catIdx,
                        itemIdx,
                        name: item.name,
                        fine: item.fine,
                        prison: item.prison || '-',
                        searchText: item.name.toLowerCase()
                    });
                });
            });

            // Status codes
            DB.statusCodes.forEach(s => {
                index.push({
                    type: 'radio',
                    name: s.code,
                    desc: s.desc,
                    searchText: (s.code + ' ' + s.desc).toLowerCase()
                });
            });

            // Types d'intervention (libellé clair uniquement, jamais le code interne)
            Object.entries(DB.tenCodes).forEach(([code, desc]) => {
                index.push({
                    type: 'inter',
                    name: desc,
                    desc: 'Type d\'intervention',
                    searchText: desc.toLowerCase()
                });
            });

            // Unit codes
            DB.units.forEach(u => {
                index.push({
                    type: 'unit',
                    name: u.code,
                    desc: u.desc,
                    searchText: (u.code + ' ' + u.desc).toLowerCase()
                });
            });

            return index;
        }

        const searchIndex = buildSearchIndex();

        function performSearch(query) {
            if (!query.trim()) return [];
            const q = query.trim().toLowerCase();
            return searchIndex
                .filter(entry => entry.searchText.includes(q))
                .slice(0, 40);
        }

        function navigateToModule(mod) {
            $$('.nav-link').forEach(l => l.classList.remove('active'));
            const link = $(`.nav-link[data-module="${mod}"]`);
            if (link) link.classList.add('active');
            $$('.module').forEach(m => m.classList.remove('active'));
            $(`#mod-${mod}`).classList.add('active');
        }

        function renderResults(results, query) {
            currentResults = results;
            selectedIdx = -1;

            if (results.length === 0) {
                resultsEl.innerHTML = '<div class="search-no-results">Aucun résultat pour cette recherche.</div>';
                return;
            }

            // Group results
            const groups = { penal: [], radio: [], inter: [], unit: [] };
            results.forEach(r => groups[r.type] && groups[r.type].push(r));

            let html = '';

            if (groups.penal.length > 0) {
                html += `<div class="search-group-header">§ Code Pénal — ${groups.penal.length} résultat(s)</div>`;
                groups.penal.forEach((r, i) => {
                    const badge = getCategoryBadge(r.category);
                    const prisonText = r.prison && r.prison !== '-' ? ` · Prison : ${r.prison}` : '';
                    html += `
                    <div class="search-result-item" data-index="${results.indexOf(r)}">
                        <span class="search-result-badge ${badge.cls}">${badge.label}</span>
                        <div class="search-result-info">
                            <div class="search-result-name">${highlight(r.name, query)}</div>
                            <div class="search-result-meta">
                                <span class="meta-fine">$${r.fine.toLocaleString('fr-FR')}</span>
                                <span class="meta-prison">${prisonText}</span>
                            </div>
                        </div>
                        <span class="search-result-action">→ Code Pénal</span>
                    </div>`;
                });
            }

            if (groups.radio.length > 0) {
                html += `<div class="search-group-header">📻 Codes Radio — ${groups.radio.length} résultat(s)</div>`;
                groups.radio.forEach(r => {
                    html += `
                    <div class="search-result-item" data-index="${results.indexOf(r)}">
                        <span class="search-result-badge radio-code">Code Radio</span>
                        <div class="search-result-info">
                            <div class="search-result-name">${highlight(r.name, query)}</div>
                            <div class="search-result-meta">${escapeHtml(r.desc)}</div>
                        </div>
                        <span class="search-result-action">→ Dashboard</span>
                    </div>`;
                });
            }

            if (groups.inter.length > 0) {
                html += `<div class="search-group-header">🚨 Interventions — ${groups.inter.length} résultat(s)</div>`;
                groups.inter.forEach(r => {
                    html += `
                    <div class="search-result-item" data-index="${results.indexOf(r)}">
                        <span class="search-result-badge ten-code">Intervention</span>
                        <div class="search-result-info">
                            <div class="search-result-name">${highlight(r.name, query)}</div>
                            <div class="search-result-meta">${escapeHtml(r.desc)}</div>
                        </div>
                        <span class="search-result-action">→ Rapport de Patrouille</span>
                    </div>`;
                });
            }

            if (groups.unit.length > 0) {
                html += `<div class="search-group-header">🚔 Indicatifs — ${groups.unit.length} résultat(s)</div>`;
                groups.unit.forEach(r => {
                    html += `
                    <div class="search-result-item" data-index="${results.indexOf(r)}">
                        <span class="search-result-badge unit-code">Indicatif</span>
                        <div class="search-result-info">
                            <div class="search-result-name">${highlight(r.name, query)}</div>
                            <div class="search-result-meta">${escapeHtml(r.desc)}</div>
                        </div>
                        <span class="search-result-action">→ Dashboard</span>
                    </div>`;
                });
            }

            html += `<div class="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Naviguer</span><span><kbd>Entrée</kbd> Sélectionner</span><span><kbd>Echap</kbd> Fermer</span></div>`;
            resultsEl.innerHTML = html;

            // Attach click listeners
            $$('.search-result-item', resultsEl).forEach(item => {
                item.addEventListener('click', () => {
                    const idx = parseInt(item.dataset.index, 10);
                    selectResult(results[idx]);
                });
            });
        }

        function selectResult(result) {
            closeSearch();
            if (result.type === 'penal') {
                navigateToModule('penal');
                // Expand the category and scroll to item
                setTimeout(() => {
                    const catHeaders = $$('#penalInfractions .penal-cat-header');
                    if (catHeaders[result.catIdx]) {
                        const header = catHeaders[result.catIdx];
                        const body = header.nextElementSibling;
                        if (header.classList.contains('collapsed')) {
                            header.classList.remove('collapsed');
                            body.classList.remove('collapsed');
                        }
                        // Find and highlight the row
                        const rows = $$('.penal-row', body);
                        const row = rows[result.itemIdx];
                        if (row) {
                            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            row.style.outline = '2px solid var(--primary)';
                            row.style.outlineOffset = '2px';
                            setTimeout(() => { row.style.outline = ''; row.style.outlineOffset = ''; }, 2500);
                        }
                    }
                }, 150);
            } else if (result.type === 'inter') {
                navigateToModule('patrol');
            } else {
                navigateToModule('dashboard');
            }
        }

        function updateSelection(items) {
            items.forEach((item, i) => {
                item.classList.toggle('active', i === selectedIdx);
                if (i === selectedIdx) item.scrollIntoView({ block: 'nearest' });
            });
        }

        // Open search button
        $('#btnOpenSearch').addEventListener('click', openSearch);

        // Close
        $('#btnCloseSearch').addEventListener('click', closeSearch);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

        // Keyboard shortcut Ctrl+K
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (overlay.classList.contains('active')) { closeSearch(); } else { openSearch(); }
            }
            if (!overlay.classList.contains('active')) return;

            const items = $$('.search-result-item', resultsEl);
            if (e.key === 'Escape') {
                closeSearch();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
                updateSelection(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIdx = Math.max(selectedIdx - 1, -1);
                updateSelection(items);
            } else if (e.key === 'Enter' && selectedIdx >= 0 && currentResults[selectedIdx]) {
                e.preventDefault();
                selectResult(currentResults[selectedIdx]);
            }
        });

        // Live search on input
        let searchTimeout = null;
        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const q = input.value.trim();
                if (!q) {
                    resultsEl.innerHTML = '<div class="search-empty">Tapez pour rechercher dans toute la base de données LSPD.</div>';
                    currentResults = [];
                    selectedIdx = -1;
                    return;
                }
                const results = performSearch(q);
                renderResults(results, q);
            }, 80);
        });
    }

    init();

})();

/* ═══════════════════════════════════════════════════════════════════════
   v3.1 — VISUAL POLISH RUNTIME (additif, isolé)
   - Sections form repliables (clic sur le titre)
   - Catégories de tags repliables (Narrative builder)
   - Indicateurs de remplissage (point vert) + section active (point or)
   - Barre d'outils par module : tout déplier/replier + progression
   - Auto-collapse intelligent au démarrage
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
    const $ = (sel, root = document) => (root || document).querySelector(sel);

    /* ---------- Détection "section remplie" ---------- */
    function isFormSectionFilled(section) {
        // Has any active tag-btn?
        if (section.querySelector('.tag-btn.active')) return true;
        // Has any text/number/date input with value?
        const inputs = $$('input, textarea, select', section);
        for (const el of inputs) {
            // Ignore les champs à valeur par défaut « fantôme » (quantité pénale = 1,
            // barre de filtre) qui feraient croire à tort qu'une étape est remplie.
            if (el.matches('.qty-input, .penal-search-input')) continue;
            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) return true;
            } else if (el.type === 'range') {
                // skip — defaults often non-zero
            } else if ((el.value || '').trim().length > 0) {
                return true;
            }
        }
        // Report output filled?
        const out = section.querySelector('.report-output');
        if (out && out.textContent.trim().length > 0 &&
            !out.querySelector('.placeholder-text')) return true;
        // Penal checked rows?
        if (section.querySelector('.penal-row input[type="checkbox"]:checked')) return true;
        return false;
    }

    function refreshFilledState(section) {
        if (!section) return;
        const filled = isFormSectionFilled(section);
        section.classList.toggle('fs-filled', filled);
        // Build/refresh inline summary when filled & collapsed
        let sum = section.querySelector(':scope > .fs-summary');
        if (filled) {
            const tags = $$('.tag-btn.active', section).map(b => b.dataset.tag || b.textContent.trim()).filter(Boolean);
            const checks = $$('.penal-row input[type="checkbox"]:checked', section).length;
            const inputCount = $$('input, textarea', section).filter(i =>
                i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'range' &&
                !i.matches('.qty-input, .penal-search-input') &&
                (i.value || '').trim().length > 0
            ).length;
            const parts = [];
            if (tags.length) parts.push(tags.slice(0, 5).join(' · ') + (tags.length > 5 ? ` +${tags.length - 5}` : ''));
            if (checks) parts.push(`${checks} infraction(s)`);
            if (inputCount && !tags.length) parts.push(`${inputCount} champ(s) renseigné(s)`);
            const text = parts.join(' — ') || 'Section renseignée';
            if (!sum) {
                sum = document.createElement('div');
                sum.className = 'fs-summary';
                // Place right after h3
                const h3 = section.querySelector(':scope > h3');
                if (h3 && h3.nextSibling) section.insertBefore(sum, h3.nextSibling);
                else section.appendChild(sum);
            }
            sum.textContent = text;
        } else if (sum) {
            sum.remove();
        }
    }

    /* ---------- Helpers : ne traiter que les form-sections « simples » ---------- */
    function enhancedSections(moduleEl) {
        // Exclut les ops-modules (qui ont un <label> et pas un <h3>) et tout
        // ce qui n'a pas d'h3 direct.
        return $$(':scope > .form-section', moduleEl).filter(s =>
            !s.classList.contains('ops-module') && !!s.querySelector(':scope > h3')
        );
    }

    /* ---------- Collapsibles : form-section ---------- */
    function makeSectionsCollapsible(moduleEl) {
        enhancedSections(moduleEl).forEach(sec => {
            sec.classList.add('fs-enhanced');
            const h3 = sec.querySelector(':scope > h3');
            if (!h3 || h3.dataset.fsBound) return;
            h3.dataset.fsBound = '1';
            h3.addEventListener('click', e => {
                if (e.target !== h3 && !e.target.matches('h3, h3 *')) return;
                // Accordéon : une seule section ouverte à la fois. Ouvrir une
                // section referme les autres (flux guidé, une chose à la fois).
                const willOpen = sec.classList.contains('fs-collapsed');
                if (willOpen) {
                    enhancedSections(moduleEl).forEach(s => { if (s !== sec) s.classList.add('fs-collapsed'); });
                    sec.classList.remove('fs-collapsed');
                    requestAnimationFrame(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                } else {
                    sec.classList.add('fs-collapsed');
                }
                refreshFilledState(sec);
            });
        });
    }

    /* ---------- Collapsibles : tag-category (Narrative builder) ---------- */
    function decorateTagCategories(moduleEl) {
        $$('.tag-category', moduleEl).forEach(cat => {
            const h4 = cat.querySelector(':scope > h4');
            if (!h4 || h4.dataset.tcBound) return;
            h4.dataset.tcBound = '1';

            // Strip leading "| " from titles for a cleaner look (visual)
            if (h4.firstChild && h4.firstChild.nodeType === 3) {
                h4.firstChild.nodeValue = h4.firstChild.nodeValue.replace(/^\s*\|\s*/, '');
            }

            const count = document.createElement('span');
            count.className = 'tc-count';
            count.textContent = '0';
            const chev = document.createElement('span');
            chev.className = 'tc-chevron';
            chev.textContent = '⌃';
            h4.appendChild(count);
            h4.appendChild(chev);

            h4.addEventListener('click', () => {
                cat.classList.toggle('tc-collapsed');
            });
        });
    }

    function refreshTagCategoryCounts(moduleEl) {
        $$('.tag-category', moduleEl).forEach(cat => {
            const active = $$('.tag-btn.active', cat).length;
            cat.classList.toggle('tc-has-active', active > 0);
            const count = cat.querySelector(':scope > h4 > .tc-count');
            if (count) count.textContent = String(active);
        });
    }

    /* ---------- Toolbar par module : déplier/replier + progression ---------- */
    function ensureToolbar(moduleEl) {
        if (moduleEl.querySelector(':scope > .fs-toolbar')) return;
        const sections = enhancedSections(moduleEl);
        if (sections.length < 3) return;

        const bar = document.createElement('div');
        bar.className = 'fs-toolbar';
        bar.innerHTML = `
            <span class="fs-progress">
                <span class="fs-progress-text">0 / ${sections.length}</span>
                <span class="fs-progress-bar"></span>
            </span>
            <span class="fs-toolbar-info">Une étape à la fois — cliquez un titre pour l'ouvrir</span>
            <button type="button" data-fs-action="focus-next">Étape suivante ↓</button>
        `;
        // Insert juste après le module-header
        const header = moduleEl.querySelector(':scope > .module-header');
        if (header && header.nextSibling) moduleEl.insertBefore(bar, header.nextSibling);
        else moduleEl.insertBefore(bar, moduleEl.firstChild);

        bar.addEventListener('click', e => {
            const btn = e.target.closest('button[data-fs-action]');
            if (!btn) return;
            const secs = enhancedSections(moduleEl);
            if (btn.dataset.fsAction === 'focus-next') {
                // Étape suivante : première non-remplie encore fermée, sinon la
                // première fermée. Accordéon : on ferme toutes les autres.
                const next = secs.find(s => s.classList.contains('fs-collapsed') && !s.classList.contains('fs-filled'))
                          || secs.find(s => s.classList.contains('fs-collapsed'))
                          || secs[0];
                if (next) {
                    secs.forEach(s => { if (s !== next) s.classList.add('fs-collapsed'); });
                    next.classList.remove('fs-collapsed');
                    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    flashActive(next);
                }
            }
            refreshToolbar(moduleEl);
        });
    }

    function flashActive(section) {
        $$('.fs-active').forEach(s => { if (s !== section) s.classList.remove('fs-active'); });
        section.classList.add('fs-active');
        clearTimeout(section._fsActiveTimer);
        section._fsActiveTimer = setTimeout(() => section.classList.remove('fs-active'), 2200);
    }

    function refreshToolbar(moduleEl) {
        const bar = moduleEl.querySelector(':scope > .fs-toolbar');
        if (!bar) return;
        const secs = enhancedSections(moduleEl);
        const filled = secs.filter(s => s.classList.contains('fs-filled')).length;
        const txt = bar.querySelector('.fs-progress-text');
        const bb = bar.querySelector('.fs-progress-bar');
        if (txt) txt.textContent = `${filled} / ${secs.length}`;
        if (bb) bb.style.setProperty('--fs-pct', `${(filled / Math.max(secs.length, 1)) * 100}%`);
    }

    /* ---------- Auto-collapse initial : accordéon, seule la 1re ouverte ---------- */
    function autoCollapseInitial(moduleEl) {
        const sections = enhancedSections(moduleEl);
        if (sections.length <= 1) return;
        sections.forEach((s, i) => {
            refreshFilledState(s);
            if (i === 0) s.classList.remove('fs-collapsed');
            else s.classList.add('fs-collapsed');
        });
    }

    /* ---------- Refresh global d'un module ---------- */
    function refreshModule(moduleEl) {
        if (!moduleEl) return;
        enhancedSections(moduleEl).forEach(refreshFilledState);
        refreshTagCategoryCounts(moduleEl);
        refreshAllNarrativeGroups(moduleEl);
        refreshToolbar(moduleEl);
    }

    /* ---------- Init par module ---------- */
    function initModule(moduleEl) {
        if (!moduleEl || moduleEl.dataset.vpInit) return;
        moduleEl.dataset.vpInit = '1';
        makeSectionsCollapsible(moduleEl);
        decorateTagCategories(moduleEl);
        initNarrativeGroups(moduleEl);
        ensureToolbar(moduleEl);
        autoCollapseInitial(moduleEl);
        refreshModule(moduleEl);

        // Réagit aux changements
        const debounced = debounce(() => refreshModule(moduleEl), 120);
        ['click', 'input', 'change'].forEach(ev =>
            moduleEl.addEventListener(ev, debounced, true));
    }

    function debounce(fn, ms) {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    /* ---------- Narrative Builder Groups ---------- */
    function initNarrativeGroups(moduleEl) {
        if (!moduleEl) return;
        $$('.nb-group', moduleEl).forEach(group => {
            const titleEl = group.querySelector('.nb-group-title');
            if (!titleEl || titleEl.dataset.nbBound) return;
            titleEl.dataset.nbBound = '1';
            titleEl.addEventListener('click', () => {
                group.classList.toggle('nb-collapsed');
                refreshNarrativeGroupCount(group);
            });
            refreshNarrativeGroupCount(group);
        });
    }

    function refreshNarrativeGroupCount(group) {
        const count = $$('.tag-btn.active', group).length;
        const badge = group.querySelector('.nb-group-count');
        if (badge) badge.textContent = String(count);
        group.classList.toggle('nb-has-active', count > 0);
    }

    function refreshAllNarrativeGroups(moduleEl) {
        if (!moduleEl) return;
        $$('.nb-group', moduleEl).forEach(refreshNarrativeGroupCount);
    }

    /* ---------- Boot ---------- */
    function boot() {
        $$('main#mainContent > section.module').forEach(initModule);

        // Quand on change de module via la nav, init le nouveau si pas déjà fait
        document.addEventListener('click', e => {
            const link = e.target.closest('.nav-link[data-module]');
            if (!link) return;
            setTimeout(() => {
                const id = 'mod-' + link.dataset.module;
                const mod = document.getElementById(id);
                if (mod) {
                    initModule(mod);
                    refreshModule(mod);
                }
            }, 60);
        });

        // Raccourcis clavier : Alt+E déplier, Alt+R replier
        document.addEventListener('keydown', e => {
            if (!e.altKey) return;
            const mod = $('main#mainContent > section.module.active');
            if (!mod) return;
            if (e.key === 'e' || e.key === 'E') {
                e.preventDefault();
                enhancedSections(mod).forEach(s => s.classList.remove('fs-collapsed'));
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                enhancedSections(mod).forEach(s => s.classList.add('fs-collapsed'));
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();


