// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Header from "@/app/components/Header";
import fetchApi from "@/app/api/apiHelper";

const negotiationGenerateUrl = (linkId: string) =>
  `/negotiation/generate/${linkId}`;

interface PublicConfig {
  testing_mode: boolean;
  owner_email?: string;
  inbox_url?: string;
}

const fallbackPublicConfig: PublicConfig = {
  testing_mode: false,
};

const content = {
  EN: {
    testingBanner: "TESTING ENVIRONMENT",
    copy: "Copy",
    copied: "Copied!",
    csdccTitle: "CS-DCC helps you share data with custom agreements",
    csdccBody1:
      "Members of the CS-DCC data hub can, as data owners, streamline their information gathering processes for determining if, when, and how to share research data.",
    csdccBody2:
      "Develop the questionnaires and associated conditions templates together with the CS-DCC team and run them on CS-DCC infrastructure. Now potential data users can follow your custom links, answer questions and help you manage the flow of your data.",
    forOwners: "For Data Owners",
    ownersBody:
      "A data owner can generate questions and conditions templates when they want to share research data. Members of the CS-DCC Data Hub can create a Data Owner account. ",
    emailUs: "Email us",
    ownersBody2:
      " to begin set up your account or to have help creating questions and conditions templates.",
    ownerDashboard: "View your owner dashboard",
    forRequestors: "For Data Requestors",
    requestorsBody:
      "A data requestor is requesting access to data. A requestor answers of series of questions posed by a data owner when asking for access to research data.",
    requestorDashboard: "View your requestor dashboard",
    forAdmins: "For Administrators",
    adminsBody: "System administrators can access system-wide statistics, health monitoring, and administrative functions. Admin access is restricted to authorized email addresses.",
    adminDashboard: "View admin dashboard",
    headerTitle: "Semantic Engine",
    headerSubtitle: "Agreements",
    headerHelp: "Helping share your work",
    headerDesc:
      "Describe in custom terms how you want to make your work available",
    supportedBy: "Supported by",
    attentionCard: {
      title: "Attention Testers",
      intro: "All test emails are routed to the shared inbox:",
      inboxLabel: "Open Inbox",
      stepsTitle: "Testing Steps",
      steps: [
        {
          title: "Begin Questionnaire",
          desc: "Start your test by selecting one of the questionnaire:",
          links: [
            // {
            //   label: "Questionnaire_prototype1-23-A-cow",
            //   url: negotiationGenerateUrl(
            //     "e540b3a9-b26e-435f-aff4-19bfa23a21cb"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype1-23-B-pig",
            //   url: negotiationGenerateUrl(
            //     "8ce1026c-e41c-4a03-a0a1-ede1a1630e5e"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype2-23-A-cow",
            //   url: negotiationGenerateUrl(
            //     "14ca6112-935e-4c9c-91ea-f6f92bfffe33"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype2-23-B-pig",
            //   url: negotiationGenerateUrl(
            //     "3ef65781-f2ed-4a4e-a7bb-d85d21e79ae4"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype3",
            //   url: negotiationGenerateUrl(
            //     "fd603604-8934-4282-892b-87a1fe1f8dc8"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype4",
            //   url: negotiationGenerateUrl(
            //     "36681bc2-0654-4a06-8a38-8d829298d8ee"
            //   ),
            // },
            {
              label: "Basic Data Request",
              url: negotiationGenerateUrl(
                "75cb9450-01af-40b2-9cd5-e7fb0d82b59d"
              ),
            },
            {
              label: "Detailed Data Request",
              url: negotiationGenerateUrl(
                "b5c921ba-7108-44bf-9870-9e4126cd8f9a"
              ),
            },
            {
              label: "Research ODRL Agreement",
              url: negotiationGenerateUrl(
                "c4e8a1b0-7f3d-4a92-9e16-2b8d5c0f1a77"
              ),
            },
          ],
        },
        {
          title: "Verify Your Email as a Requestor",
          desc: "Use the sandbox email inbox to verify your identity as a requestor.\n Any email works.\n<em><u>Important</u></em>: use the <em>same email</em> later to log in to the dashboard if you want to see your negotiation history for that address.",
        },

        {
          title: "Submit Responses",
          desc: "Complete the questionnaire and submit.",
        },
        {
          title: "Owner Email Review",
          desc: "Verify using <em><u>{{OWNER_EMAIL}}</u></em> in the sandbox email to review all questionnaire responses. <em>For testing, this is the only valid owner email—other emails will not show owner-side history.</em>",
        },
        {
          title: "Make a Decision",
          desc: "Based on the responses, choose one:",
          options: [
            "Accept responses.",
            "Request additional feedback (send the questionnaire back).",
            "Reject (clearly state reasons).",
          ],
        },
        {
          title: "Interactive Communication",
          desc: "Notifications to both requestor and owner in the sandbox inbox simulate their email exchange. (Sending emails from this inbox is disabled.)",
        },
        {
          title: "Automatic Conditions Generation",
          desc: "Once responses are accepted, a conditions document is automatically generated.",
        },
        {
          title: "Review Generated Conditions",
          desc: "View the generated conditions document attached in the sandbox email sent to the <em><u>{{OWNER_EMAIL}}</u></em>.",
        },
      ],
      dashboardTitle: "Dashboard Overview and Alternative Testing Method",
      dashboardPoints: [
        "Use the Dashboard to track everything easily.",
        "Review submitted questions, responses, negotiation history, and the negotiation status.",
        "Access summary statistics of all requests handled by the owner.",
        "Optional: Extended Dashboard Testing\nFor experienced users, questionnaires and review processes can be managed directly through the dashboard, eliminating reliance solely on email links.",
      ],
      dashboardSubPoints: [
        "Log in as the requestor with the <em>same email</em> you used to answer the questionnaire to view your negotiation history and communications.",
        "Log in as the owner with <em><u>{{OWNER_EMAIL}}</u></em>.\n <em>For testing, this is the only valid owner email—other emails will not show owner-side history.</em>",
      ],
    },
  },
  FR: {
    testingBanner: "ENVIRONNEMENT DE TEST",
    copy: "Copier",
    copied: "Copié !",
    csdccTitle:
      "Le CS-DCC vous aide à partager des données avec des accords personnalisés",
    csdccBody1:
      "Les membres du CS-DCC Data Hub peuvent, en tant que propriétaires de données, rationaliser leurs processus de collecte d'informations pour déterminer si, quand et comment partager des données de recherche.",
    csdccBody2:
      "Développez les questionnaires et les modèles de conditions associés avec l'équipe CS-DCC et exécutez-les sur l'infrastructure CS-DCC. Désormais, les utilisateurs potentiels de données peuvent suivre vos liens personnalisés, répondre aux questions et vous aider à gérer le flux de vos données.",
    forOwners: "Pour les propriétaires de données",
    ownersBody:
      "Un propriétaire de données peut générer des questions et des modèles de conditions lorsqu'il souhaite partager des données de recherche. Les membres du CS-DCC Data Hub peuvent créer un compte propriétaire de données. ",
    emailUs: "Envoyez-nous un courriel",
    ownersBody2:
      " pour commencer à configurer votre compte ou pour obtenir de l'aide pour créer des questions et des modèles de conditions.",
    ownerDashboard: "Voir votre tableau de bord propriétaire",
    forRequestors: "Pour les demandeurs de données",
    requestorsBody:
      "Un demandeur de données demande l'accès à des données. Un demandeur répond à une série de questions posées par un propriétaire de données lors de la demande d'accès à des données de recherche.",
    requestorDashboard: "Voir votre tableau de bord demandeur",
    forAdmins: "Pour les administrateurs",
    adminsBody: "Les administrateurs système peuvent accéder aux statistiques à l'échelle du système, à la surveillance de la santé et aux fonctions administratives. L'accès administrateur est restreint aux adresses e-mail autorisées.",
    adminDashboard: "Voir le tableau de bord administrateur",
    headerTitle: "Moteur Sémantique",
    headerSubtitle: "Accords",
    headerHelp: "Aider à partager votre travail",
    headerDesc:
      "Décrivez selon des termes personnalisés comment vous souhaitez rendre votre travail disponible",
    supportedBy: "Soutenu par",
    attentionCard: {
      title: "Attention Testeurs",
      intro: "Tous les e-mails de test sont redirigés vers la boîte de réception partagée :",
      inboxLabel: "Ouvrir la boîte de réception",
      stepsTitle: "Étapes de test",
      steps: [
        {
          title: "Commencer le questionnaire",
          desc: "Cliquez sur un lien ci-dessous pour démarrer votre questionnaire :",
          links: [
            // {
            //   label: "Questionnaire_prototype1-23-A-cow",
            //   url: negotiationGenerateUrl(
            //     "e540b3a9-b26e-435f-aff4-19bfa23a21cb"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype1-23-B-pig",
            //   url: negotiationGenerateUrl(
            //     "8ce1026c-e41c-4a03-a0a1-ede1a1630e5e"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype2-23-A-cow",
            //   url: negotiationGenerateUrl(
            //     "14ca6112-935e-4c9c-91ea-f6f92bfffe33"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype2-23-B-pig",
            //   url: negotiationGenerateUrl(
            //     "3ef65781-f2ed-4a4e-a7bb-d85d21e79ae4"
            //   ),
            // },
            // {
            //   label: "Nouveau questionnaire de test",
            //   url: negotiationGenerateUrl(
            //     "fd603604-8934-4282-892b-87a1fe1f8dc8"
            //   ),
            // },
            // {
            //   label: "Questionnaire_prototype4",
            //   url: negotiationGenerateUrl(
            //     "36681bc2-0654-4a06-8a38-8d829298d8ee"
            //   ),
            // },
            {
              label: "Demande de données de base",
              url: negotiationGenerateUrl(
                "75cb9450-01af-40b2-9cd5-e7fb0d82b59d"
              ),
            },
            {
              label: "Demande de données détaillées",
              url: negotiationGenerateUrl(
                "b5c921ba-7108-44bf-9870-9e4126cd8f9a"
              ),
            },
            {
              label: "Accord ODRL de recherche",
              url: negotiationGenerateUrl(
                "c4e8a1b0-7f3d-4a92-9e16-2b8d5c0f1a77"
              ),
            },
          ],
        },
        {
          title: "Vérifier l'e-mail",
          desc: "Utilisez la boîte de réception sandbox pour vérifier votre identité en tant que demandeur.\n N'importe quel e-mail fonctionne.\n<em><u>Important</u></em> : utilisez le <em>même e-mail</em> plus tard pour vous connecter au tableau de bord si vous voulez voir votre historique de négociation pour cette adresse.",
        },
        {
          title: "Soumettre les réponses",
          desc: "Répondez au questionnaire et soumettez vos réponses.",
        },
        {
          title: "Revue de l'e-mail du propriétaire",
          desc: "Vérifiez en utilisant <em><u>{{OWNER_EMAIL}}</u></em> dans l'e-mail sandbox pour examiner toutes les réponses au questionnaire. <em>Pour les tests, c'est le seul e-mail de propriétaire valide—les autres e-mails ne montreront pas l'historique côté propriétaire.</em>",
        },
        {
          title: "Prendre une décision",
          desc: "En fonction des réponses, choisissez une option :",
          options: [
            "Accepter les réponses.",
            "Demander des commentaires supplémentaires en renvoyant le questionnaire.",
            "Rejeter en précisant clairement les raisons.",
          ],
        },
        {
          title: "Communication interactive",
          desc: "Simulez la communication entre le propriétaire et le demandeur dans la sandbox email. (Remarque : L'envoi d'e-mails depuis cette boîte de réception est désactivé.)",
        },
        {
          title: "Génération automatique des conditions",
          desc: "Une fois les réponses acceptées, un document de conditions est généré automatiquement.",
        },
        {
          title: "Revoir les conditions générées",
          desc: "Consultez le document de conditions généré en pièce jointe dans l'e-mail envoyé au <em><u>{{OWNER_EMAIL}}</u></em>.",
        },
      ],
      dashboardTitle:
        "Aperçu du tableau de bord et méthode de test alternative",
      dashboardPoints: [
        "Utilisez le tableau de bord pour tout suivre facilement.",
        "Consultez les questions soumises, les réponses, l'historique des négociations et le statut de la négociation.",
        "Accédez aux statistiques récapitulatives de toutes les demandes traitées par le propriétaire.",
        "Optionnel : Test étendu via le tableau de bord\nPour les utilisateurs expérimentés, les questionnaires et les processus de révision peuvent être gérés directement via le tableau de bord, sans dépendre uniquement des liens e-mail.",
      ],
      dashboardSubPoints: [
        "Connectez-vous en tant que demandeur avec le <em>même e-mail</em> que vous avez utilisé pour répondre au questionnaire pour voir votre historique de négociation et vos communications.",
        "Connectez-vous en tant que propriétaire avec <em><u>{{OWNER_EMAIL}}</u></em>.\n <em>Pour les tests, c'est le seul e-mail de propriétaire valide—les autres e-mails ne montreront pas l'historique côté propriétaire.</em>",
      ],
    },
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<"EN" | "FR">("EN");
  const [copied, setCopied] = useState<{ field: string; status: boolean }>({
    field: "",
    status: false,
  });
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const t = content[lang];

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetchApi("/drt/public-config/");
        if (!response.ok) {
          if (!cancelled) {
            setConfig(fallbackPublicConfig);
          }
          return;
        }
        const data: PublicConfig = await response.json();
        if (!cancelled) {
          setConfig(data);
        }
      } catch {
        if (!cancelled) {
          setConfig(fallbackPublicConfig);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);
  const handleCopy = (value: string, field: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied({ field, status: true });
        setTimeout(() => setCopied({ field: "", status: false }), 1200);
      });
    } else {
      // Fallback for insecure context or unsupported browsers
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied({ field, status: true });
        setTimeout(() => setCopied({ field: "", status: false }), 1200);
      } catch {
        // Optionally show an error
      }
      document.body.removeChild(textArea);
    }
  };

  // Helper function to render text with HTML formatting. The {{OWNER_EMAIL}}
  // token is substituted with the sandbox owner email from the backend config.
  const renderFormattedText = (text: string) => {
    const resolved = text.replaceAll(
      "{{OWNER_EMAIL}}",
      config?.owner_email ?? ""
    );
    return <span dangerouslySetInnerHTML={{ __html: resolved }} />;
  };
  return (
    <main className="min-h-dvh bg-white flex flex-col">
      {config?.testing_mode && (
        <div className="w-full bg-white text-red-700 text-center py-1 sm:py-2 font-bold text-sm sm:text-lg tracking-widest sticky top-0 z-50">
          {t.testingBanner}
        </div>
      )}
      {/* Header Bar */}
      <Header
        title={t.headerTitle}
        subtitle={t.headerSubtitle}
        helpTitle={t.headerHelp}
        helpDesc={t.headerDesc}
        languageDropdown={{
          currentLang: lang,
          onLangChange: setLang,
        }}
      />
      <div className="flex flex-col items-center w-full px-2 sm:px-4 py-6 sm:py-8 md:py-10">
        <div className="max-w-3xl w-full">
          {/* Attention Testers Card */}

          <h1 className="text-[rgb(70,160,35)] font-sans text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">
            {t.csdccTitle}
          </h1>
          <p className="text-gray-700 font-serif text-sm sm:text-base mb-3 sm:mb-4">
            {t.csdccBody1}
          </p>
          <p className="text-gray-700 font-serif text-sm sm:text-base mb-6 sm:mb-8">
            {t.csdccBody2}
          </p>

          {config?.testing_mode && (
          <div className="bg-red-200 rounded-md p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-black font-bold text-lg sm:text-xl mb-2">
              {t.attentionCard.title}
            </h2>
            <div className="pl-4 sm:pl-6 md:pl-8">
              <p className="text-black mb-2 font-medium text-sm sm:text-base">
                {t.attentionCard.intro}
              </p>
              {config.inbox_url ? (
                <div className="bg-white border border-red-300 rounded p-3 sm:p-4 mt-2 mb-4 flex items-center gap-2">
                  <a
                    href={config.inbox_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[rgb(70,160,35)] font-medium text-sm sm:text-base"
                  >
                    {t.attentionCard.inboxLabel}
                  </a>
                </div>
              ) : null}
              <h3 className="text-base sm:text-lg font-bold text-black mt-4 sm:mt-6 mb-2">
                {t.attentionCard.stepsTitle}
              </h3>
              <ol className="list-decimal list-inside text-black mb-4 space-y-2 text-sm sm:text-base">
                {t.attentionCard.steps.map((step, idx) => (
                  <li key={idx}>
                    <b>{step.title}</b>
                    {step.desc && (
                      <div className="pl-2 sm:pl-4 mt-1">
                        {renderFormattedText(step.desc)}
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="bg-white border border-red-300 rounded p-3 sm:p-4 mt-2 ml-2 sm:ml-4">
                        <div className="mb-1 flex items-center flex-wrap gap-1 sm:gap-2">
                          <span className="font-medium text-sm sm:text-base">
                            {lang === "EN"
                              ? "Owner Email:"
                              : "E-mail du propriétaire :"}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1 sm:gap-2">
                          <span className="font-mono select-all text-sm sm:text-base">
                            {config.owner_email ?? ""}
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(config.owner_email ?? "", "owner-email")
                            }
                            disabled={!config.owner_email}
                            className="flex items-center gap-1 px-1 sm:px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none text-gray-700 disabled:opacity-50"
                            title={t.copy}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3 h-3 sm:w-4 sm:h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                                className="fill-white"
                              />
                              <rect
                                x="3"
                                y="3"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                            </svg>
                            <span className="text-xs">
                              {copied.field === "owner-email" && copied.status
                                ? t.copied
                                : t.copy}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                    {step.links && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {step.links.map((link, lidx) => (
                          <li key={lidx}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-[rgb(70,160,35)] text-sm sm:text-base"
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.options && (
                      <ul className="list-disc list-inside pl-2 sm:pl-4 mt-1">
                        {step.options.map((opt, oidx) => (
                          <li key={oidx} className="text-sm sm:text-base">{opt}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
              <h3 className="text-base sm:text-lg font-bold text-black mt-6 sm:mt-8 mb-2">
                {t.attentionCard.dashboardTitle}
              </h3>
              <ul className="list-disc list-inside text-black mb-2 pl-2 sm:pl-4 space-y-1 text-sm sm:text-base">
                {t.attentionCard.dashboardPoints.map((point, pidx) => (
                  <li key={pidx}>
                    {renderFormattedText(point)}
                    {pidx === 0 && t.attentionCard.dashboardSubPoints && (
                      <ul className="list-disc list-inside mt-2 ml-2 sm:ml-4 space-y-1">
                        {t.attentionCard.dashboardSubPoints.map(
                          (subPoint, spidx) => (
                            <li key={spidx} className="text-sm sm:text-base">{renderFormattedText(subPoint)}</li>
                          )
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          )}

          {/* Data Owners Card */}
          <div className="bg-[rgba(180,230,160,0.3)] border-2 border-[rgb(55,125,28)] rounded-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="font-sans text-lg sm:text-xl md:text-2xl text-black mb-3 sm:mb-4">
              {t.forOwners}
            </h2>
            <div className="pl-4 sm:pl-6 md:pl-8">
              <p className="font-sans text-sm sm:text-base text-gray-800 mb-2">
                {t.ownersBody}
                <a
                  href="mailto:adc@uoguelph.ca"
                  className="underline text-[rgb(70,160,35)] hover:text-[rgb(55,125,28)]"
                >
                  {t.emailUs}
                </a>
                {t.ownersBody2}
              </p>

              <a
                href="/negotiation/owner/homepage"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[rgb(70,160,35)] hover:text-[rgb(55,125,28)] underline text-lg sm:text-xl md:text-2xl font-sans mt-6 sm:mt-8"
              >
                {t.ownerDashboard}
              </a>
            </div>
          </div>
          {/* Data Requestors Card */}
          <div className="bg-[rgba(180,230,160,0.3)] border-2 border-[rgb(55,125,28)] rounded-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="font-sans text-lg sm:text-xl md:text-2xl text-black mb-3 sm:mb-4">
              {t.forRequestors}
            </h2>
            <div className="pl-4 sm:pl-6 md:pl-8">
              <p className="font-sans text-sm sm:text-base text-gray-800 mb-4">
                {t.requestorsBody}
              </p>
              <a
                href="/negotiation/homepage"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[rgb(70,160,35)] hover:text-[rgb(55,125,28)] underline text-lg sm:text-xl md:text-2xl font-sans mt-6 sm:mt-8"
              >
                {t.requestorDashboard}
              </a>
            </div>
          </div>
          {/* Administrators Card */}
          <div className="bg-[rgba(180,230,160,0.2)] border-2 border-[rgb(55,125,28)] rounded-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="font-sans text-lg sm:text-xl md:text-2xl text-black mb-3 sm:mb-4">
              {t.forAdmins}
            </h2>
            <div className="pl-4 sm:pl-6 md:pl-8">
              <p className="font-sans text-sm sm:text-base text-gray-800 mb-4">
                {t.adminsBody}
              </p>
              <a
                href="/admin/email-entry"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[rgb(70,160,35)] hover:text-[rgb(55,125,28)] underline text-lg sm:text-xl md:text-2xl font-sans mt-6 sm:mt-8"
              >
                {t.adminDashboard}
              </a>
            </div>
          </div>
        </div>
      </div>
      <hr className="w-full border-t border-gray-300 my-0" />

      {/* Footer Logos */}
      <footer className="container-default section-y pt-4 sm:pt-6">
        <div className="grid gap-4 sm:gap-6 md:gap-8 lg:gap-12 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))] sm:[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] items-end">
          <div className="flex flex-col items-center gap-3 sm:gap-4 md:gap-6">
            <span className="text-sm sm:text-base text-black font-sans">
              {t.supportedBy}
            </span>
            <Image
              src="/research-excellent-fund.png"
              alt="Research Excellence Fund"
              width={140}
              height={48}
              className="object-contain w-20 sm:w-28 md:w-32 lg:w-36"
            />
          </div>

          <a
            href="https://www.genomecanada.ca/"
            target="_blank"
            rel="noopener noreferrer"
            className="justify-self-center"
          >
            <Image
              src="/R.jpg"
              alt="Genome Canada"
              width={140}
              height={48}
              className="object-contain w-20 sm:w-28 md:w-32 lg:w-36"
            />
          </a>

          <a
            href="https://www.ontario.ca/page/government-ontario"
            target="_blank"
            rel="noopener noreferrer"
            className="justify-self-center"
          >
            <Image
              src="/OMAFA.PNG"
              alt="Government of Ontario"
              width={140}
              height={48}
              className="object-contain w-20 sm:w-28 md:w-32 lg:w-36"
            />
          </a>
        </div>
      </footer>
    </main>
  );
}
