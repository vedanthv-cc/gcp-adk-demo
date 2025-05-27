"use client";

import { ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface ProductRecommendationProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export function ProductRecommendation({
  product,
  onSelect,
}: ProductRecommendationProps) {
  return (
    <div
      className="bg-white rounded-xl p-3 mb-3 flex items-center cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect?.(product)}
    >
      <div className="w-16 h-16 mr-3 flex-shrink-0">
        <img
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover rounded-md"
        />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-800">{product.name}</h4>
        <p className="text-sm font-bold text-gray-900">
          ${product.price.toFixed(2)}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-400" />
    </div>
  );
}
