"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "cn";

// Tab (shadcn, base-ui). Dipakai seperti:
//
//   <Tabs defaultValue="a">
//     <TabsList>
//       <TabsTrigger value="a">Satu</TabsTrigger>
//       <TabsTrigger value="b">Dua</TabsTrigger>
//     </TabsList>
//     <TabsContent value="a">...</TabsContent>
//     <TabsContent value="b">...</TabsContent>
//   </Tabs>
//
// Tab aktif ditandai warna brand (selaras dengan kapsul filter di halaman lain).

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex w-full items-center gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-active:border-brand data-active:text-brand [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex flex-col gap-3 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
