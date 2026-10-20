import * as TabsPrimitive from "@radix-ui/react-tabs";
export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange}>
      <TabsPrimitive.List
        className="tab-list"
        aria-label="Categoria de indicador"
      >
        {items.map((i) => (
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value={i.value}
            key={i.value}
          >
            {i.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
