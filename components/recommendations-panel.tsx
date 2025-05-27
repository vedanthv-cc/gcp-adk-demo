"use client";

import { ProductRecommendation } from "./product-recommendation";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface RecommendationsPanelProps {
  title: string;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
}

export function RecommendationsPanel({
  title,
  products,
  onSelectProduct,
}: RecommendationsPanelProps) {
  if (products.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-white text-center mb-3">{title}</h3>
      <div className="space-y-2">
        {products.map((product) => (
          <ProductRecommendation
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </div>
  );
}
