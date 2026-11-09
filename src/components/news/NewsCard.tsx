import { useState } from "react";
import { ArrowUpRight, CalendarDays, Newspaper } from "lucide-react";
import type { News } from "../../types/news";
import { safeUrl } from "../../utils/data";

export function NewsCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`news-card news-card-skeleton ${featured ? "news-card-featured" : ""}`}
      aria-hidden="true"
    >
      <div className="news-card-image skeleton" />
      <div className="news-card-body">
        <div className="news-card-meta">
          <span className="skeleton w-2/5 h-4" />
          <span className="skeleton w-1/4 h-4" />
        </div>
        <h2>
          <span className="skeleton news-skeleton-line" />
          <span className="skeleton news-skeleton-line w-4/5" />
        </h2>
        <div className="news-card-description">
          <span className="skeleton news-skeleton-line" />
          <span className="skeleton news-skeleton-line" />
          <span className="skeleton news-skeleton-line w-3/5" />
        </div>
        <div className="news-card-footer">
          <span className="skeleton w-2/5 h-3" />
          <span className="skeleton w-1/4 h-3" />
        </div>
      </div>
    </div>
  );
}

export function NewsCard({
  article,
  featured = false,
}: {
  article: News;
  featured?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  const image = safeUrl(article.imagemUrl);
  const link = safeUrl(article.url);
  const published = article.dataPublicacao
    ? new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(article.dataPublicacao)
          ? `${article.dataPublicacao}T12:00:00`
          : article.dataPublicacao,
      )
    : null;
  const validDate = published && !Number.isNaN(published.getTime());
  return (
    <article className={`news-card ${featured ? "news-card-featured" : ""}`}>
      <div className="news-card-image">
        {image && failedImage !== image ? (
          <img
            src={image}
            alt=""
            loading={featured ? "eager" : "lazy"}
            onError={() => setFailedImage(image)}
          />
        ) : (
          <div className="news-image-placeholder">
            <Newspaper size={48} strokeWidth={1} />
            <span>DataTerra · Notícias</span>
          </div>
        )}
        {featured && <span className="news-featured-label">Em destaque</span>}
      </div>
      <div className="news-card-body">
        <div className="news-card-meta">
          <span className="news-category">
            {article.categoria || "Atualidades"}
          </span>
          <span>{article.fonte || "Fonte não informada"}</span>
        </div>
        <h2>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer">
              {article.titulo || "Notícia sem título"}
            </a>
          ) : (
            article.titulo || "Notícia sem título"
          )}
        </h2>
        {article.descricao && (
          <p className="news-card-description">{article.descricao}</p>
        )}
        <div className="news-card-footer">
          <span className="news-date">
            <CalendarDays size={14} />
            {validDate ? (
              <time dateTime={published.toISOString()}>
                {published.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </time>
            ) : (
              "Data não informada"
            )}
          </span>
          {link && (
            <a
              className="news-read-link"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ler matéria: ${article.titulo} (abre em nova aba)`}
            >
              Ler matéria <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
