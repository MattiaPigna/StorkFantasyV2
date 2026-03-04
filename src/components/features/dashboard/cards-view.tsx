"use client";

import { useEffect, useState } from "react";
import { CreditCard, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getSpecialCards } from "@/lib/db/settings";
import type { SpecialCard } from "@/types";
import Image from "next/image";

export function CardsView() {
  const [cards, setCards] = useState<SpecialCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSpecialCards().then(setCards).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-4 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-stork-orange" />
        <h1 className="text-2xl font-bold">Card Speciali</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-stork-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessuna card speciale disponibile</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="overflow-hidden hover:border-stork-orange/30 transition-all hover:-translate-y-0.5">
              {card.image_url && (
                <div className="aspect-[3/2] relative bg-muted overflow-hidden">
                  <Image
                    src={card.image_url}
                    alt={card.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-stork-orange shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    {card.effect && (
                      <p className="text-xs text-stork-orange mt-2 font-medium">Effetto: {card.effect}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
