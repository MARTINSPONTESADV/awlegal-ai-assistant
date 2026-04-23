/**
 * AW ECO — Configuração central por tenant.
 *
 * Cada deploy do AW ECO é um "tenant" (um advogado/escritório).
 * Toda customização por tenant passa por variáveis de ambiente VITE_*
 * definidas no Vercel/host de cada deploy — o código-fonte é o mesmo.
 *
 * Ver .env.example para a lista completa de variáveis suportadas.
 */

export type SubsystemKey = "system" | "crm" | "pre" | "fin";

const DEFAULT_FEATURES: SubsystemKey[] = ["system", "crm", "pre", "fin"];

function parseFeatures(raw: string | undefined): SubsystemKey[] {
  if (!raw) return DEFAULT_FEATURES;
  const valid = new Set<SubsystemKey>(DEFAULT_FEATURES);
  const parsed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is SubsystemKey => valid.has(s as SubsystemKey));
  return parsed.length > 0 ? parsed : DEFAULT_FEATURES;
}

export const appConfig = {
  /** Nome do produto exibido no header, sidebar, títulos de aba */
  name: import.meta.env.VITE_APP_NAME || "AW ECO",

  /** Tagline curta abaixo do nome no sidebar (ex: "Ecossistema", "Gestão Jurídica") */
  tagline: import.meta.env.VITE_APP_TAGLINE || "Ecossistema",

  /** Nome do escritório/empresa (copyright, documentos gerados, etc.) */
  officeName: import.meta.env.VITE_OFFICE_NAME || "AW LEGALTECH",

  /**
   * Sub-sistemas habilitados — controla quais cubos aparecem no HomeHub
   * e quais seções aparecem no AppSidebar. CSV: "system,crm,pre,fin".
   *
   * Default: todos os 4 habilitados.
   */
  features: parseFeatures(import.meta.env.VITE_FEATURES),

  /**
   * URL do logo customizado (opcional). Se não definido, usa o ícone
   * padrão Scale do lucide-react.
   */
  logoUrl: import.meta.env.VITE_LOGO_URL || null,

  /** Ano de referência pro copyright (default: ano atual) */
  copyrightYear: import.meta.env.VITE_COPYRIGHT_YEAR || new Date().getFullYear(),
} as const;

/** Verifica se um sub-sistema está habilitado neste tenant */
export function isFeatureEnabled(key: SubsystemKey): boolean {
  return appConfig.features.includes(key);
}

/** Default landing após login: primeiro sub-sistema habilitado, ou /home */
export function getDefaultLandingRoute(): string {
  return "/home";
}
