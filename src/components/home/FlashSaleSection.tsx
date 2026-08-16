import { memo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, ChevronRight, Timer } from "lucide-react";
import { ProductCard, type Product } from "@/components/products/ProductCard";

interface FlashSaleSectionProps {
  products: Product[];
}

function FlashSaleSectionComponent({ products }: FlashSaleSectionProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 23,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          return { hours: 5, minutes: 23, seconds: 45 };
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => num.toString().padStart(2, "0");

  if (products.length === 0) return null;

  return (
    <section className="py-3 sm:py-5 overflow-hidden">
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm app-fade-in">
        {/* Header - Mobile optimized, app-like */}
        <div className="bg-gradient-to-r from-sale via-red-500 to-orange-500 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left - Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-white fill-white animate-pulse-soft" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-1.5">
                  Flash Sale
                  <span className="text-[8px] sm:text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-bold">HOT</span>
                </h2>
                <p className="text-white/80 text-[10px] sm:text-xs hidden xs:block">Limited time offers!</p>
              </div>
            </div>
            
            {/* Right - Timer */}
            <div className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5 text-white/80 hidden xs:block shrink-0" />
              <div className="flex items-center gap-0.5 sm:gap-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow">
                  <span className="text-sale font-bold text-sm sm:text-lg">{formatTime(timeLeft.hours)}</span>
                </div>
                <span className="text-white font-bold text-sm sm:text-lg">:</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow">
                  <span className="text-sale font-bold text-sm sm:text-lg">{formatTime(timeLeft.minutes)}</span>
                </div>
                <span className="text-white font-bold text-sm sm:text-lg">:</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow">
                  <span className="text-sale font-bold text-sm sm:text-lg">{formatTime(timeLeft.seconds)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="p-2.5 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2.5 flex items-center justify-between bg-muted/30">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            <span className="text-sale font-bold">{products.length}</span> items on sale
          </p>
          <Link 
            to="/flash-sale" 
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-bold text-[11px] sm:text-xs touch-manipulation press-scale"
          >
            View All
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export const FlashSaleSection = memo(FlashSaleSectionComponent);
