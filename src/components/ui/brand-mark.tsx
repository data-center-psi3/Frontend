export function BrandMark({
  className = "",
  size = 42,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      className={`dataterra-symbol ${className}`}
      src={`${import.meta.env.BASE_URL}brand/dataterra-symbol.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
