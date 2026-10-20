import { useState, type CSSProperties } from "react";
import {
  Server,
  Snowflake,
  Zap,
  Network,
  ShieldCheck,
  MousePointer2,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Plus,
  Minus,
  FlaskConical,
  Droplets,
  BookOpen,
  Cuboid,
  Leaf,
} from "lucide-react";
import { simulateImpact } from "../utils/simulation";
import "./learning.css";

const systems = [
  {
    id: "servidores",
    title: "Servidores",
    icon: Server,
    color: "var(--resources)",
    tone: "green",
    boundary:
      "443,136 1064,136 1123,475 1131,604 1014,604 1019,671 443,671 451,607 393,564",
    x: 47,
    y: 52,
    purpose: "Onde a informação ganha forma.",
    function:
      "Os racks abrigam servidores e armazenamento. Processadores executam aplicações, enquanto discos e memórias guardam e movimentam dados.",
    impact:
      "A operação usa eletricidade e produz calor. Fabricar e substituir equipamentos também envolve materiais, emissões e resíduos eletrônicos.",
    action:
      "Melhorar a utilização dos equipamentos, prolongar sua vida útil e encaminhar resíduos para tratamento adequado.",
    link: "Energia → processamento → calor",
    question:
      "O equipamento está sendo bem utilizado antes de ampliar a capacidade?",
  },
  {
    id: "refrigeracao",
    title: "Refrigeração",
    icon: Snowflake,
    color: "var(--water)",
    tone: "blue",
    boundary: "195,64 470,75 466,136 443,136 416,449 95,449",
    x: 23,
    y: 33,
    purpose: "O calor precisa ter uma saída.",
    function:
      "Ventiladores, trocadores de calor e circuitos de refrigeração retiram o calor dos equipamentos. O projeto pode usar ar, líquido ou uma combinação de técnicas.",
    impact:
      "Refrigerar exige energia. Alguns sistemas também consomem água por evaporação; outros usam circuitos fechados ou soluções a seco.",
    action:
      "Organizar o fluxo de ar e avaliar o clima local e a disponibilidade de água ao escolher a tecnologia.",
    link: "Calor → resfriamento → ambiente",
    question:
      "A solução reduz energia sem aumentar a pressão sobre a água local?",
  },
  {
    id: "energia",
    title: "Energia",
    icon: Zap,
    color: "var(--energy)",
    tone: "energia",
    boundary:
      "1051,72 1363,72 1470,466 1438,466 1438,475 1123,475 1064,136 1051,136",
    x: 75,
    y: 30,
    purpose: "Continuidade começa na alimentação.",
    function:
      "Transformadores, quadros elétricos e UPS distribuem energia e ajudam a manter a operação. Baterias e geradores podem oferecer suporte em interrupções.",
    impact:
      "Perdas elétricas aumentam a demanda. A origem da eletricidade influencia as emissões; geradores a combustível podem emitir poluentes durante o uso.",
    action:
      "Reduzir perdas, acompanhar o uso da energia e considerar a matriz elétrica e os sistemas de reserva.",
    link: "Rede elétrica → UPS → equipamentos",
    question:
      "Quanto da energia total chega à TI e quanto sustenta os sistemas de apoio?",
  },
  {
    id: "redes",
    title: "Redes",
    icon: Network,
    color: "var(--emissions)",
    tone: "purple",
    boundary: "138,469 205,469 205,481 409,481 393,564 451,607 435,748 69,751",
    x: 17,
    y: 62,
    purpose: "Conexões que tornam os serviços possíveis.",
    function:
      "Fibras, switches e roteadores conectam servidores e ligam o data center a outras redes. Caminhos redundantes ajudam a manter a comunicação.",
    impact:
      "Os equipamentos de rede usam energia e materiais. Sua fabricação e descarte também fazem parte do ciclo de vida da infraestrutura.",
    action:
      "Dimensionar a rede para a necessidade do serviço e planejar manutenção, reutilização e descarte.",
    link: "Internet → rede interna → servidores",
    question:
      "A infraestrutura atende à demanda com equipamentos bem dimensionados?",
  },
  {
    id: "seguranca",
    title: "Segurança",
    icon: ShieldCheck,
    color: "var(--waste)",
    tone: "orange",
    boundary:
      "1123,475 1427,475 1466,668 1329,668 1340,831 1027,831 1014,604 1131,604",
    x: 72,
    y: 73,
    purpose: "Proteger também é cuidar da continuidade.",
    function:
      "Controle de acesso, câmeras e detecção de incidentes protegem pessoas e equipamentos. A segurança da informação também envolve processos e controles digitais.",
    impact:
      "Sistemas de proteção e redundância utilizam equipamentos e energia. Uma avaliação ambiental considera esses apoios, além dos servidores.",
    action:
      "Integrar proteção, manutenção e gestão de recursos sem comprometer a segurança das pessoas.",
    link: "Prevenção → proteção → continuidade",
    question:
      "Como garantir proteção e manutenção ao longo da vida útil da instalação?",
  },
] as const;
const format = (value: number, digits = 1) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(
    value,
  );

export function Learning() {
  const [view, setView] = useState<"structure" | "simulation">("structure");
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [power, setPower] = useState("500");
  const [pue, setPue] = useState("1.5");
  const [hours, setHours] = useState("720");
  const [wue, setWue] = useState("1");
  const [includeWater, setIncludeWater] = useState(true);
  const area = systems[selected];
  const AreaIcon = area.icon;
  const parse = (value: string) => (value.trim() ? Number(value) : NaN);
  const result = simulateImpact({
    powerKw: parse(power),
    pue: parse(pue),
    hours: parse(hours),
    wue: includeWater ? parse(wue) : null,
  });
  function resetScenario() {
    setPower("500");
    setPue("1.5");
    setHours("720");
    setWue("1");
    setIncludeWater(true);
  }
  return (
    <div className="learning-page">
      <header className="learning-hero">
        <div>
          <span className="learning-kicker">
            <span />
            CONHECER PARA CONSCIENTIZAR
          </span>
          <h1>
            Por dentro de um <em>Data Center.</em>
          </h1>
          <p>
            Por trás de cada serviço digital, existe uma estrutura física.
            <br className="learning-desktop-break" /> Explore seus sistemas e
            descubra como energia e água entram nessa história.
          </p>
        </div>
        <span
          className="icon-box green large learning-hero-mark"
          aria-hidden="true"
        >
          <Cuboid size={24} />
        </span>
      </header>
      <div
        className="learning-tabs"
        role="tablist"
        aria-label="Experiências educativas"
      >
        {[
          { id: "structure", label: "Explorar a estrutura", icon: Cuboid },
          { id: "simulation", label: "Simular impacto", icon: FlaskConical },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`learn-tab-${id}`}
            role="tab"
            aria-selected={view === id}
            aria-controls={`learn-panel-${id}`}
            tabIndex={view === id ? 0 : -1}
            onClick={() => setView(id as typeof view)}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "structure"
                    : event.key === "End"
                      ? "simulation"
                      : view === "structure"
                        ? "simulation"
                        : "structure";
                setView(next);
                document.getElementById(`learn-tab-${next}`)?.focus();
              }
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      {view === "structure" ? (
        <section
          role="tabpanel"
          id="learn-panel-structure"
          aria-labelledby="learn-tab-structure"
          className="learning-structure"
        >
          <div className="learning-visual-panel">
            <div className="learning-visual-heading">
              <div>
                <span className="learning-eyebrow">
                  UMA ESTRUTURA, VÁRIOS SISTEMAS
                </span>
                <h2>O digital também é físico.</h2>
              </div>
              <span className="learning-badge">Vista em corte</span>
            </div>
            <div
              className="learning-system-nav"
              aria-label="Áreas do data center"
            >
              {systems.map((system, index) => (
                <button
                  key={system.id}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {system.title}
                </button>
              ))}
            </div>
            <div className="learning-scene-scroll">
              <div
                className="learning-scene"
                style={{ width: `${zoom * 100}%` }}
              >
                <img
                  src={`${import.meta.env.BASE_URL}illustrations/data-center-cutaway.png`}
                  alt="Ilustração realista em corte de um data center: sala de servidores, refrigeração, instalações elétricas, sala de redes e entrada de segurança."
                  width={1536}
                  height={1024}
                />
                <svg
                  className="learning-module-overlay"
                  viewBox="0 0 1536 1024"
                  aria-hidden="true"
                  focusable="false"
                >
                  {systems.map((system, index) => (
                    <polygon
                      key={system.id}
                      points={system.boundary}
                      data-system={system.id}
                      className={`learning-module-area ${selected === index ? "is-selected" : ""}`}
                      style={
                        { "--system-color": system.color } as CSSProperties
                      }
                      vectorEffect="non-scaling-stroke"
                      onClick={() => setSelected(index)}
                    />
                  ))}
                </svg>
                {systems.map((system, index) => (
                  <button
                    key={system.id}
                    className={`learning-hotspot ${selected === index ? "is-selected" : ""}`}
                    style={
                      {
                        left: `${system.x}%`,
                        top: `${system.y}%`,
                        "--system-color": system.color,
                      } as CSSProperties
                    }
                    aria-label={`Explorar ${system.title}`}
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                  >
                    <span className={`icon-box ${system.tone}`}>
                      <system.icon size={18} />
                    </span>
                    <span className="learning-hotspot-label">
                      {system.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="learning-scene-footer">
              <span>
                <MousePointer2 size={14} />
                Selecione os pontos para explorar
              </span>
              <div aria-label="Zoom da ilustração">
                <button
                  aria-label="Reduzir ilustração"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((value) => Math.max(1, value - 0.2))}
                >
                  <Minus size={15} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  aria-label="Ampliar ilustração"
                  disabled={zoom >= 1.6}
                  onClick={() => setZoom((value) => Math.min(1.6, value + 0.2))}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            <p className="learning-caption">
              Ilustração educativa de uma instalação genérica. A organização dos
              sistemas varia entre projetos.
            </p>
          </div>
          <aside
            className="learning-system-detail"
            aria-label="Explicação da área selecionada"
            aria-live="polite"
          >
            <div className="learning-area-number">
              SISTEMA {String(selected + 1).padStart(2, "0")} / 05
            </div>
            <span className={`icon-box large ${area.tone} learning-area-icon`}>
              <AreaIcon size={22} />
            </span>
            <h2>{area.title}</h2>
            <p className="learning-area-intro">{area.purpose}</p>
            <h3>Como funciona</h3>
            <p>{area.function}</p>
            <div className="learning-flow">{area.link}</div>
            <h3>O que observar no ambiente</h3>
            <p>{area.impact}</p>
            <h3>Possibilidades de melhoria</h3>
            <p>{area.action}</p>
            <div className="learning-question">
              <BookOpen size={17} />
              <p>{area.question}</p>
            </div>
            <button
              className="learning-text-action"
              onClick={() => setView("simulation")}
            >
              Experimente um cenário
              <ArrowRight size={16} />
            </button>
          </aside>
          <div className="learning-takeaway">
            <span className="icon-box green">
              <Leaf size={20} />
            </span>
            <div>
              <strong>Eficiência é parte da conversa.</strong>
              <p>
                Um PUE menor não significa, sozinho, menor impacto total. Porte,
                carga de TI, origem da energia, água, localização e ciclo de
                vida também importam.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section
          role="tabpanel"
          id="learn-panel-simulation"
          aria-labelledby="learn-tab-simulation"
          className="learning-simulation"
        >
          <div className="learning-sim-heading">
            <div>
              <span className="learning-eyebrow">
                LABORATÓRIO DE POSSIBILIDADES
              </span>
              <h2>E se a operação fosse assim?</h2>
              <p>
                Altere as hipóteses e acompanhe o resultado no mesmo período.
              </p>
            </div>
            <span className="learning-simulation-badge">
              <FlaskConical size={14} />
              SIMULAÇÃO HIPOTÉTICA
            </span>
          </div>
          <div className="learning-sim-grid">
            <form
              className="learning-sim-controls"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="learning-control-heading">
                <h3>Defina seu cenário</h3>
                <button type="button" onClick={resetScenario}>
                  <RotateCcw size={13} />
                  Restaurar exemplo
                </button>
              </div>
              <SimulationField
                id="sim-power"
                label="Potência média da TI"
                unit="kW"
                value={power}
                onChange={setPower}
                min={0}
                max={10000}
                keyboardStep={10}
                color="var(--energy)"
                description="Carga elétrica média dos equipamentos de TI, não a potência total do edifício."
              />
              <SimulationField
                id="sim-pue"
                label="PUE hipotético"
                unit="índice ≥ 1"
                value={pue}
                onChange={setPue}
                min={1}
                max={3}
                keyboardStep={0.01}
                color="var(--energy)"
                description="Relação entre a energia total da instalação e a energia da TI."
              />
              <SimulationField
                id="sim-hours"
                label="Horas de funcionamento"
                unit="h"
                value={hours}
                onChange={setHours}
                min={0}
                max={8760}
                keyboardStep={1}
                color="hsl(var(--primary))"
                description="Tempo do cenário, com a carga média mantida constante."
              />
              <div className="learning-period-options">
                <button type="button" onClick={() => setHours("24")}>
                  24 horas
                </button>
                <button type="button" onClick={() => setHours("720")}>
                  30 dias
                </button>
                <button type="button" onClick={() => setHours("8760")}>
                  365 dias
                </button>
              </div>
              <label className="learning-water-toggle">
                <input
                  type="checkbox"
                  checked={includeWater}
                  onChange={(event) => setIncludeWater(event.target.checked)}
                />
                <Droplets size={16} />
                Incluir cenário de água
              </label>
              {includeWater && (
                <SimulationField
                  id="sim-wue"
                  label="WUE hipotético"
                  unit="L/kWh de TI"
                  value={wue}
                  onChange={setWue}
                  min={0}
                  max={5}
                  keyboardStep={0.01}
                  color="var(--water)"
                  description="Água utilizada no local por unidade de energia da TI. Adota-se o mesmo período do cenário."
                />
              )}
            </form>
            <div
              className="learning-sim-results"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="learning-eyebrow">
                RESULTADO DO CENÁRIO · NÃO É UMA MEDIÇÃO
              </span>
              {result ? (
                <>
                  <div className="learning-result-primary">
                    <span className="learning-result-label">
                      <span className="icon-box energia">
                        <Zap size={18} />
                      </span>
                      Energia total estimada
                    </span>
                    <strong>
                      {format(result.totalKwh / 1000, 2)} <small>MWh</small>
                    </strong>
                    <p>
                      {format(result.totalKwh, 2)} kWh em{" "}
                      {format(parse(hours), 2)} horas
                    </p>
                  </div>
                  <div
                    className="learning-energy-split"
                    role="img"
                    aria-label={`TI: ${format(result.itKwh)} kWh. Sistemas de apoio: ${format(result.overheadKwh)} kWh.`}
                  >
                    <span
                      style={{
                        width: `${result.totalKwh > 0 ? 100 / parse(pue) : 0}%`,
                      }}
                    />
                    <span
                      style={{
                        width: `${result.totalKwh > 0 ? 100 - 100 / parse(pue) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="learning-result-breakdown">
                    <div>
                      <span>
                        <i />
                        Equipamentos de TI
                      </span>
                      <strong>{format(result.itKwh / 1000, 2)} MWh</strong>
                    </div>
                    <div>
                      <span>
                        <i />
                        Sistemas de apoio
                      </span>
                      <strong>
                        {format(result.overheadKwh / 1000, 2)} MWh
                      </strong>
                    </div>
                  </div>
                  <p className="learning-result-note">
                    Apoio inclui refrigeração, perdas elétricas e outros
                    sistemas. Não representa apenas o resfriamento.
                  </p>
                  {result.waterM3 !== null && (
                    <div className="learning-water-result">
                      <span className="icon-box blue large">
                        <Droplets size={22} />
                      </span>
                      <div>
                        <span>Água estimada no local</span>
                        <strong>
                          {format(result.waterM3, 2)} <small>m³</small>
                        </strong>
                        <p>
                          {format(result.waterLiters!, 2)} litros · WUE aplicado
                          à energia da TI
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="learning-result-disclaimer">
                    <FlaskConical size={17} />
                    <p>
                      Valores criados a partir das suas hipóteses. Não
                      representam medições, previsões ou indicadores dos data
                      centers cadastrados.
                    </p>
                  </div>
                </>
              ) : (
                <p className="learning-validation" role="alert">
                  Preencha os campos com números finitos: potência e horas não
                  negativas, PUE maior ou igual a 1 e WUE não negativo quando
                  habilitado.
                </p>
              )}
            </div>
          </div>
          <details className="learning-formulas" open>
            <summary>Entenda o cálculo e seus limites</summary>
            <div>
              <p>
                <strong>Energia da TI (kWh)</strong> = potência média da TI (kW)
                × horas (h).
              </p>
              <p>
                <strong>Energia total (kWh)</strong> = energia da TI × PUE.
              </p>
              <p>
                <strong>Água no local (L)</strong> = energia da TI (kWh) × WUE
                (L/kWh de TI).
              </p>
              <p>
                1 MWh = 1.000 kWh. 1 m³ = 1.000 L. O modelo mantém carga, PUE e
                WUE constantes. Não inclui a água da geração de eletricidade,
                fabricação de equipamentos ou emissões de carbono. PUE e WUE
                descrevem aspectos diferentes e devem ser interpretados em
                conjunto.
              </p>
            </div>
          </details>
        </section>
      )}
      <footer className="learning-references">
        <BookOpen size={17} />
        <div>
          <strong>Para continuar aprendendo</strong>
          <p>
            Conceitos e referências técnicas para interpretar a experiência.
          </p>
          <div>
            <a
              href="https://www.thegreengrid.org/node/372"
              target="_blank"
              rel="noreferrer"
            >
              The Green Grid · PUE
              <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers"
              target="_blank"
              rel="noreferrer"
            >
              U.S. DOE · Água e WUE
              <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.energy.gov/cmei/femp/articles/best-practices-guide-energy-efficient-data-center-design"
              target="_blank"
              rel="noreferrer"
            >
              U.S. DOE · Sistemas e eficiência
              <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SimulationField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  keyboardStep,
  color,
  description,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  keyboardStep: number;
  color: string;
  description: string;
}) {
  const parsed = value.trim() ? Number(value) : NaN;
  const sliderValue = Number.isFinite(parsed) ? Math.max(min, parsed) : min;
  // Typing a larger value expands the slider; never truncate valid scenarios.
  const sliderMax = Math.max(max, sliderValue);
  const progress = ((sliderValue - min) / (sliderMax - min)) * 100;
  return (
    <div
      className="learning-field"
      style={
        {
          "--slider-color": color,
          "--slider-progress": `${progress}%`,
        } as CSSProperties
      }
    >
      <label htmlFor={id}>
        <span>{label}</span>
        <small>{unit}</small>
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step="any"
        required
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className="learning-range"
        type="range"
        min={min}
        max={sliderMax}
        step="any"
        value={sliderValue}
        aria-label={`Ajustar ${label.toLocaleLowerCase("pt-BR")}`}
        aria-describedby={`${id}-hint`}
        aria-valuetext={`${format(sliderValue, 3)} ${unit}`}
        onChange={(event) =>
          onChange(String(Number(Number(event.target.value).toFixed(3))))
        }
        onKeyDown={(event) => {
          const direction = ["ArrowRight", "ArrowUp"].includes(event.key)
            ? 1
            : ["ArrowLeft", "ArrowDown"].includes(event.key)
              ? -1
              : 0;
          if (direction) {
            event.preventDefault();
            onChange(
              String(
                Number(
                  Math.min(
                    sliderMax,
                    Math.max(min, sliderValue + direction * keyboardStep),
                  ).toFixed(3),
                ),
              ),
            );
          }
        }}
      />
      <div className="learning-range-scale" aria-hidden="true">
        <span>
          {format(min)} {unit}
        </span>
        <span>
          {format(sliderMax)} {unit}
        </span>
      </div>
      <small id={`${id}-hint`}>{description}</small>
    </div>
  );
}
