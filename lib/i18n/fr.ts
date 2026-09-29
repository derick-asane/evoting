import type { Dictionary } from "./index";

/**
 * Typed as `Dictionary`, so a key missing here is a build error rather than a
 * page that silently falls back to English.
 */
export const fr: Dictionary = {
  locale: {
    name: "Français",
    switchTo: "Switch to English",
  },

  brand: {
    name: "Campus Ballot",
    tagline:
      "Chaque bulletin est inscrit dans le contrat propre à ce scrutin. Les résultats affichés ici sont relus depuis la chaîne, jamais depuis une base de données.",
  },

  nav: {
    universitySignIn: "Espace université",
    createAccount: "Créer un compte",
    results: "Résultats",
    verify: "Vérifier un bulletin",
    studentSignIn: "Connexion étudiant",
    signOut: "Se déconnecter",
    skipToContent: "Aller au contenu principal",
  },

  footer: {
    oneStudent: "Un étudiant",
    oneStudentDetail: "une voix, garantie par la chaîne",
    secretBallot: "Vote secret",
    secretBallotDetail: "identité et choix dissociés",
    openCount: "Dépouillement ouvert",
    openCountDetail: "chacun peut recompter le registre",
  },

  home: {
    badge: "Vote secret · Dépouillement public",
    titleLead: "Des élections étudiantes que",
    titleAccent: "votre campus peut vérifier",
    lead: "Chaque université organise son scrutin dans son propre contrat, administré depuis son propre portefeuille. Les étudiants votent avec un identifiant ordinaire — sans portefeuille, sans cryptomonnaie — et repartent avec un reçu qui prouve que leur bulletin a été compté exactement tel qu'ils l'ont déposé.",
    createAccount: "Créer un compte université",
    signIn: "Espace université",
    statInstitutions: "Établissements",
    statBallots: "Bulletins sur la chaîne",
    statAlterable: "Bulletins modifiables par nous",
    institutionsEyebrow: "En ligne sur la plateforme",
    institutionsTitle: "Établissements organisant un scrutin",
    institutionsLead:
      "Ouvrez un établissement pour voir son bulletin, son décompte en cours et le registre complet des voix déposées.",
    noUniversities: "Aucune université n'est encore inscrite.",
    createFirst: "Créez le premier compte",
    createFirstTail: "pour organiser un scrutin.",
    noElection: "Aucun scrutin configuré pour l'instant.",
    trustEyebrow: "Le modèle de confiance",
    trustTitle: "Ce que le contrat garantit",
    trustLead:
      "Non pas des promesses de ce site, mais des règles appliquées par la chaîne, quoi que fasse ce site.",
    guaranteeOneTitle: "Un étudiant, une voix",
    guaranteeOneRule: "castVote rejette tout doublon",
    guaranteeOneBody:
      "Un second bulletin du même étudiant est refusé par le contrat, et non filtré par notre code. Il n'existe aucune version que nous pourrions discrètement modifier le soir du scrutin.",
    guaranteeSecretTitle: "Votre choix reste le vôtre",
    guaranteeSecretRule: "deux enregistrements, aucun lien entre eux",
    guaranteeSecretBody:
      "Qui a voté et ce qui a été choisi sont inscrits séparément. La liste prouve la participation ; elle ne révèle jamais une préférence. Seul votre reçu relie les deux, et vous seul le détenez.",
    guaranteeCountTitle: "Chacun peut recompter",
    guaranteeCountRule: "chaque bulletin est un événement public",
    guaranteeCountBody:
      "L'urne complète est lisible par tous. Faites le total vous-même : si votre décompte diffère du résultat publié, c'est le résultat publié qui est faux.",
  },

  phase: {
    setup: "Préparation",
    registration: "Inscriptions ouvertes",
    voting: "Scrutin ouvert",
    ended: "Clos",
    setupDescription:
      "Les candidats sont en cours d'ajout. Le bulletin n'est pas encore définitif.",
    registrationDescription:
      "Les étudiants éligibles sont ajoutés à la liste. Le vote n'a pas commencé.",
    votingDescription:
      "Les étudiants inscrits peuvent déposer leur bulletin dès maintenant.",
    endedDescription: "Le scrutin est clos et le résultat est définitif.",
  },

  common: {
    candidates: "Candidats",
    onTheRoll: "Étudiants inscrits",
    ballotsCast: "Bulletins déposés",
    turnout: "Participation",
    votes: "voix",
    vote: "voix",
    viewResults: "Voir les résultats",
    castBallot: "Déposer votre bulletin",
    signInToVote: "Se connecter pour voter",
    working: "En cours…",
    electionContract: "Contrat du scrutin",
    noElectionYet: "n'a pas encore configuré de scrutin.",
    of: "sur",
  },

  auth: {
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    secureNotice:
      "Votre mot de passe ne quitte jamais ce serveur et n'y est conservé que sous forme d'empreinte salée.",
    studentEyebrow: "Accès étudiant",
    universityEyebrow: "Commission électorale",
    panelStudentTitle: "Votre voix, et la preuve qu'elle a compté.",
    panelStudentPoint1:
      "Un seul bulletin par étudiant, refusé par le contrat en cas de seconde tentative.",
    panelStudentPoint2:
      "Rien sur la chaîne ne relie votre nom à votre choix.",
    panelStudentPoint3:
      "Vous repartez avec un reçu qui prouve comment votre bulletin a été enregistré.",
    panelUniversityTitle:
      "Organisez un scrutin que personne n'a besoin de croire sur parole.",
    panelUniversityPoint1:
      "Votre propre portefeuille déploie et administre chacun de vos scrutins.",
    panelUniversityPoint2:
      "Même les exploitants de la plateforme ne peuvent modifier votre bulletin ni votre décompte.",
    panelUniversityPoint3:
      "Étudiants, presse et candidats peuvent recompter le résultat eux-mêmes.",
    accountMenu: "Menu du compte",
    signOutQuestion: "Se déconnecter de cet appareil ?",
    signOutBody:
      "Votre bulletin et votre reçu ne sont pas affectés. Vous pouvez vous reconnecter à tout moment.",
    confirmSignOut: "Oui, me déconnecter",
    cancel: "Annuler",
    signedOutTitle: "Vous êtes déconnecté",
    signedOutBody:
      "Tout ce que vous avez déjà soumis figure sur la chaîne et n'est pas affecté. Conservez votre code de reçu en lieu sûr.",
    signBackIn: "Se reconnecter",
    backHome: "Retour au scrutin",
  },

  student: {
    signInTitle: "Connexion étudiant",
    signInLead:
      "Utilisez le numéro étudiant figurant sur votre carte {university}.",
    tabSignIn: "Se connecter",
    tabActivate: "Activer le compte",
    studentId: "Numéro étudiant",
    password: "Mot de passe",
    choosePassword: "Choisissez un mot de passe",
    confirmPassword: "Confirmez le mot de passe",
    activationCode: "Code d'activation",
    activateHint:
      "Le code que votre commission électorale vous a remis contre votre carte d'étudiant.",
    activateNoCode:
      "Pas de code ? Demandez-le à votre commission électorale. Votre numéro étudiant seul ne suffit pas à ouvrir un compte : n'importe qui peut le lire sur votre carte.",
    passwordHint: "Au moins 8 caractères.",
    activateSubmit: "Activer et continuer",
    signedInAs: "Connecté en tant que",
    candidatesFor: "Candidats à la présidence cette année.",
    noCandidates: "Aucun candidat n'a encore été ajouté au bulletin.",
  },

  ballot: {
    title: "Votre bulletin",
    hint: "Choisissez un candidat pour chaque poste. Vous pouvez laisser un poste en blanc.",
    legend: "Candidats au poste de {position}",
    abstain: "Laisser en blanc — aucune voix pour ce poste",
    submit: "Déposer mon bulletin",
    submitting: "Inscription de votre bulletin sur la chaîne…",
    finalWarning:
      "La validation inscrit tous vos choix dans le contrat du scrutin en une seule transaction. C'est définitif.",
    confirmLabel: "Confirmez avec votre mot de passe",
    confirmHint:
      "Redemandé ici parce qu'être connecté ne prouve pas que c'est bien vous qui votez.",
    recordedTitle: "Bulletin enregistré",
    recordedLead: "Votre bulletin figure sur la chaîne dans le bloc {block}.",
    yourChoices: "Vos choix",
    leftBlank: "Laissés en blanc : {positions}",
    partiallyVoted:
      "Vous avez déjà voté pour certains postes. Seuls les postes qu'il vous reste à pourvoir sont affichés.",
    receiptTitle: "Conservez votre code de reçu dès maintenant",
    receiptBody:
      "Il n'est affiché qu'une fois et n'est stocké nulle part. C'est le seul moyen de vérifier comment votre bulletin a été enregistré — et la seule chose pouvant vous relier à votre choix : gardez-le pour vous.",
    transaction: "Transaction",
    copyReceipt: "Copier le code",
    copiedReceipt: "Copié",
    downloadReceipt: "Télécharger",
    verifyMine: "Vérifier mon bulletin",
    seeCount: "Voir le décompte",
    alreadyVotedTitle: "Votre bulletin est déjà dans l'urne",
    alreadyVotedBody:
      "La chaîne enregistre un seul bulletin pour votre numéro étudiant : vous ne pouvez pas voter à nouveau. Si vous avez conservé votre reçu, vous pouvez confirmer que votre choix a été enregistré exactement tel que vous l'avez exprimé.",
    verifyWithReceipt: "Vérifier avec mon reçu",
    seeRunningCount: "Voir le décompte en cours",
    votingClosed: "Le scrutin est clos. Le résultat est définitif.",
    votingNotOpen:
      "Le scrutin n'est pas encore ouvert. Revenez lorsque votre commission aura ouvert les urnes.",
    checkInNeededTitle: "Enregistrez-vous d'abord au bureau",
    notOnRoll:
      "Votre compte est actif, mais votre commission électorale ne vous a pas encore inscrit sur la liste enregistrée sur la chaîne. Cela se fait généralement peu avant l'ouverture du scrutin — revenez bientôt.",
    departedTitle: "Vous n'êtes plus inscrit comme étudiant en cours de scolarité",
    departedBody:
      "Votre dossier vous indique comme {status} : vous ne figurez pas sur la liste de ce scrutin et ne pouvez pas y voter. Tout bulletin déposé pendant votre scolarité reste sur la chaîne, reste compté, et reste vérifiable avec son reçu.",
    verifyPast: "Vérifier un ancien bulletin",
  },

  results: {
    liveCount: "Décompte en direct",
    finalResult: "Résultat définitif",
    lead: "{title} · lu directement depuis le contrat du scrutin à chaque chargement de cette page.",
    presidentElect: "Président élu",
    leading: "En tête",
    tied: "Égalité",
    byCandidate: "Décompte par candidat",
    stillOpen:
      "Le scrutin est encore ouvert : ces chiffres continueront d'évoluer.",
    closed: "Le scrutin est clos. Ces chiffres ne peuvent plus changer.",
    noCandidates: "Aucun candidat sur le bulletin pour l'instant.",
    ballotBox: "L'urne",
    ballotBoxHint:
      "Tous les bulletins acceptés par le contrat, du plus récent au plus ancien. Aucune entrée ne nomme un étudiant.",
    reconciles:
      "Recomptage conforme : {logged} bulletins dans le registre, {tallied} comptés sur l'ensemble des candidats.",
    mismatch:
      "Incohérence : {logged} bulletins dans le registre mais {tallied} comptés. Vérifiez avant de vous fier à ce résultat.",
    noBallots: "Aucun bulletin déposé pour l'instant.",
    positionsLabel: "Postes",
    recountTitle: "Recomptez vous-même",
    recountHint: "Ne croyez pas cette page sur parole. Cette commande lit directement le contrat et reconstruit chaque total à partir des enregistrements bruts, sans utiliser le code de ce site ni accéder à sa base de données. Si elle contredit les chiffres ci-dessus, ce sont ces chiffres qui sont faux.",
    recountRun: "À exécuter depuis le dossier du projet :",
    recountChecks: "Elle vérifie que les totaux correspondent au registre des bulletins, que chaque bulletin provient d'un électeur inscrit, et qu'aucun enregistrement ne permet de remonter à la personne qui l'a déposé.",
    downloadTitle: "Procès-verbal officiel",
    downloadHint: "Chaque chiffre est relu depuis le contrat au moment du téléchargement. Le document provisoire évolue avec les voix ; il devient définitif à la clôture du scrutin.",
    downloadCsv: "Télécharger le tableau (CSV)",
    downloadPdf: "Télécharger le procès-verbal (PDF)",
    provisionalNote: "Le scrutin est encore ouvert : ce document est marqué provisoire.",
    position: "Poste",
    elected: "Élu",
    reconcilesByPosition:
      "Recomptage conforme : {lines} lignes de bulletin dans le registre, et chaque poste totalise le même nombre.",
    mismatchByPosition:
      "Incohérence entre les lignes enregistrées et les totaux comptés. Vérifiez avant de vous fier à ce résultat.",
    receipt: "Reçu",
    choice: "Choix",
    block: "Bloc",
    recorded: "Enregistré",
    showingRecent: "Affichage des 50 bulletins les plus récents sur {total}.",
    source: "Source : événements {event} émis par",
  },

  verify: {
    title: "Vérifier un bulletin",
    lead: "Collez le code de reçu qui vous a été remis après le vote pour voir exactement comment votre bulletin a été enregistré dans {election}.",
    leadAnyElection:
      "Collez le code de reçu qui vous a été remis après le vote. Il est vérifié auprès de tous les scrutins organisés par ce bureau : un code d'une année précédente fonctionne toujours.",
    searchesCount: "Recherche dans {count} scrutins.",
    foundIn: "Enregistré dans {election}.",
    receiptCode: "Code de reçu",
    submit: "Rechercher mon bulletin",
    checking: "Consultation de la chaîne…",
    foundTitle: "Ce bulletin figure bien sur la chaîne.",
    foundBody: "Il a été enregistré comme une voix pour {candidate}.",
    foundWarning:
      "Si ce n'est pas le choix que vous avez exprimé, contactez immédiatement votre commission électorale et conservez ce code.",
  },

  university: {
    signUpTitle: "Créer un compte université",
    signUpLead:
      "L'inscription génère un portefeuille appartenant à votre établissement. Vos scrutins sont déployés et administrés depuis celui-ci : personne parmi les exploitants de cette plateforme ne peut ajouter de candidat à votre bulletin ni clore votre scrutin.",
    institutionName: "Nom de l'établissement",
    institutionNameHint:
      "Utilisé pour votre adresse publique de scrutin, par ex. /u/universite-de-riverside.",
    contactEmail: "Adresse e-mail de contact",
    contactEmailHint: "Elle vous servira à vous connecter.",
    adminPassword: "Mot de passe administrateur",
    adminPasswordHint: "Au moins 10 caractères.",
    confirmPassword: "Confirmez le mot de passe",
    creating: "Création de votre portefeuille sur la chaîne…",
    createAccount: "Créer le compte",
    alreadyRegistered: "Déjà inscrit ?",
    signIn: "Se connecter",
    signInTitle: "Espace université",
    signInLead: "Réservé aux membres de la commission électorale.",
    signingIn: "Connexion…",
    noAccount: "Pas encore de compte ?",
    createOne: "Créez-en un",
  },

  console: {
    title: "Console de la commission",
    publicPageAt: "page publique à",
    leaveConsole: "Se déconnecter",
    startElection: "Lancer un scrutin",
    startElectionHint:
      "Ceci déploie un nouveau contrat, signé par le portefeuille de votre établissement. C'est le scrutin lui-même.",
    electionTitle: "Intitulé du scrutin",
    electionTitleHint: "Par exemple : Président du bureau des étudiants 2026",
    deploy: "Déployer le contrat du scrutin",
    deploying: "Déploiement du contrat…",
    walletTitle: "Portefeuille du compte",
    walletHint: "Le portefeuille de votre établissement sur la chaîne.",
    walletBody:
      "Les scrutins que vous créez sont déployés depuis cette adresse, ce qui en fait le seul compte habilité à les administrer.",
    studentsListed: "Étudiants recensés",
    onChainRoll: "Liste sur la chaîne",
    contract: "Contrat",
    administeredBy: "Administré par",
    stage: "Étape du scrutin",
    stageHint: "Chaque étape est irréversible et appliquée par le contrat.",
    stepSetup: "Préparation",
    stepRegistration: "Inscriptions",
    stepVoting: "Scrutin",
    stepClosed: "Clos",
    openRegistration: "Sceller le bulletin, ouvrir les inscriptions",
    openRegistrationWarning:
      "Plus aucun candidat ne pourra être ajouté ensuite.",
    openVoting: "Sceller la liste, ouvrir le scrutin",
    openVotingWarning:
      "Plus aucun étudiant ne pourra être ajouté à la liste ensuite.",
    openVotingPending:
      "{count} étudiants activés doivent encore être inscrits sur la liste. Ils en seront exclus.",
    closePolls: "Clore le scrutin",
    closePollsWarning:
      "Le vote s'arrête immédiatement et le résultat devient définitif.",
    submitting: "Envoi à la chaîne…",
    finished: "Le scrutin est clos. Plus rien ne peut être modifié.",
    addPosition: "Ajouter un poste",
    addPositionHint: "Les postes que ce scrutin pourvoit — Président, Trésorier, etc. Ajoutez-les avant les candidats.",
    positionTitle: "Intitulé du poste",
    positionsStat: "Postes",
    standingFor: "Se présente au poste de",
    noCandidatesYet: "Aucun candidat pour ce poste pour l'instant.",
    addCandidate: "Ajouter un candidat",
    addCandidateHint: "Possible uniquement pendant la phase de préparation.",
    candidateName: "Nom complet",
    candidateParty: "Liste ou slogan",
    candidateManifesto: "Programme (une ou deux lignes)",
    add: "Ajouter",
    adding: "Ajout…",
    ballot: "Bulletin",
    studentsTitle: "Étudiants éligibles",
    studentsHint:
      "L'éligibilité est conservée ici, hors chaîne. Seule une empreinte salée d'un étudiant activé parvient au contrat.",
    pasteRoster: "Collez la liste",
    rosterHint:
      "Un par ligne : NUMÉRO, Nom complet, Filière. Ajoutez un quatrième champ (enrolled / graduated / withdrawn) pour définir le statut ; par défaut, inscrit.",
    addToList: "Ajouter à la liste d'éligibilité",
    endOfYear: "Fin d'année",
    endOfYearBody:
      "Signalez les étudiants qui ont quitté l'établissement. Ils conservent leur compte et chaque bulletin déjà déposé reste valide et vérifiable, mais ils ne seront inscrits sur aucune liste de scrutin à venir — ils ne pourront donc plus voter.",
    updateStatus: "Mettre à jour le statut",
    updating: "Mise à jour…",
    notEnrolledCount: "{count} étudiants actuellement non inscrits",
    activatedSummary:
      "{activated} étudiants inscrits sur {total} ont activé un compte.",
    pendingSummary:
      "{count} d'entre eux ne figurent pas encore sur la liste enregistrée sur la chaîne.",
    allOnRoll:
      "Tous les étudiants éligibles figurent sur la liste enregistrée sur la chaîne.",
    writeRoll: "Inscrire les étudiants activés sur la liste",
    writingRoll: "Écriture sur la chaîne…",
    onlyDuringRegistration:
      "Possible uniquement pendant l'ouverture des inscriptions.",
    emptyRollBlock:
      "Inscrivez d'abord au moins un étudiant sur la liste. L'ouverture du scrutin scelle définitivement la liste, et un scrutin dont la liste est vide ne pourra jamais accepter de bulletin.",
    confirmLockout:
      "Je comprends que {count} étudiants activés seront définitivement exclus de ce scrutin.",
    colStudentId: "Numéro étudiant",
    colName: "Nom",
    colStatus: "Statut",
    statusOnRoll: "Sur la liste",
    statusActivated: "Activé",
    statusNotActivated: "Non activé",
  },

  archive: {
    navLabel: "Scrutins passés",
    title: "Scrutins",
    lead: "Tous les scrutins organisés par ce bureau, du plus récent au plus ancien. Les résultats passés restent consultables, et les reçus passés restent vérifiables, tant que les contrats existent.",
    empty: "Aucun scrutin n'a encore été déployé.",
    current: "En cours",
    deployedOn: "Déployé le {date}",
    unreachable: "Chaîne injoignable",
    seePast: "Voir les scrutins passés",
  },

  union: {
    navLabel: "Bureau",
    title: "Votre bureau des étudiants",
    lead: "Les personnes qui dirigent le bureau, du président aux membres. Consultez-le avant de voter.",
    empty: "La composition du bureau n'a pas encore été publiée.",
    reportsTo: "Sous la responsabilité de",
    membersCount: "{count} membres",
    seeTeam: "Découvrir le bureau",
    manageTitle: "Bureau des étudiants",
    manageHint:
      "Publié sur vos pages publiques pour que les votants sachent qui dirige le bureau avant de voter. Purement informatif — rien ici n'affecte l'éligibilité ni le décompte.",
    memberName: "Nom complet",
    memberRole: "Fonction",
    memberBio: "Courte présentation",
    memberParent: "Sous la responsabilité de",
    memberParentNone: "Personne (sommet de l'organigramme)",
    memberPhoto: "Photo",
    addMember: "Ajouter un membre",
    addingMember: "Ajout…",
    removeMember: "Retirer",
    removeWarning:
      "Retirer une personne retire également toutes celles qui dépendent d'elle.",
    noMembers: "Aucun membre du bureau n'a encore été ajouté.",
  },

  security: {
    forgotPassword: "Mot de passe oublié ?",
    resetTitle: "Définir un nouveau mot de passe",
    resetLead:
      "Demandez un code de réinitialisation à votre commission électorale, en personne et avec votre carte d'étudiant. Saisissez-le ensuite ici.",
    resetCode: "Code de réinitialisation",
    resetCodeHint:
      "Douze caractères, en trois groupes, par ex. K3MP-7QXR-9TFA.",
    resetSubmit: "Définir le mot de passe",
    resetDone:
      "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.",
    issueTitle: "Réinitialisation des mots de passe",
    issueHint:
      "Générez un code à usage unique pour un étudiant qui ne peut pas se connecter. Vérifiez d'abord sa carte d'étudiant — ce code permet à quiconque le détient de reprendre le compte.",
    issueStudentId: "Numéro étudiant",
    issueCode: "Générer un code",
    issuing: "Génération…",
    activationTitle: "Codes d'activation",
    activationHint:
      "Un numéro étudiant est imprimé sur une carte : ce n'est pas un secret, il ne peut donc pas suffire à ouvrir un compte. Chaque étudiant a besoin d'un code que vous lui remettez contre sa carte avant de pouvoir définir un mot de passe et voter.",
    activationIssue: "Imprimer les codes des étudiants non activés",
    activationWarning:
      "Affiché une seule fois. Imprimez ou téléchargez cette feuille maintenant : après avoir quitté cette page, les codes ne peuvent plus être récupérés, seulement réémis.",
    activationDownload: "Télécharger la feuille (CSV)",
    activationPrint: "Imprimer la feuille",
    activationCount: "{count} codes",
    activationColumnStudent: "Étudiant",
    activationColumnId: "Numéro",
    activationColumnCode: "Code",
    auditTitle: "Journal d'activité",
    auditHint:
      "Toutes les actions de la commission, dans l'ordre. La chaîne enregistre ce qui arrive aux bulletins ; ceci enregistre ce qu'a fait la commission.",
    auditEmpty: "Aucune activité enregistrée pour l'instant.",
    auditWhen: "Quand",
    auditWho: "Qui",
    auditWhat: "Quoi",
  },

  photo: {
    label: "Photo",
    hint: "JPEG, PNG ou WebP, jusqu'à 4 Mo. Affichée aux votants sur le bulletin.",
    change: "Changer la photo",
    upload: "Téléverser",
    uploading: "Téléversement…",
    none: "Pas de photo",
    ofCandidate: "Photo de {name}",
  },

  enrolment: {
    enrolled: "Inscrit",
    graduated: "Diplômé",
    withdrawn: "Radié",
    reEnrolled: "Réinscrit",
  },

  checkIn: {
    title: "Bureau d'enregistrement",
    backToConsole: "Retour à la console",
    navLabel: "Bureau d'enregistrement",
    noElection: "Aucun scrutin ne permet encore d'enregistrer des étudiants.",
    notSupervised:
      "Ce scrutin n'est pas supervisé : les étudiants peuvent voter sans être enregistrés. Activez la supervision dans la console pour que ce bureau serve à quelque chose.",
    notVoting:
      "Les urnes ne sont pas ouvertes. Vous pouvez enregistrer des étudiants, mais leurs bulletins seront refusés tant que le vote n'a pas commencé.",
    deskTitle: "Autoriser un étudiant à voter",
    deskHint:
      "Comparez la photo de la carte d'étudiant à la personne devant vous, puis saisissez son numéro. C'est la seule étape de tout le système qu'un mot de passe volé ou prêté ne permet pas de franchir.",
    studentId: "Numéro étudiant",
    checkIn: "Enregistrer",
    checkingIn: "Enregistrement…",
    cardReminder:
      "Regardez la carte, pas l'écran du téléphone. Un étudiant qui a confié son mot de passe à quelqu'un d'autre est invisible pour toutes les autres vérifications : c'est celle-ci qui le détecte.",
    logTitle: "Aujourd'hui à ce bureau",
    logHint:
      "Chaque enregistrement, et par qui. Un bulletin contesté remonte à un membre nommé de la commission, à une minute connue.",
    logTally: "{issued} enregistrés · {used} ont voté",
    logEmpty: "Personne n'a encore été enregistré.",
    logWhen: "Quand",
    logStudent: "Étudiant",
    logBy: "Enregistré par",
    logState: "État",
    stateOpen: "Autorisé",
    stateVoted: "A voté",
    stateExpired: "Expiré",
    consoleTitle: "Vote supervisé",
    consoleHint:
      "Avec cette option, un étudiant doit être enregistré au bureau contre sa carte d'étudiant avant de pouvoir voter. C'est le seul contrôle qui fonctionne encore lorsqu'un étudiant a donné son mot de passe de son plein gré — ce que rien d'autre ne peut détecter.",
    consoleOn: "Activé — un enregistrement est requis pour voter",
    consoleOff: "Désactivé — un mot de passe suffit pour voter",
    consoleEnable: "Exiger l'enregistrement",
    consoleDisable: "Ne plus exiger l'enregistrement",
    consoleOpenDesk: "Ouvrir le bureau d'enregistrement",
  },

  notification: {
    votingOpenTitle: "Le scrutin est ouvert : {election}",
    votingOpenBody:
      "Les urnes sont ouvertes et vous figurez sur la liste. Connectez-vous pour déposer votre bulletin.",
    votingClosedTitle: "Le scrutin est clos : {election}",
    votingClosedBody:
      "Les urnes sont closes et le résultat est définitif. Vous pouvez consulter le décompte.",
    ballotCastTitle: "Un bulletin a été déposé en votre nom",
    ballotCastBody:
      "Un bulletin a été déposé pour {election} le {when}. Si ce n'était pas vous, prévenez immédiatement votre commission électorale : quelqu'un d'autre connaît votre mot de passe.",
    goToBallot: "Accéder à mon bulletin",
    viewResult: "Voir le résultat",
  },

  errors: {
    enterCredentials: "Saisissez votre numéro étudiant et votre mot de passe.",
    confirmWithPassword:
      "Saisissez votre mot de passe pour confirmer qu'il s'agit bien de vous.",
    wrongPasswordToVote:
      "Ce mot de passe est incorrect. Votre bulletin n'a pas été déposé.",
    needCheckIn:
      "Ce scrutin est supervisé. Présentez votre carte d'étudiant au bureau de la commission électorale pour être enregistré, puis revenez : votre enregistrement dure 15 minutes.",
    ballotFailedCheckInAgain:
      "Votre bulletin n'a pas pu être enregistré et votre enregistrement a été consommé. Rien n'a été comptabilisé. Présentez-vous à nouveau au bureau de la commission.",
    checkInUnknown:
      "Aucun étudiant portant ce numéro ne figure dans les registres de cette université.",
    checkInNotEnrolled:
      "Cet étudiant n'est pas inscrit actuellement et ne peut pas être enregistré.",
    checkInNotOnRoll:
      "Cet étudiant ne figure pas sur la liste électorale de ce scrutin. Inscrivez-le d'abord, sinon le contrat le refusera.",
    checkInAlreadyOpen:
      "Cet étudiant a déjà un enregistrement en cours. Attendez qu'il soit utilisé ou qu'il expire avant d'en délivrer un autre.",
    passwordsDoNotMatch: "Les deux mots de passe ne correspondent pas.",
    unknownUniversity: "Université inconnue.",
    badCredentials: "Numéro étudiant ou mot de passe incorrect.",
    badEmailOrPassword: "Adresse e-mail ou mot de passe incorrect.",
    enterEmailAndPassword:
      "Saisissez votre adresse e-mail et votre mot de passe.",
    choosePassword: "Choisissez un mot de passe administrateur.",
    sessionExpired:
      "Votre session a expiré. Reconnectez-vous pour voter.",
    noElectionSelected: "Aucun scrutin sélectionné.",
    wrongUniversity: "Ce scrutin n'appartient pas à votre université.",
    selectCandidate: "Sélectionnez un candidat avant de valider.",
    invalidCandidate: "Ce candidat n'est pas valide.",
    votingNotOpenNow: "Le scrutin n'est pas encore ouvert.",
    votingClosedNow: "Le scrutin est clos pour cette élection.",
    notOnRollYet:
      "Vous ne figurez pas encore sur la liste électorale. Votre commission électorale y inscrit les étudiants activés avant l'ouverture du scrutin.",
    alreadyVoted:
      "Nos registres indiquent que vous avez déjà voté à ce scrutin.",
    departed:
      "Votre dossier vous indique comme {status} : vous ne pouvez pas voter à ce scrutin. Les bulletins déposés pendant votre scolarité restent valides et vérifiables.",
    ballotFailed:
      "Le bulletin n'a pas pu être enregistré sur la chaîne. Rien n'a été compté — veuillez réessayer.",
    badReceipt:
      "Cela ne ressemble pas à un code de reçu. Il commence par 0x suivi de 64 caractères.",
    receiptNotFoundAnywhere:
      "Aucun bulletin, dans aucun scrutin de cette université, ne porte ce reçu. Vérifiez la saisie — le code doit être copié à l'identique.",
    receiptNotFound:
      "Aucun bulletin de ce scrutin ne porte ce reçu. Vérifiez la saisie — le code doit être copié à l'identique.",
    unknownElection: "Scrutin inconnu.",
    notAuthorised: "Non autorisé.",
    candidateNeedsName: "Un candidat doit avoir un nom.",
    positionNeedsTitle:
      "Un poste doit avoir un intitulé, par exemple Président.",
    pickPosition: "Choisissez le poste pour lequel ce candidat se présente.",
    chooseAtLeastOne:
      "Choisissez un candidat pour au moins un poste, sans quoi vous n'avez pas voté.",
    pasteStudents: "Collez au moins un étudiant.",
    noUsableLines:
      "Aucune ligne exploitable. Format : NUMÉRO, Nom complet, Filière",
    listStudentIds: "Indiquez au moins un numéro étudiant.",
    unknownStatus: "Statut d'inscription inconnu.",
    unknownPhase: "Étape inconnue.",
    giveTitle: "Donnez un intitulé au scrutin.",
    photoTooLarge:
      "Cette image dépasse 4 Mo. Veuillez utiliser un fichier plus petit.",
    photoUnsupported:
      "Ce fichier n'est pas une image prise en charge. Utilisez JPEG, PNG ou WebP.",
    photoEmpty: "Choisissez un fichier image à téléverser.",
    memberNeedsName: "Un membre du bureau doit avoir un nom complet.",
    memberNeedsRole:
      "Un membre du bureau doit avoir une fonction, par exemple Président.",
    memberBadParent: "Cette personne ne figure pas dans ce bureau.",
    memberNotFound: "Ce membre du bureau n'existe plus.",
    tooManyAttempts:
      "Trop de tentatives échouées. Par sécurité, réessayez dans {minutes} minutes.",
    enterCodeAndPassword:
      "Saisissez votre code et choisissez un mot de passe.",
    resetBadCode: "Ce code n'est pas valide. Vérifiez-le et réessayez.",
    resetExpired:
      "Ce code a expiré. Demandez-en un nouveau à la commission.",
    resetUsed: "Ce code de réinitialisation a déjà été utilisé.",
    activateCodeUsed:
      "Ce code d'activation a déjà été utilisé. Si ce n'est pas vous qui l'avez utilisé, prévenez immédiatement votre commission électorale.",
    resetStudentNotFound:
      "Aucun étudiant portant ce numéro ne figure dans les registres de cette université.",
  },

  reasons: {
    activatePasswordShort:
      "Choisissez un mot de passe d'au moins 8 caractères.",
    signUpNameTooShort: "Saisissez le nom complet de l'établissement.",
    signUpBadSlug: "Ce nom ne peut pas être converti en adresse web.",
    signUpBadEmail: "Saisissez une adresse e-mail de contact valide.",
    signUpPasswordShort:
      "Choisissez un mot de passe administrateur d'au moins 10 caractères.",
    signUpNameTaken:
      "Un compte existe déjà pour un établissement portant ce nom.",
    signUpEmailTaken: "Cette adresse e-mail est déjà enregistrée.",
    signUpChainUnreachable:
      "La chaîne du scrutin est injoignable : le compte n'a pas été créé. Vérifiez que le nœud fonctionne, puis réessayez.",
  },

  notices: {
    candidateAdded: "{name} a été ajouté au bulletin.",
    positionAdded: "Poste « {title} » ajouté.",
    studentsAdded: "{added} étudiants ajoutés à la liste d'éligibilité",
    studentsSkipped: ", {skipped} ignorés (déjà recensés).",
    rollWritten:
      "{count} étudiants inscrits sur la liste enregistrée sur la chaîne.",
    allAlreadyOnRoll:
      "Tous les étudiants activés figurent déjà sur la liste enregistrée sur la chaîne.",
    registrationOpen: "Bulletin scellé. Les inscriptions sont ouvertes.",
    votingOpen: "Liste scellée. Le scrutin est ouvert.",
    pollsClosed: "Scrutin clos. Le résultat est définitif.",
    studentsNotified: "{count} étudiants notifiés.",
    statusUpdated: "{count} étudiants marqués comme {status}.",
    notFound: " Introuvables : {ids}.",
    deployed: "« {title} » déployé à l'adresse {address}.",
    photoUpdated: "Photo mise à jour.",
    memberAdded: "{name} a été ajouté au bureau.",
    memberRemoved:
      "Membre retiré, ainsi que toutes les personnes qui dépendaient de lui.",
    resetIssued:
      "Code de réinitialisation pour {name} : {code} — valable 24 heures, à usage unique. Remettez-le en personne ; il ne sera plus affiché.",
    activationIssued:
      "{count} code(s) d'activation émis, valables jusqu'au {date}. Les codes imprimés auparavant ne fonctionnent plus.",
    activationNoneNeeded:
      "Tous les étudiants inscrits ont déjà défini un mot de passe. Aucun code n'a été émis.",
    supervisionOn:
      "Le vote supervisé est activé. Les étudiants doivent désormais être enregistrés au bureau avant de pouvoir voter.",
    supervisionOff:
      "Le vote supervisé est désactivé. Un numéro étudiant et un mot de passe suffisent désormais pour voter.",
    checkedIn: "{name} peut voter pendant les {minutes} prochaines minutes.",
  },

  chain: {
    notAdmin:
      "Le portefeuille de ce compte n'administre pas ce contrat de scrutin.",
    wrongPhase: "Le scrutin a déjà dépassé cette étape.",
    noCandidates: "Ajoutez d'abord au moins un candidat.",
    alreadyRegistered: "L'un de ces étudiants figure déjà sur la liste.",
    emptyValue: "Un champ obligatoire est vide.",
    rejected: "La chaîne a rejeté l'opération : {error}.",
    deployFailed:
      "Le contrat du scrutin n'a pas pu être déployé. Vérifiez que la chaîne est accessible et que le portefeuille de l'université dispose de gaz.",
  },
};
