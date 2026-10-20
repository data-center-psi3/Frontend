import { Flame, MapPin } from "lucide-react";
import "./map-mode-toggle.css";

export function MapModeToggle({
  mode,
  onChange,
}: {
  mode: "locations" | "radar";
  onChange: (mode: "locations" | "radar") => void;
}) {
  return (
    <div className="map-mode-toggle" role="group" aria-label="Modo do mapa">
      <button
        type="button"
        className="map-mode-option"
        aria-pressed={mode === "locations"}
        aria-label={
          mode === "locations"
            ? "Mapa de localizações ativo"
            : "Voltar ao mapa de localizações"
        }
        title="Mapa inicial · Localizações"
        onClick={() => {
          if (mode !== "locations") onChange("locations");
        }}
      >
        <MapPin size={18} />
      </button>
      <button
        type="button"
        className="map-mode-option"
        aria-pressed={mode === "radar"}
        aria-label={
          mode === "radar"
            ? "Radar de concentração ativo"
            : "Abrir mapa de calor"
        }
        title="Mapa de calor · Radar de concentração"
        onClick={() => {
          if (mode !== "radar") onChange("radar");
        }}
      >
        <Flame size={18} />
      </button>
    </div>
  );
}
