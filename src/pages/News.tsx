import { useState } from "react";
import { Newspaper, RefreshCw, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "../components/common";
import { NewsCard } from "../components/news/NewsCard";
import { useNewsQuery } from "../queries/news";
import { errorMessage } from "../services/http/errors";
import { normalize } from "../utils/data";
import type { Connection } from "../types/api";
import "./news.css";

export function News({ connection }: { connection: Connection }) {
  const query = useNewsQuery(connection);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const articles = [...(query.data ?? [])].sort(
    (a, b) =>
      (Date.parse(b.dataPublicacao) || 0) - (Date.parse(a.dataPublicacao) || 0),
  );
  const categories = [
    ...new Set(articles.map((article) => article.categoria).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtered = articles.filter(
    (article) =>
      (!category || article.categoria === category) &&
      normalize(
        `${article.titulo ?? ""} ${article.descricao ?? ""} ${article.fonte ?? ""}`,
      ).includes(normalize(search.trim())),
  );
  const visible = filtered.slice(0, visibleCount);
  return (
    <section className="news-page" aria-label="Feed de notícias">
      <header className="news-header">
        <div>
          <span className="eyebrow">
            <Newspaper size={15} /> NO RADAR DA INFRAESTRUTURA DIGITAL
          </span>
          <h1>
            Notícias & perspectivas<span>.</span>
          </h1>
          <p>
            As novidades que conectam tecnologia, infraestrutura e
            sustentabilidade.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw
            size={15}
            className={query.isFetching ? "news-spinning" : ""}
          />{" "}
          Atualizar feed
        </Button>
      </header>
      <div className="news-toolbar">
        <div className="filter-search">
          <Search size={17} />
          <Input
            aria-label="Pesquisar notícias"
            placeholder="Busque por assunto, título ou fonte..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(10);
            }}
          />
        </div>
        <span className="news-count" role="status">
          {filtered.length} {filtered.length === 1 ? "notícia" : "notícias"}
        </span>
      </div>
      {!!categories.length && (
        <div
          className="news-categories"
          role="group"
          aria-label="Filtrar notícias por categoria"
        >
          {["", ...categories].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setVisibleCount(10);
              }}
            >
              {value || "Todas as notícias"}
            </button>
          ))}
        </div>
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError && !query.data ? (
        <ErrorState
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : (
        <>
          {query.isError && (
            <p role="alert" className="news-refresh-error">
              Não foi possível atualizar o feed. Exibindo as últimas notícias
              carregadas.
            </p>
          )}
          {!filtered.length ? (
            <EmptyState
              title={
                articles.length
                  ? "Nenhuma notícia encontrada"
                  : "Novas histórias chegam em breve"
              }
              description={
                articles.length
                  ? "Experimente outro termo ou selecione uma categoria diferente."
                  : "As notícias aparecerão aqui assim que estiverem disponíveis."
              }
            />
          ) : (
            <>
              <div className="news-feed">
                {visible.map((article, index) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    featured={index === 0 && !category && !search.trim()}
                  />
                ))}
              </div>
              {filtered.length > visibleCount && (
                <div className="news-load-more">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((count) => count + 9)}
                  >
                    Carregar mais notícias
                  </Button>
                  <small>
                    Exibindo {visible.length} de {filtered.length}
                  </small>
                </div>
              )}
            </>
          )}
        </>
      )}
      <p className="news-source-note">
        Cada notícia leva à publicação original. Os conteúdos são de
        responsabilidade de suas respectivas fontes.
      </p>
    </section>
  );
}
