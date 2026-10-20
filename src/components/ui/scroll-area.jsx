import * as React from "react";
import { cn } from "../../lib/utils";

function ScrollArea({ className, children }) {
  return <div className={cn("overflow-auto", className)}>{children}</div>;
}

export { ScrollArea };
