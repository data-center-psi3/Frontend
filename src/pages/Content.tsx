import { useEffect, useState } from "react";
import {
  Cloud,
  Cpu,
  Database,
  GraduationCap,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { BrandMark } from "../components/ui/brand-mark";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { FilterSelect } from "../components/ui/filter-select";
import {
  Panel,
  EmptyState,
  SourceCard,
  SourceReference,
} from "../components/common";
import { normalize, displayValue } from "../utils/data";
import type { ViewProps } from "./Dashboard";
export function Benefits({ data, centers }: ViewProps) {
  const [type, setType] = useState("");
  const records = data.benefits.filter((b) =>
    centers.some((c) => c.id === b.dataCenterId),
  );
  const filtered = records.filter((b) => !type || b.tipo === type);
  const icons = [Cloud, Cpu, Database];
  return (
    <>
      <div className="education-hero">
        <div>
          <span className="eyebrow">TECNOLOGIA QUE CONECTA</span>
          <h2>A infraestrutura por trás da vida digital.</h2>
          <p>
            Serviços digitais dependem de infraestrutura física. Conhecer seus
            benefícios e seus impactos ajuda a construir uma visão equilibrada.
          </p>
        </div>
        <Cloud size={84} strokeWidth={1} />
      </div>
      <div className="inline-filters">
        <FilterSelect
          label="Categoria de benefício"
          value={type}
          onChange={setType}
          options={[...new Set(records.map((b) => b.tipo))].map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>
      <div className="content-grid">
        {filtered.map((b, i) => {
          const Icon = icons[i % icons.length];
          return (
            <Card key={b.id} className="benefit-card">
              <div className="icon-box green large">
                <Icon size={25} />
              </div>
              <h3>{displayValue(b.tipo)}</h3>
              <p>{displayValue(b.descricao)}</p>
              <small>
                {displayValue(
                  centers.find((c) => c.id === b.dataCenterId)?.nome,
                )}
              </small>
              <SourceReference
                source={data.sources.find((s) => s.id === b.fonteId)}
              />
            </Card>
          );
        })}
      </div>
      {!filtered.length && (
        <EmptyState
          title="Benefícios ainda não cadastrados"
          description="A carga do CSV não cria benefícios automaticamente. Esta seção apresenta somente registros disponíveis na API."
        />
      )}
      <div className="educational-note">
        Benefícios tecnológicos e econômicos não anulam impactos ambientais. Os
        dados devem ser interpretados em conjunto, com atenção às fontes e ao
        contexto local.
      </div>
    </>
  );
}
export function Sources({ data }: ViewProps) {
  const [visibleCount, setVisibleCount] = useState(24);
  const [search, setSearch] = useState("");
  const [institution, setInstitution] = useState("");
  const sources = data.sources.filter(
    (s) =>
      (!institution || s.instituicao === institution) &&
      normalize(
        `${displayValue(s.instituicao)} ${displayValue(s.titulo)}`,
      ).includes(normalize(search)),
  );
  useEffect(() => {
    setVisibleCount(24);
  }, [search, institution]);
  return (
    <>
      <div className="source-filters">
        <div className="filter-search">
          <Search size={17} />
          <Input
            aria-label="Pesquisar fontes"
            placeholder="Pesquisar instituição ou publicação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterSelect
          label="Instituição"
          value={institution}
          onChange={setInstitution}
          options={[...new Set(data.sources.map((s) => s.instituicao))]
            .sort()
            .map((value) => ({ value, label: value }))}
        />
      </div>
      <div className="section-heading">
        <span className="scope-badge">
          {sources.length} referências encontradas
        </span>
        <span className="text-xs text-muted-foreground">
          Exibindo {Math.min(visibleCount, sources.length)} de {sources.length}
        </span>
      </div>
      <div className="content-grid">
        {sources.slice(0, visibleCount).map((s) => (
          <SourceCard
            key={s.id}
            source={s}
            count={data.indicators.filter((i) => i.fonteId === s.id).length}
          />
        ))}
      </div>
      {visibleCount < sources.length && (
        <Button
          variant="outline"
          className="show-more"
          onClick={() => setVisibleCount((v) => v + 24)}
        >
          Mostrar mais referências
        </Button>
      )}
      {!sources.length && <EmptyState title="Nenhuma fonte encontrada" />}
      <Panel
        title="Como interpretar os dados"
        subtitle="Transparência em cada etapa da análise"
      >
        <div className="method-grid">
          <div>
            <ShieldCheck size={23} />
            <h3>Rastreabilidade</h3>
            <p>
              Cada registro pode indicar a publicação de origem. Referências
              ausentes são identificadas e não substituídas por fontes
              fictícias.
            </p>
          </div>
          <div>
            <Scale size={23} />
            <h3>Comparabilidade</h3>
            <p>
              Unidade, período, porte e método precisam ser compatíveis. A
              interface separa unidades e períodos em gráficos distintos.
            </p>
          </div>
          <div>
            <Database size={23} />
            <h3>Limitações</h3>
            <p>
              Dados institucionais e históricos não são medições em tempo real.
              Informações declaradas podem exigir validação independente.
            </p>
          </div>
        </div>
      </Panel>
    </>
  );
}
export function About({ data }: ViewProps) {
  return (
    <>
      <div className="education-hero about-hero">
        <div>
          <span className="eyebrow">IFSP · CAMPUS HORTOLÂNDIA</span>
          <h2>
            Entre a tecnologia
            <br />e a sustentabilidade.
          </h2>
          <p>Os desafios ambientais na implantação de data centers.</p>
        </div>
        <div className="about-symbol">
          <BrandMark size={104} />
        </div>
      </div>
      <div className="two-columns">
        <Panel title="Uma iniciativa acadêmica">
          <p className="prose-text">
            Este projeto do Instituto Federal de São Paulo — Campus Hortolândia
            propõe uma plataforma educativa para explorar os impactos ambientais
            e os benefícios da infraestrutura de data centers. É voltado a
            estudantes, professores, pesquisadores e pessoas interessadas em
            sustentabilidade digital.
          </p>
          <h3 className="prose-title">Objetivo geral</h3>
          <p className="prose-text">
            Facilitar a compreensão dos desafios ambientais associados à
            implantação de data centers por meio de informações acessíveis,
            referências e visualizações interativas.
          </p>
        </Panel>
        <Panel title="O que buscamos tornar acessível">
          <div className="objective-list">
            {[
              "Consultar registros de energia, água, emissões, resíduos e recursos naturais.",
              "Explorar a localização das instalações e seu contexto regional.",
              "Comparar indicadores com unidades e períodos compatíveis.",
              "Apresentar benefícios tecnológicos, sociais e econômicos.",
              "Permitir a consulta à origem das informações.",
            ].map((t, i) => (
              <div key={t}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel
        title="Por que sustentabilidade digital?"
        action={<GraduationCap size={22} />}
      >
        <p className="prose-text">
          A ampliação dos serviços digitais depende de instalações físicas que
          demandam energia, água, equipamentos e território. Tornar essa relação
          visível contribui para o debate sobre infraestrutura e
          sustentabilidade, sem reduzir questões complexas a uma única medida.
        </p>
      </Panel>
      <Panel title="Metodologia e limites">
        <p className="prose-text">
          A plataforma organiza registros disponibilizados pelo backend e suas
          referências institucionais, acadêmicas ou históricas. Mostra dados
          ausentes de forma explícita, mantém observações qualitativas e evita
          interpretar potência como consumo. Não apresenta resultados
          científicos próprios nem monitora instalações em tempo real. A
          disponibilidade e a validade das conclusões dependem da cobertura, do
          período e da qualidade de cada fonte.
        </p>
      </Panel>
      {data.research.length > 0 && (
        <Panel title="Conteúdos de pesquisa cadastrados">
          <div className="research-list">
            {data.research.map((r) => (
              <article key={r.id}>
                <span className="eyebrow">{displayValue(r.categoria)}</span>
                <h3>{displayValue(r.titulo)}</h3>
                <p className="prose-text">{displayValue(r.conteudo)}</p>
                <SourceReference
                  source={data.sources.find((s) => s.id === r.fonteId)}
                />
              </article>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
