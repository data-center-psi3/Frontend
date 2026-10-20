import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  Scale,
  Cloud,
  BookOpen,
  GraduationCap,
  Cuboid,
} from "lucide-react";
import type { NavigationItem } from "../components/layout/Shell";
export const navigation: NavigationItem[] = [
  {
    path: "/",
    title: "Visão geral",
    icon: LayoutDashboard,
    description:
      "Uma visão integrada da infraestrutura digital e de suas evidências ambientais.",
  },
  {
    path: "/indicadores",
    title: "Indicadores ambientais",
    icon: BarChart3,
    description:
      "Explore energia, água, emissões e outras dimensões da sustentabilidade digital.",
  },
  {
    path: "/mapa",
    title: "Mapa de data centers",
    icon: MapPin,
    description:
      "Conheça as instalações e explore sua distribuição no território.",
  },
  {
    path: "/comparacao",
    title: "Comparação",
    icon: Scale,
    description:
      "Coloque os dados em perspectiva, com unidades e períodos compatíveis.",
  },
  {
    path: "/beneficios",
    title: "Benefícios",
    icon: Cloud,
    description:
      "A contribuição tecnológica, social e econômica da infraestrutura digital.",
  },
  {
    path: "/por-dentro",
    title: "Aprenda e simule",
    icon: Cuboid,
    description:
      "Conheça os sistemas de um data center e explore cenários hipotéticos de energia e água.",
  },
  {
    path: "/fontes",
    title: "Fontes e metodologia",
    icon: BookOpen,
    description:
      "Conheça a origem dos dados, as referências e os limites da análise.",
  },
  {
    path: "/sobre",
    title: "Sobre o projeto",
    icon: GraduationCap,
    description:
      "Uma iniciativa acadêmica para compreender a sustentabilidade digital.",
  },
];
