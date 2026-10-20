import { categoryOf } from "../utils/data";
export const indicatorColors = {
  energia: "var(--energy)",
  agua: "var(--water)",
  emissoes: "var(--emissions)",
  residuos: "var(--waste)",
  recursos: "var(--resources)",
  outros: "hsl(var(--muted-foreground))",
};
export const indicatorColor = (type: string) =>
  indicatorColors[categoryOf(type) as keyof typeof indicatorColors];
